import { TestResult } from "../types/types";
import * as AWS from "aws-sdk";

const docClient = new AWS.DynamoDB.DocumentClient();

export const SK_TYPES = {
  DETAILS: "TESTRUN#DETAILS",
  TEST_DATA: "TESTRUN#TESTDATA",
};

interface TestRunDetails {
  testRunId: string;
  companyName: string;
  companyIdentifier: string;
  adminEmail: string;
  adminFullName: string;
  techSpecVersion: string;
}

export const saveTestRun = async ({
  testRunId,
  companyName,
  companyIdentifier,
  adminEmail,
  adminFullName,
  techSpecVersion,
}: TestRunDetails): Promise<void> => {
  const tableName = process.env.DYNAMODB_TABLE_NAME;

  if (!tableName) {
    throw new Error("DYNAMODB_TABLE_NAME environment variable is not defined");
  }

  const timestamp = new Date().toISOString();

  const params = {
    TableName: tableName,
    Item: {
      testId: testRunId,
      SK: SK_TYPES.DETAILS,
      timestamp: timestamp,
      companyName,
      companyIdentifier,
      adminEmail,
      adminFullName,
      techSpecVersion,
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
  testResult: TestResult,
  overWriteExisting: boolean
): Promise<void> => {
  const tableName = process.env.DYNAMODB_TABLE_NAME;

  if (!tableName) {
    throw new Error("DYNAMODB_TABLE_NAME environment variable is not defined");
  }

  const timestamp = new Date().toISOString();

  const params: AWS.DynamoDB.DocumentClient.PutItemInput = {
    TableName: tableName,
    Item: {
      testId: testRunId,
      SK: testResult.testKey,
      timestamp: timestamp,
      result: testResult,
    },
  };

  if (!overWriteExisting) {
    params.ConditionExpression =
      "attribute_not_exists(testId) AND attribute_not_exists(SK)";
  }

  try {
    await docClient.put(params).promise();
  } catch (error) {
    console.error(`Error saving test case: ${testResult.name}`, error);
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
      await saveTestCaseResult(testRunId, testResult, false);
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

export const getTestResults = async (testRunId: string) => {
  const tableName = process.env.DYNAMODB_TABLE_NAME;

  if (!tableName) {
    throw new Error("DYNAMODB_TABLE_NAME environment variable is not defined");
  }

  const params = {
    TableName: tableName,
    KeyConditionExpression: "testId = :testId",
    ExpressionAttributeValues: {
      ":testId": testRunId,
    },
  };

  const result = await docClient.query(params).promise();

  if (!result.Items) {
    return {
      testRunId,
      results: [],
    };
  }

  const testResults: TestResult[] = result.Items.filter(
    (item) => item.SK !== SK_TYPES.DETAILS && item.SK !== SK_TYPES.TEST_DATA
  ).map((item) => item.result);

  const testDetails = result.Items.find((item) => item.SK === SK_TYPES.DETAILS);

  return {
    testRunId,
    timestamp: testDetails?.timestamp,
    results: testResults,
  };
};

export const saveTestData = async (
  testRunId: string,
  testData: Record<string, unknown>
): Promise<void> => {
  const tableName = process.env.DYNAMODB_TABLE_NAME;

  if (!tableName) {
    throw new Error("DYNAMODB_TABLE_NAME environment variable is not defined");
  }

  const timestamp = new Date().toISOString();

  const params = {
    TableName: tableName,
    Item: {
      testId: testRunId,
      SK: SK_TYPES.TEST_DATA,
      timestamp: timestamp,
      data: testData,
    },
  };

  try {
    await docClient.put(params).promise();
    console.log(`Test data saved successfully`);
  } catch (error) {
    console.error("Error saving test data:", error);
    throw error;
  }
};

export const getTestData = async (testRunId: string) => {
  const tableName = process.env.DYNAMODB_TABLE_NAME;

  if (!tableName) {
    throw new Error("DYNAMODB_TABLE_NAME environment variable is not defined");
  }

  const params = {
    TableName: tableName,
    Key: {
      testId: testRunId,
      SK: SK_TYPES.TEST_DATA,
    },
  };

  const result = await docClient.get(params).promise();

  if (!result.Item) {
    return {};
  }

  return result.Item.data;
};
