import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { TestResult } from "../types/types";

// Initialize DynamoDB clients
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Constants
const EVENT_TYPE_FULFILLED =
  "org.wbcsd.pathfinder.ProductFootprintRequest.Fulfilled.v1";
const TEST_CASE_13_NAME = "Test Case 13: Respond to Asynchronous PCF Request";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Log the entire event for debugging
    console.log("Received event:", JSON.stringify(event, null, 2));

    // Get the DynamoDB table name from environment variables
    const tableName = process.env.DYNAMODB_TABLE_NAME;
    if (!tableName) {
      throw new Error("DYNAMODB_TABLE_NAME environment variable is not set");
    }

    // Parse and log the request body
    if (event.body) {
      const body = JSON.parse(event.body);
      console.log("Request body:", JSON.stringify(body, null, 2));

      /* We only care about TESTCASE#12 for this part as Test Case 13 is basically a follow-up
         that processes the call back from a host system in response to the event fired in test case 12 */
      if (event.queryStringParameters?.testCaseName === "TESTCASE#12") {
        let testResult: TestResult;

        // Check if the event type matches the expected value
        if (body.type === EVENT_TYPE_FULFILLED) {
          testResult = {
            name: TEST_CASE_13_NAME,
            status: "SUCCESS",
            success: true,
            mandatory: false,
            testKey: "TESTCASE#13",
          };
        } else {
          testResult = {
            name: TEST_CASE_13_NAME,
            status: "FAILURE",
            success: false,
            mandatory: false,
            testKey: "TESTCASE#13",
            errorMessage: `Expected event type '${EVENT_TYPE_FULFILLED}' but received '${
              body.type || "undefined"
            }'`,
          };
        }

        // Save the test result to DynamoDB
        await docClient.send(
          new PutCommand({
            TableName: tableName,
            Item: {
              testId: event.queryStringParameters?.testRunId,
              SK: testResult.testKey,
              timestamp: new Date().toISOString(),
              result: testResult,
            },
          })
        );
      }
    } else {
      console.log("No request body received");
    }

    // Return a 200 success response with empty body
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    };
  } catch (error) {
    console.error("Error processing request:", error);

    // Even on error, return 200 as per requirements
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    };
  }
};
