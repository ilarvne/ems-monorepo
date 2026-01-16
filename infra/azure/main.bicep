// ==============================================================================
// EMS Monorepo - Azure Container Apps Infrastructure
// ==============================================================================
// This Bicep template creates all required Azure resources for the EMS application:
// - Azure Container Registry (ACR)
// - Log Analytics Workspace
// - Container App Environment
// - Container Apps (Backend + Frontend)
// - PostgreSQL Flexible Server
// ==============================================================================

@description('The location for all resources')
param location string = resourceGroup().location

@description('Environment name (dev, staging, prod)')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'dev'

@description('Base name for resources')
param baseName string = 'ems'

@description('PostgreSQL administrator login')
param postgresAdminLogin string = 'emsadmin'

@description('PostgreSQL administrator password')
@secure()
param postgresAdminPassword string

// ==============================================================================
// Variables
// ==============================================================================

var resourcePrefix = '${baseName}${environment}'
var acrName = '${resourcePrefix}acr'
var logAnalyticsName = '${resourcePrefix}-logs'
var containerAppEnvName = '${resourcePrefix}-env'
var postgresServerName = '${resourcePrefix}-postgres'

// ==============================================================================
// Log Analytics Workspace
// ==============================================================================

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// ==============================================================================
// Azure Container Registry
// ==============================================================================

resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

// ==============================================================================
// Container App Environment
// ==============================================================================

resource containerAppEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: containerAppEnvName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// ==============================================================================
// PostgreSQL Flexible Server
// ==============================================================================

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: postgresServerName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: postgresAdminLogin
    administratorLoginPassword: postgresAdminPassword
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

// Allow Azure services to access PostgreSQL
resource postgresFirewall 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-12-01-preview' = {
  parent: postgresServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Create the EMS database
resource emsDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  parent: postgresServer
  name: 'ems'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// ==============================================================================
// Backend Container App
// ==============================================================================

resource backendApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ems-backend'
  location: location
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
        transport: 'http'
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
          allowedHeaders: ['*']
        }
      }
      registries: [
        {
          server: acr.properties.loginServer
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: acr.listCredentials().passwords[0].value
        }
        {
          name: 'database-url'
          value: 'postgres://${postgresAdminLogin}:${postgresAdminPassword}@${postgresServer.properties.fullyQualifiedDomainName}:5432/ems?sslmode=require'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'backend'
          image: '${acr.properties.loginServer}/backend:latest'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
            {
              name: 'PORT'
              value: '8080'
            }
            {
              name: 'ENV'
              value: environment
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 3
        rules: [
          {
            name: 'http-scale'
            http: {
              metadata: {
                concurrentRequests: '100'
              }
            }
          }
        ]
      }
    }
  }
}

// ==============================================================================
// Frontend Container App
// ==============================================================================

resource frontendApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ems-frontend'
  location: location
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
      }
      registries: [
        {
          server: acr.properties.loginServer
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: acr.listCredentials().passwords[0].value
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'frontend'
          image: '${acr.properties.loginServer}/events-admin:latest'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'VITE_API_URL'
              value: 'https://${backendApp.properties.configuration.ingress.fqdn}'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 3
        rules: [
          {
            name: 'http-scale'
            http: {
              metadata: {
                concurrentRequests: '100'
              }
            }
          }
        ]
      }
    }
  }
}

// ==============================================================================
// Outputs
// ==============================================================================

@description('Azure Container Registry login server')
output acrLoginServer string = acr.properties.loginServer

@description('Azure Container Registry name')
output acrName string = acr.name

@description('Container App Environment name')
output containerAppEnvName string = containerAppEnv.name

@description('Container App Environment ID')
output containerAppEnvId string = containerAppEnv.id

@description('Backend URL')
output backendUrl string = 'https://${backendApp.properties.configuration.ingress.fqdn}'

@description('Frontend URL')
output frontendUrl string = 'https://${frontendApp.properties.configuration.ingress.fqdn}'

@description('PostgreSQL server FQDN')
output postgresServerFqdn string = postgresServer.properties.fullyQualifiedDomainName

@description('Resource Group name')
output resourceGroupName string = resourceGroup().name
