variable "region" {
  description = "The AWS region where resources will be deployed"
  type        = string
  default     = "eu-north-1"
}

variable "environment" {
  description = "The environment where the resources will be deployed"
  type        = string
  default     = "dev"
}
