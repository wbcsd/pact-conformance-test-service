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

resource "aws_apigatewayv2_stage" "default_stage" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
}
