import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { EventTypes, TestResult } from "../types/types";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { eventFulfilledSchema } from "../schemas/responseSchema";
import { getTestData, saveTestCaseResult } from "../utils/dbUtils";

// Initialize Ajv validator
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validateEvent = ajv.compile(eventFulfilledSchema);

const TEST_CASE_13_NAME = "Test Case 13: Respond to Asynchronous PCF Request";
const MANDATORY_VERSIONS = ["V2.2", "V2.3"];

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Log the entire event for debugging
    console.log("Received event:", JSON.stringify(event, null, 2));

    // Parse and log the request body
    if (event.body) {
      const body = JSON.parse(event.body);
      console.log("Request body:", JSON.stringify(body, null, 2));

      /* We only care about the fulfilled event in response to TESTCASE#12 for this part as Test Case 13 is basically a follow-up
         that processes the call back from a host system in response to the event fired in test case 12 */
      if (body.type === EventTypes.FULFILLED) {
        const testData = await getTestData(body.data.requestEventId);

        if (!testData) {
          console.error(
            `Test data not found for requestEventId: ${body.data.requestEventId}`
          );
          return {
            statusCode: 400,
            body: JSON.stringify({
              code: "BadRequest",
              message: "Bad Request",
            }),
          };
        }

        const isMandatory = MANDATORY_VERSIONS.includes(testData.version);

        let testResult: TestResult;

        // Validate the event body against our schema
        const isValid = validateEvent(body);

        if (isValid) {
          testResult = {
            name: TEST_CASE_13_NAME,
            status: "SUCCESS",
            success: true,
            mandatory: isMandatory,
            testKey: "TESTCASE#13",
          };
        } else {
          testResult = {
            name: TEST_CASE_13_NAME,
            status: "FAILURE",
            success: false,
            mandatory: isMandatory,
            testKey: "TESTCASE#13",
            errorMessage: `Event validation failed: ${JSON.stringify(
              validateEvent.errors
            )}`,
          };
        }

        const productIds = body.data.pfs.flatMap(
          (pf: { productIds: string[] }) => pf.productIds
        );
        const testPassed = testData.productIds.some((id: string) =>
          productIds.includes(id)
        );

        if (!testPassed) {
          testResult = {
            ...testResult,
            status: "FAILURE",
            success: false,
            errorMessage: `Product IDs do not match, the request was made for productIds [${testData.productIds}] but received data for productIds [${productIds}]`,
          };
        }

        await saveTestCaseResult(body.data.requestEventId, testResult, true);
      }
    } else {
      console.error("No request body received");
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Length": 0,
      },
      body: "",
    };
  } catch (error) {
    console.error("Error processing request:", error);

    return {
      statusCode: 400,
      headers: {
        "Content-Length": 0,
      },
      body: JSON.stringify({
        code: "BadRequest",
        message: "Bad Request",
      }),
    };
  }
};
