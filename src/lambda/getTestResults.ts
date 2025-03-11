import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as AWS from "aws-sdk";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Get testRunId from query string parameters
    const testRunId = event.queryStringParameters?.testRunId;

    if (!testRunId) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Missing required query parameter: testRunId",
        }),
      };
    }

    const tableName = process.env.DYNAMODB_TABLE_NAME;
    if (!tableName) {
      throw new Error(
        "DYNAMODB_TABLE_NAME environment variable is not defined"
      );
    }

    // Initialize DynamoDB client
    const docClient = new AWS.DynamoDB.DocumentClient();

    // Query parameters to get all items with the specified testId
    const params = {
      TableName: tableName,
      KeyConditionExpression: "testId = :testId",
      ExpressionAttributeValues: {
        ":testId": testRunId,
      },
    };

    // Query DynamoDB
    const result = await docClient.query(params).promise();

    console.log(result.Items);

    // Return the results
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        testRunId,
        itemCount: result.Items?.length || 0,
        items: result.Items,
      }),
    };
  } catch (error) {
    console.error("Error retrieving test results:", error);

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
