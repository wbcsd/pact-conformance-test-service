#!/bin/bash
set -e  # Exit immediately if a command exits with a non-zero status

# Remove previous build artifacts
rm -rf dist
rm -f lambdas.zip

# Compile TypeScript code
npx tsc

# Zip the required directories
zip -r -q lambdas.zip dist node_modules

# Switch to the infra directory
cd infra

# Initialize Terraform
terraform init -backend-config=backend-dev.hcl -reconfigure

# Apply Terraform changes
terraform apply -var-file=dev.tfvars
