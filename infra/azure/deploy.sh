#!/bin/bash
# ==============================================================================
# EMS Azure Infrastructure Deployment Script
# ==============================================================================
# This script deploys all required Azure resources for the EMS application
# and configures GitHub Actions secrets for CI/CD.
#
# Prerequisites:
#   - Azure CLI installed and logged in (az login)
#   - GitHub CLI installed and logged in (gh auth login)
#   - Permissions to create Azure resources and GitHub secrets
#
# Usage:
#   ./deploy.sh [environment] [location]
#
# Examples:
#   ./deploy.sh dev eastus
#   ./deploy.sh prod westus2
# ==============================================================================

set -euo pipefail

# Configuration
ENVIRONMENT="${1:-dev}"
LOCATION="${2:-eastus}"
BASE_NAME="ems"
RESOURCE_GROUP="${BASE_NAME}-${ENVIRONMENT}-rg"
GITHUB_REPO="${GITHUB_REPOSITORY:-$(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null || echo '')}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! az account show &> /dev/null; then
        log_error "Not logged in to Azure. Please run 'az login' first."
        exit 1
    fi
    
    if ! command -v gh &> /dev/null; then
        log_warn "GitHub CLI not installed. Skipping GitHub secrets configuration."
        SKIP_GITHUB=true
    elif ! gh auth status &> /dev/null; then
        log_warn "Not logged in to GitHub CLI. Skipping GitHub secrets configuration."
        SKIP_GITHUB=true
    else
        SKIP_GITHUB=false
    fi
}

# Create resource group
create_resource_group() {
    log_info "Creating resource group: $RESOURCE_GROUP in $LOCATION..."
    az group create \
        --name "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --output none
}

# Generate a secure password
generate_password() {
    # Generate a 24-character password with letters, numbers, and special chars
    openssl rand -base64 32 | tr -dc 'A-Za-z0-9!@#$%' | head -c 24
}

# Deploy Bicep template
deploy_infrastructure() {
    log_info "Deploying Azure infrastructure..."
    
    POSTGRES_PASSWORD=$(generate_password)
    
    DEPLOYMENT_OUTPUT=$(az deployment group create \
        --resource-group "$RESOURCE_GROUP" \
        --template-file "$(dirname "$0")/main.bicep" \
        --parameters \
            environment="$ENVIRONMENT" \
            baseName="$BASE_NAME" \
            location="$LOCATION" \
            postgresAdminPassword="$POSTGRES_PASSWORD" \
        --query 'properties.outputs' \
        --output json)
    
    # Extract outputs
    ACR_LOGIN_SERVER=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.acrLoginServer.value')
    ACR_NAME=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.acrName.value')
    CONTAINER_APP_ENV=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.containerAppEnvName.value')
    BACKEND_URL=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.backendUrl.value')
    FRONTEND_URL=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.frontendUrl.value')
    POSTGRES_FQDN=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.postgresServerFqdn.value')
    
    log_info "Infrastructure deployed successfully!"
    echo ""
    echo "=========================================="
    echo "Deployment Outputs:"
    echo "=========================================="
    echo "ACR Login Server: $ACR_LOGIN_SERVER"
    echo "ACR Name: $ACR_NAME"
    echo "Container App Environment: $CONTAINER_APP_ENV"
    echo "Backend URL: $BACKEND_URL"
    echo "Frontend URL: $FRONTEND_URL"
    echo "PostgreSQL FQDN: $POSTGRES_FQDN"
    echo "=========================================="
}

