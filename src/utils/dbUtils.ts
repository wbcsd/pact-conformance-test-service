import test from "node:test";
import { TestResult } from "../types/types";

// TODO save company info, get it from arguments
export const saveTestRun = async (testRunId: string): Promise<void> => {
  const AWS = require("aws-sdk");
  const docClient = new AWS.DynamoDB.DocumentClient();

  const tableName = process.env.DYNAMODB_TABLE_NAME;

  if (!tableName) {
    throw new Error("DYNAMODB_TABLE_NAME environment variable is not defined");
  }

  const timestamp = new Date().toISOString();

  const params = {
    TableName: tableName,
    Item: {
      testId: testRunId,
      SK: "TESTRUN#DETAILS",
      timestamp: timestamp,
    },
  };

  try {
    await docClient.put(params).promise();
    console.log(`Test run ${testRunId} saved successfully`);
  } catch (error) {
    console.error("Error saving test run:", error);
    throw error;
  }
};

export const saveTestCaseResult = async (
  testRunId: string,
  testResult: TestResult
): Promise<void> => {
  const AWS = require("aws-sdk");
  const docClient = new AWS.DynamoDB.DocumentClient();

  const tableName = process.env.DYNAMODB_TABLE_NAME;

  if (!tableName) {
    throw new Error("DYNAMODB_TABLE_NAME environment variable is not defined");
  }

  const timestamp = new Date().toISOString();

  const params = {
    TableName: tableName,
    Item: {
      testId: testRunId,
      SK: testResult.testKey,
      timestamp: timestamp,
      result: testResult,
    },
    ConditionExpression:
      "attribute_not_exists(testId) AND attribute_not_exists(SK)",
  };

  try {
    await docClient.put(params).promise();
    console.log(`Test case ${testResult.name} saved successfully`);
  } catch (error) {
    console.error("Error saving test case:", error);
    throw error;
  }
};

export const saveTestCaseResults = async (
  testRunId: string,
  testResults: TestResult[]
): Promise<void> => {
  console.log(`Saving ${testResults.length} test cases...`);

  // Process test results sequentially
  for (const testResult of testResults) {
    try {
      await saveTestCaseResult(testRunId, testResult);
    } catch (error: any) {
      console.error(`Failed to save test case ${testResult.name}:`, error);

      if (error.name === "ConditionalCheckFailedException") {
        console.debug("Item already exists, no action taken.");
      } else {
        throw error;
      }
    }
  }

  console.log(`All ${testResults.length} test cases saved successfully`);
};
