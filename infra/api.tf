resource "aws_apigatewayv2_api" "http_api" {
  name          = "${var.environment}_TestConformanceServiceApi"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "run_test_cases_integration" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.run_test_cases.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "run_test_cases_route" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "POST /runTestCases"
  target    = "integrations/${aws_apigatewayv2_integration.run_test_cases_integration.id}"
}

# Integration for asyncRequestListener Lambda
resource "aws_apigatewayv2_integration" "async_request_listener_integration" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.async_request_listener.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Route for asyncRequestListener Lambda
resource "aws_apigatewayv2_route" "async_request_listener_route" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "POST /2/events"
  target    = "integrations/${aws_apigatewayv2_integration.async_request_listener_integration.id}"
}

# GET /getTestResults route
resource "aws_apigatewayv2_route" "get_test_results" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "GET /getTestResults"
  target    = "integrations/${aws_apigatewayv2_integration.get_test_results_integration.id}"
}

# Integration for getTestResults Lambda
resource "aws_apigatewayv2_integration" "get_test_results_integration" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.get_test_results.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Integration for getRecentTestRuns Lambda
resource "aws_apigatewayv2_integration" "get_recent_test_runs_integration" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.get_recent_test_runs.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Route for getRecentTestRuns Lambda
resource "aws_apigatewayv2_route" "get_recent_test_runs_route" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "GET /getRecentTestRuns"
  target    = "integrations/${aws_apigatewayv2_integration.get_recent_test_runs_integration.id}"
}

# Integration for authForAsyncListener Lambda
resource "aws_apigatewayv2_integration" "auth_for_async_listener_integration" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.auth_for_async_listener.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Route for authForAsyncListener Lambda (POST /auth/token)
resource "aws_apigatewayv2_route" "auth_for_async_listener_route" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "POST /auth/token"
  target    = "integrations/${aws_apigatewayv2_integration.auth_for_async_listener_integration.id}"
}

resource "aws_apigatewayv2_stage" "default_stage" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gw.arn
    format          = "$context.identity.sourceIp - - [$context.requestTime] \"$context.httpMethod $context.routeKey $context.protocol\" $context.status $context.responseLength $context.requestId $context.error.message"
  }
}

resource "aws_cloudwatch_log_group" "api_gw" {
  name              = "/aws/api_gw/${aws_apigatewayv2_api.http_api.name}"
  retention_in_days = 30
}