# Create Service Principal for GitHub Actions
create_service_principal() {
    log_info "Creating Service Principal for GitHub Actions..."
    
    SUBSCRIPTION_ID=$(az account show --query 'id' -o tsv)
    SP_NAME="ems-${ENVIRONMENT}-github-actions"
    
    # Create service principal with Contributor role on the resource group
    SP_OUTPUT=$(az ad sp create-for-rbac \
        --name "$SP_NAME" \
        --role Contributor \
        --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" \
        --sdk-auth \
        --output json)
    
    CLIENT_ID=$(echo "$SP_OUTPUT" | jq -r '.clientId')
    CLIENT_SECRET=$(echo "$SP_OUTPUT" | jq -r '.clientSecret')
    TENANT_ID=$(echo "$SP_OUTPUT" | jq -r '.tenantId')
    
    # Grant ACR push/pull permissions
    ACR_ID=$(az acr show --name "$ACR_NAME" --query 'id' -o tsv)
    az role assignment create \
        --assignee "$CLIENT_ID" \
        --role AcrPush \
        --scope "$ACR_ID" \
        --output none
    
    log_info "Service Principal created: $SP_NAME"
}

# Configure GitHub secrets
configure_github_secrets() {
    if [ "$SKIP_GITHUB" = true ]; then
        log_warn "Skipping GitHub secrets configuration."
        echo ""
        echo "Please manually add these secrets to your GitHub repository:"
        echo "  AZURE_CLIENT_ID: $CLIENT_ID"
        echo "  AZURE_CLIENT_SECRET: $CLIENT_SECRET"
        echo "  AZURE_TENANT_ID: $TENANT_ID"
        echo "  AZURE_SUBSCRIPTION_ID: $SUBSCRIPTION_ID"
        echo "  AZURE_REGISTRY_URL: $ACR_LOGIN_SERVER"
        echo "  AZURE_REGISTRY_NAME: $ACR_NAME"
        echo "  AZURE_RESOURCE_GROUP: $RESOURCE_GROUP"
        echo "  AZURE_CONTAINER_APP_ENV: $CONTAINER_APP_ENV"
        return
    fi
    
    if [ -z "$GITHUB_REPO" ]; then
        log_warn "Could not determine GitHub repository. Please set GITHUB_REPOSITORY or run from within a git repo."
        return
    fi
    
    log_info "Configuring GitHub secrets for $GITHUB_REPO..."
    
    gh secret set AZURE_CLIENT_ID --body "$CLIENT_ID" --repo "$GITHUB_REPO"
    gh secret set AZURE_CLIENT_SECRET --body "$CLIENT_SECRET" --repo "$GITHUB_REPO"
    gh secret set AZURE_TENANT_ID --body "$TENANT_ID" --repo "$GITHUB_REPO"
    gh secret set AZURE_SUBSCRIPTION_ID --body "$SUBSCRIPTION_ID" --repo "$GITHUB_REPO"
    gh secret set AZURE_REGISTRY_URL --body "$ACR_LOGIN_SERVER" --repo "$GITHUB_REPO"
    gh secret set AZURE_REGISTRY_NAME --body "$ACR_NAME" --repo "$GITHUB_REPO"
    gh secret set AZURE_RESOURCE_GROUP --body "$RESOURCE_GROUP" --repo "$GITHUB_REPO"
    gh secret set AZURE_CONTAINER_APP_ENV --body "$CONTAINER_APP_ENV" --repo "$GITHUB_REPO"
    
    log_info "GitHub secrets configured successfully!"
}

# Build and push initial images
build_and_push_images() {
    log_info "Building and pushing initial Docker images..."
    
    # Login to ACR
    az acr login --name "$ACR_NAME"
    
    # Build and push backend
    log_info "Building backend image..."
    docker build -t "$ACR_LOGIN_SERVER/backend:latest" -f apps/backend/Dockerfile .
    docker push "$ACR_LOGIN_SERVER/backend:latest"
    
    # Build and push frontend
    log_info "Building frontend image..."
    docker build -t "$ACR_LOGIN_SERVER/events-admin:latest" -f apps/events-admin/Dockerfile .
    docker push "$ACR_LOGIN_SERVER/events-admin:latest"
    
    log_info "Images pushed successfully!"
}

# Main execution
main() {
    echo "=========================================="
    echo "EMS Azure Infrastructure Deployment"
    echo "=========================================="
    echo "Environment: $ENVIRONMENT"
    echo "Location: $LOCATION"
    echo "Resource Group: $RESOURCE_GROUP"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    create_resource_group
    deploy_infrastructure
    create_service_principal
    configure_github_secrets
    
    echo ""
    log_info "Deployment complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Push code to main branch to trigger CI/CD"
    echo "  2. Or manually run: gh workflow run 'Build & Push to ACR'"
    echo "  3. Access your app at:"
    echo "     - Backend: $BACKEND_URL"
    echo "     - Frontend: $FRONTEND_URL"
}

main "$@"
