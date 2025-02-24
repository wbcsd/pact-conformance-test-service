import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDB } from "aws-sdk";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import {
  getCorrectAuthHeaders,
  getIncorrectAuthHeaders,
} from "../utils/authUtils";
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
      // TODO: seems like these integration tests don't need to be reported (check cli version)
      // delete testRun.testCases[TestCaseNames.AUTHENTICATE_WITH_INCORRECT_CREDENTIALS];
      console.log(`Test [Authenticate with incorrect credentials] passed.`);
    }

    // OAuth 2.0 Clinet Credential Grant

    interface TestRunConfig {
      userName: string;
      password: string;
      userAgent?: string;
    }

    const testRunConfig: TestRunConfig = JSON.parse(event.body || "{}");

    const { userName, password, userAgent } = testRunConfig;

    let authHeaders = getCorrectAuthHeaders(host, userName, password);

    const response = await fetch(authContextPath + authPath, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        grant_type: "client_credentials",
      }),
    });

    if (response.status != 200) {
      console.log(
        `Authentication failed. STATUS: ${response.status} URL: ${
          authContextPath + authPath
        }`
      );

      // TODO  revisit this early return, also implement error in the FE to notify user
      return {
        statusCode: 200,
        body: JSON.stringify({
          message:
            "Function One executed successfully, but with errors. Check logs.",
          testId: testRun.testId,
        }),
      };
    }
    const jsonAuthResponse = (await response.json()) as {
      access_token: string;
    };
    const accessToken = jsonAuthResponse.access_token;
    if (accessToken == null) {
      console.log(`Access token is empty. URL: ${authContextPath + authPath}`);

      // TODO  revisit this early return, also implement error in the FE to notify user
      return {
        statusCode: 200,
        body: JSON.stringify({
          message:
            "Function One executed successfully, but with errors. Check logs.",
          testId: testRun.testId,
        }),
      };
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
        message: "Failed to finish test run.",
        error: error instanceof Error ? error.message : error,
      }),
    };
  }
};
