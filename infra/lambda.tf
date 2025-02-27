resource "aws_lambda_function" "run_test_cases" {
  function_name    = "${var.environment}_runTestCases"
  role             = aws_iam_role.lambda_exec_role.arn
  handler          = "dist/index.runTestCasesHandler"
  runtime          = "nodejs22.x"
  filename         = "../lambdas.zip"
  timeout          = 30
  source_code_hash = filebase64sha256("../lambdas.zip")

  environment {
    variables = {
      DYNAMODB_TABLE_NAME = aws_dynamodb_table.run_test_cases_table.name
    }
  }
}

resource "aws_lambda_permission" "apigw_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.run_test_cases.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "run_test_cases_invoke" {
  statement_id  = "AllowAPIGatewayInvokeRunTestCases"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.run_test_cases.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/POST/runTestCases"
}
