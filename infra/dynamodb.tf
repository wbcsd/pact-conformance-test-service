resource "aws_dynamodb_table" "run_test_cases_table" {
  name         = "${var.environment}_TestRunTable"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "testId"
  range_key    = "SK"

  attribute {
    name = "testId"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S" # String type
  }
}
