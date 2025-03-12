import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getTestResults } from "../utils/dbUtils";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
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

    const result = await getTestResults(testRunId);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(result),
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
