import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as AWS from "aws-sdk";
import { SK_TYPES, getTestResults } from "../utils/dbUtils";
import { TestRunStatus } from "../types/types";

const docClient = new AWS.DynamoDB.DocumentClient();
const MAX_TEST_RUNS_TO_ENRICH = 10;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const adminEmail = event.queryStringParameters?.adminEmail;

    if (!adminEmail) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Missing required query parameter: adminEmail",
        }),
      };
    }

    const tableName = process.env.DYNAMODB_TABLE_NAME;

    if (!tableName) {
      throw new Error(
        "DYNAMODB_TABLE_NAME environment variable is not defined"
      );
    }

    // Scan parameters to get all records with the specified adminEmail
    // and SK = TESTRUN#DETAILS
    const params: AWS.DynamoDB.DocumentClient.ScanInput = {
      TableName: tableName,
      FilterExpression: "adminEmail = :adminEmail AND SK = :sk",
      ExpressionAttributeValues: {
        ":adminEmail": adminEmail,
        ":sk": SK_TYPES.DETAILS,
      },
    };

    let testRuns: AWS.DynamoDB.DocumentClient.ItemList = [];
    let lastEvaluatedKey;

    // Use pagination to scan DynamoDB to retrieve all items
    do {
      // Add LastEvaluatedKey to params if available from last scan
      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }

      const result = await docClient.scan(params).promise();

      // Add items from this scan to our collection
      if (result.Items && result.Items.length > 0) {
        testRuns = [...testRuns, ...result.Items];
      }

      // Get the LastEvaluatedKey for next scan if available
      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    // Sort by timestamp (most recent first)
    testRuns.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Get only the top 10 most recent test runs to enrich
    const topTestRuns = testRuns.slice(0, MAX_TEST_RUNS_TO_ENRICH);

    // Enrich the top test runs with status information
    const enrichedTestRuns = await Promise.all(
      topTestRuns.map(async (testRun) => {
        // Get test results for this test run
        const testResults = await getTestResults(testRun.testId);

        // Calculate status based on mandatory tests
        let status = TestRunStatus.PASS;

        // If there are mandatory tests and any of them failed, mark as FAIL
        const mandatoryTests = testResults.results.filter(
          (result) => result.mandatory
        );
        if (mandatoryTests.length > 0) {
          const failedMandatoryTests = mandatoryTests.filter(
            (result) => !result.success
          );
          if (failedMandatoryTests.length > 0) {
            status = TestRunStatus.FAIL;
          }
        }

        return {
          ...testRun,
          status,
        };
      })
    );

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        totalCount: testRuns.length,
        returnedCount: enrichedTestRuns.length,
        testRuns: enrichedTestRuns,
      }),
    };
  } catch (error) {
    console.error("Error retrieving test runs:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Internal server error",
        error:
          process.env.NODE_ENV === "development" ? String(error) : undefined,
      }),
    };
  }
};
