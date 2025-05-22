resource "aws_iam_role" "lambda_exec_role" {
  name = "${var.environment}_lambda_exec_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# resource "aws_iam_policy_attachment" "lambda_exec_policy_attach" {
#   name       = "${var.environment}_lambda_exec_policy_attachment"
#   roles      = [aws_iam_role.lambda_exec_role.name]
#   policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
# }

resource "aws_iam_policy" "dynamodb_policy" {
  name        = "${var.environment}_lambda_dynamodb_policy"
  description = "IAM policy to allow Lambda functions to access the DynamoDB table for runTestCases"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ],
        Resource = aws_dynamodb_table.run_test_cases_table.arn
      }
    ]
  })
}

resource "aws_iam_policy_attachment" "dynamodb_policy_attachment" {
  name       = "${var.environment}_lambda_dynamodb_policy_attachment"
  roles      = [aws_iam_role.lambda_exec_role.name]
  policy_arn = aws_iam_policy.dynamodb_policy.arn
}

## We need this one instead of just attaching the AWSLambdaBasicExecutionRole policy so we can
## attach the policy to both dev and prod roles dynamically as we manage them on the same account
resource "aws_iam_policy" "lambda_basic_execution_policy" {
  name        = "${var.environment}_lambda_basic_execution_policy"
  description = "Custom policy that clones AWSLambdaBasicExecutionRole permissions for Lambda basic execution"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_policy_attachment" "lambda_basic_execution_policy_attachment" {
  name       = "${var.environment}_lambda_basic_execution_policy_attachment"
  roles      = [aws_iam_role.lambda_exec_role.name]
  policy_arn = aws_iam_policy.lambda_basic_execution_policy.arn
}
