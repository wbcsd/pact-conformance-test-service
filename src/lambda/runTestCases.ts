import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDB } from "aws-sdk";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { getIncorrectAuthHeaders } from "../utils/authUtils";
import { getDefaultTestRun } from "../utils/getDefaultTestRun";
import { TestCaseNames } from "../types/types";

const dynamoDb = new DynamoDB.DocumentClient();
const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);
const tableName = process.env.DYNAMODB_TABLE_NAME || "TestTable";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Function One received event:", event);

  const testRun = getDefaultTestRun();

  const createTestRunParams = {
    TableName: tableName,
    Item: testRun,
  };

  try {
    await dynamoDb.put(createTestRunParams).promise();
    console.log("Record created successfully with testId:", testRun.testId);

    // Start test cases run
    const authContextPath = "";

    const oidDiscoveryResponse = await fetch(
      `${authContextPath}/.well-known/openid-configuration`
    );

    let authPath = "/auth/token";

    if (
      oidDiscoveryResponse.status == 200 &&
      oidDiscoveryResponse.body != null
    ) {
      const responseJson = await oidDiscoveryResponse.json();
      authPath = responseJson.token_endpoint;
    }

    const host = new URL(authContextPath + authPath).hostname;

    // Attempt to authenticate with incorrect credentials
    console.log(
      `Test [Authenticate with incorrect credentials][TestId: ${testRun.testId}] started.`
    );
    let incorrectAuthHeaders = getIncorrectAuthHeaders(host);

    let incorrectRequestBody = {
      grant_type: "client_credentials",
    };

    const incorrectAuthResponse = await fetch(authContextPath + authPath, {
      method: "POST",
      headers: incorrectAuthHeaders,
      body: JSON.stringify(incorrectRequestBody),
    });

    if (incorrectAuthResponse.status === 200) {
      console.error(
        `Test [Authenticate with incorrect credentials] failed. Expected status code: 401, Actual status code: ${incorrectAuthResponse.status}`
      );

      const updateTestRunParams = {
        TableName: tableName,
        Item: {
          ...testRun,
          testCases: [
            ...testRun.testCases.filter(
              (t) =>
                t.name !== TestCaseNames.AUTHENTICATE_WITH_INCORRECT_CREDENTIALS
            ),
            {
              name: TestCaseNames.AUTHENTICATE_WITH_INCORRECT_CREDENTIALS,
              status: "FAILED",
              message: `Success response was obtained despite incorrect credentials. URL: ${
                authContextPath + authPath
              }`,
            },
          ],
        },
      };

      // TODO try using dynamoDb.put instead of docClient.send
      await docClient.send(new PutCommand(updateTestRunParams));
    } else {
      console.log(`Test [Authenticate with incorrect credentials] passed.`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Function One executed successfully!",
        testId: testRun.testId,
      }),
    };
  } catch (error: unknown) {
    console.error("Error creating record:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to create record",
        error: error instanceof Error ? error.message : error,
      }),
    };
  }
};
