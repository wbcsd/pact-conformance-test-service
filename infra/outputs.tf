output "api_endpoint" {
  description = "The URL of the deployed HTTP API"
  value       = aws_apigatewayv2_api.http_api.api_endpoint
}
