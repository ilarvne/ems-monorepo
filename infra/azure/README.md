# Azure Infrastructure for EMS

This directory contains Infrastructure-as-Code (IaC) for deploying EMS to Azure Container Apps.

## Architecture

The deployment creates:

- **Azure Container Registry (ACR)** - Stores Docker images
- **Log Analytics Workspace** - Centralized logging
- **Container App Environment** - Managed Kubernetes environment
- **Container Apps** - Backend (Go) and Frontend (React/Vite)
- **PostgreSQL Flexible Server** - Database

## Prerequisites

1. **Azure CLI** installed and logged in:
   ```bash
   az login
   ```

2. **GitHub CLI** installed and authenticated (for secrets setup):
   ```bash
   gh auth login
   ```

3. **Docker** installed (for building images locally)

## Quick Start

### Deploy Infrastructure

```bash
# Deploy to dev environment in East US
cd infra/azure
./deploy.sh dev eastus

# Or deploy to production in West US 2
./deploy.sh prod westus2
```

The script will:
1. Create a resource group (`ems-{env}-rg`)
2. Deploy all Azure resources via Bicep
3. Create a Service Principal for GitHub Actions
4. Configure GitHub repository secrets automatically

### Manual Deployment

If you prefer to deploy manually:

```bash
# Set variables
ENVIRONMENT=dev
LOCATION=eastus
RESOURCE_GROUP=ems-${ENVIRONMENT}-rg

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Deploy infrastructure
az deployment group create \
  --resource-group $RESOURCE_GROUP \
  --template-file main.bicep \
  --parameters environment=$ENVIRONMENT \
               baseName=ems \
               postgresAdminPassword='YourSecurePassword123!'
```

## GitHub Secrets Required

The deploy workflow requires these secrets:

| Secret | Description |
|--------|-------------|
| `AZURE_CLIENT_ID` | Service Principal client ID |
| `AZURE_CLIENT_SECRET` | Service Principal secret |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
| `AZURE_REGISTRY_URL` | ACR login server (e.g., `emsdevacr.azurecr.io`) |
| `AZURE_REGISTRY_NAME` | ACR name (e.g., `emsdevacr`) |
| `AZURE_RESOURCE_GROUP` | Resource group name (e.g., `ems-dev-rg`) |
| `AZURE_CONTAINER_APP_ENV` | Container App Environment name |

The `deploy.sh` script configures these automatically.

## Resource Naming

Resources follow this naming convention:
- ACR: `{baseName}{env}acr` (e.g., `emsdevacr`)
- Environment: `{baseName}{env}-env` (e.g., `emsdev-env`)
- PostgreSQL: `{baseName}{env}-postgres` (e.g., `emsdev-postgres`)
- Backend App: `ems-backend`
- Frontend App: `ems-frontend`

## Costs

Estimated monthly costs (dev environment):
- Container Apps: ~$0 (scale to zero when idle)
- ACR Basic: ~$5/month
- PostgreSQL Burstable B1ms: ~$12/month
- Log Analytics: Pay per GB ingested

## Cleanup

To delete all resources:

```bash
az group delete --name ems-dev-rg --yes --no-wait
```

## Troubleshooting

### Container App Environment not found

If deployment fails with "environment does not exist":
1. Ensure the Bicep deployment completed successfully
2. Verify the `AZURE_CONTAINER_APP_ENV` secret matches the deployed environment name
3. Check the deployment output for the correct environment name

### ACR authentication issues

If image push fails:
1. Ensure the Service Principal has `AcrPush` role on the ACR
2. Try logging in manually: `az acr login --name <acr-name>`

### Database connection issues

1. Verify PostgreSQL firewall allows Azure services
2. Check connection string format in Container App secrets
3. Ensure SSL is enabled (`sslmode=require`)
