resource "aws_dynamodb_table" "run_test_cases_table" {
  name         = "TestRunTable"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "test_id"

  attribute {
    name = "test_id"
    type = "S"
  }
}
