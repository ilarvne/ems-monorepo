#!/bin/sh
set -e
echo "Writing schema to SpiceDB at $ZED_ENDPOINT..."
# Use TLS with --no-verify-ca since Azure Container Apps uses internal certificates
zed schema write /schema.zed --endpoint "$ZED_ENDPOINT" --token "$ZED_TOKEN" --no-verify-ca
echo "Schema written successfully!"
