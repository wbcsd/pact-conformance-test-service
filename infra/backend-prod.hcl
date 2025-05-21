bucket         = "api-test-service-terraform-state-bucket"
key            = "envs/prod/terraform.tfstate"
region         = "eu-north-1"
dynamodb_table = "terraform-lock-table"
encrypt        = true
