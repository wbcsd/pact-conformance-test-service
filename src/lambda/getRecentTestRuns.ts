import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as AWS from "aws-sdk";
import { SK_TYPES } from "../utils/dbUtils";

const docClient = new AWS.DynamoDB.DocumentClient();

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
    const params = {
      TableName: tableName,
      FilterExpression: "adminEmail = :adminEmail AND SK = :sk",
      ExpressionAttributeValues: {
        ":adminEmail": adminEmail,
        ":sk": SK_TYPES.DETAILS,
      },
    };

    const result = await docClient.scan(params).promise();

    // Return the test runs with basic formatting
    const testRuns = result.Items || [];

    // Sort by timestamp (most recent first)
    testRuns.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        count: testRuns.length,
        testRuns: testRuns,
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
