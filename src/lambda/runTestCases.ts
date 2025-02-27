import Ajv from "ajv";
import addFormats from "ajv-formats";
import { TestCase, TestResult } from "../types/types";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  responseSchema,
  simpleResponseSchema,
  simpleSingleFootprintResponseSchema,
} from "../schemas/responseSchema";
import {
  getCorrectAuthHeaders,
  getIncorrectAuthHeaders,
} from "../utils/authUtils";

interface TokenResponse {
  token: string;
}

/**
 * Retrieves an access token from the authentication endpoint.
 */
async function getAccessToken(
  baseUrl: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const url = `${baseUrl}/auth/token`;

  const encodedCredentials = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${encodedCredentials}`,
    },
    body: JSON.stringify({}), // Include additional data if required by the endpoint
  });

  if (!response.ok) {
    throw new Error(
      `Failed to obtain access token. Status: ${response.status}`
    );
  }

  const data: TokenResponse = await response.json();
  if (!data.token) {
    throw new Error("Access token not present in response");
  }
  return data.token;
}

/**
 * Runs an individual test case against the API.
 * Validates both the HTTP status and the JSON response against a provided schema.
 */
async function runTestCase(
  baseUrl: string,
  testCase: TestCase,
  accessToken: string
): Promise<TestResult> {
  const url = `${baseUrl}${testCase.endpoint}`;
  const options: RequestInit = {
    method: testCase.method,
    headers: {
      "Content-Type": "application/json", // TODO confirm this header in the spec
      Authorization: `Bearer ${accessToken}`,
    },
  };

  if (testCase.requestData) {
    options.body = JSON.stringify(testCase.requestData);
  }

  if (testCase.headers) {
    options.headers = {
      ...options.headers,
      ...testCase.headers,
    };
  }

  try {
    const response = await fetch(url, options);

    if (response.status !== testCase.expectedStatusCode) {
      return {
        name: testCase.name,
        success: false,
        error: `Expected status ${testCase.expectedStatusCode}, but got ${response.status}`,
      };
    }

    // Parse the response as JSON.
    const responseData = await response.json();

    console.log(`Test response data from ${url}`, responseData);

    // Validate the response JSON using AJV if a schema is provided.
    if (testCase.schema) {
      const ajv = new Ajv();
      addFormats(ajv);
      const validate = ajv.compile(testCase.schema);
      const valid = validate(responseData);
      if (!valid) {
        console.log("Schema validation failed:", validate.errors);
        return {
          name: testCase.name,
          success: false,
          error: `Schema validation failed: ${JSON.stringify(validate.errors)}`,
        };
      }
    }

    console.log("Schema validation passed");

    // Run condition if provided
    if (typeof testCase.condition === "function") {
      const conditionPassed = testCase.condition(responseData);
      if (!conditionPassed) {
        return {
          name: testCase.name,
          success: false,
          error: testCase.conditionErrorMessage,
        };
      }
    }

    return { name: testCase.name, success: true };
  } catch (error: any) {
    return {
      name: testCase.name,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Lambda handler that runs the test scenarios.
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Lambda test runner started");

  const { baseUrl }: { baseUrl: string } = JSON.parse(event.body || "{}");

  // TODO some prep to get the auth url from the .well-known endpoint

  try {
    const clientId = "YOUR_CLIENT_ID"; // TODO get from event body
    const clientSecret = "YOUR_CLIENT_SECRET"; // get from event body

    const accessToken = await getAccessToken(baseUrl, clientId, clientSecret);
    console.log("Obtained access token successfully");

    // Get all footprints from baseUrl + /2/footprints using a fetch request
    const footprints = await fetchFootprints(baseUrl, accessToken);

    // Define your test cases.
    // TODO when the test cases are optional, returning 400 not implemented is also an option. Confirm with the team
    // TODO confirm if in the case of limit and filtering for < 2.3 the endpoint should return 400 or 200 without filtering and limit
    // TODO Add api response to error message
    const testCases: TestCase[] = [
      {
        name: "Test Case 1: Authentication with invalid credentials",
        method: "POST",
        endpoint: "/auth/token",
        expectedStatusCode: 400,
        headers: getIncorrectAuthHeaders(baseUrl),
      },
      {
        name: "Test Case 2: Authentication with valid credentials",
        method: "POST",
        endpoint: "/auth/token",
        expectedStatusCode: 200,
        headers: getCorrectAuthHeaders(baseUrl, clientId, clientSecret),
      },
      {
        name: "Test Case 3: Retrieval of all footprints",
        method: "GET",
        endpoint: "/2/footprints",
        expectedStatusCode: 200,
        schema: simpleResponseSchema,
        condition: ({ data }) => {
          return data.length === footprints.data.length;
        },
        conditionErrorMessage: "Number of footprints does not match",
      },
      {
        name: "Test Case 4: Date filtering for footprints",
        method: "GET",
        endpoint: `/2/footprints?$filter=${encodeURIComponent(
          `created ge ${footprints.data[0].created}`
        )}`,
        expectedStatusCode: 200,
        schema: simpleResponseSchema,
        condition: ({ data }) => {
          return data.every(
            (footprint: { created: Date }) =>
              footprint.created >= footprints.data[0].created
          );
        },
        conditionErrorMessage: `One or more footprints do not match the condition created date >= ${footprints.data[0].created}`,
      },
      {
        name: "Test Case 5: Product filtering for footprints",
        method: "GET",
        endpoint: `/2/footprints?$filter=${encodeURIComponent(
          `productIds/any(productId:(productId eq '${footprints.data[0].productIds[0]}'))`
        )}`,
        expectedStatusCode: 200,
        schema: simpleResponseSchema,
        condition: ({ data }) => {
          return data.every((footprint: { productIds: string[] }) =>
            footprint.productIds.includes(footprints.data[0].productIds[0])
          );
        },
        conditionErrorMessage: `One or more footprints do not match the condition productIds any of ${footprints.data[0].productIds[0]}`,
      },
      {
        name: "Test Case 6: Footprint acquisition limitations",
        method: "GET",
        endpoint: `/2/footprints?limit=1`,
        expectedStatusCode: 200,
        schema: simpleResponseSchema,
        condition: ({ data }) => {
          return data.length === 1;
        },
        conditionErrorMessage: `Returned more footprints than the limit of 1`,
      },
      {
        name: "Test Case 7: Retrieve the specific footprint",
        method: "GET",
        endpoint: `/2/footprints/${footprints.data[0].id}`,
        expectedStatusCode: 200,
        schema: simpleSingleFootprintResponseSchema,
        condition: ({ data }) => {
          return data.id === footprints.data[0].id;
        },
        conditionErrorMessage: `Returned footprint does not match the requested footprint with id ${footprints.data[0].id}`,
      },
      {
        name: "Test Case 8: Footprint update notification",
        method: "POST",
        endpoint: `/2/events`,
        expectedStatusCode: 200,
        requestData: {
          specversion: "1.0",
          id: "string", // TODO generate uuid
          source: "string", // TODO add path to the webhook endpoint that processes the event
          time: new Date().toISOString(),
          type: "org.wbcsd.pathfinder.ProductFootprint.Published.v1",
          data: {
            pfIds: ["3fa85f64-5717-4562-b3fc-2c963f66afa6"],
          },
        },
      },
      {
        name: "Test Case 9: Request to send footprints",
        method: "POST",
        endpoint: `/2/events`,
        expectedStatusCode: 200,
        condition: ({ data }) => {
          return data.id === footprints.data[0].id;
        },
        requestData: {
          specversion: "1.0",
          id: "string", // TODO generate uuid
          source: "string", // TODO add path to the webhook endpoint that processes the event
          time: new Date().toISOString(),
          type: "org.wbcsd.pathfinder.ProductFootprint.Published.v1",
          data: {
            pf: {
              companyIds: "footprints[0].companyIds", // TODO add to demo endpoint. Add validation to avoid erroring out here
              productIds: "footprints[0].productIds", // TODO add to demo endpoint. Add validation to avoid erroring out here
            },
            comment: "Please send PCF data for this year.",
          },
        },
      },
      {
        name: "Test Case 10: Illegal access token",
        method: "GET",
        endpoint: `/2/footprints`,
        expectedStatusCode: 400,
        condition: ({ code }) => {
          return code === "BadRequest";
        },
        conditionErrorMessage: `Expected error code BadRequest in response.`,
        headers: {
          Authorization: `Bearer very-invalid-access-token`, // TODO add a random string to the token
        },
      },
      {
        name: "Test Case 11: Incorrect specific footprint request",
        method: "GET",
        endpoint: `/2/footprints/random-string-as-id`, // TODO add a random uuid string to the id
        expectedStatusCode: 404,
        condition: ({ code }) => {
          return code === "NoSuchFootprint";
        },
        conditionErrorMessage: `Expected error code NoSuchFootprint in response.`,
      },
    ];

    const results: TestResult[] = [];

    // Run each test case sequentially.
    for (const testCase of testCases) {
      console.log(`Running test case: ${testCase.name}`);
      const result = await runTestCase(baseUrl, testCase, accessToken);
      if (result.success) {
        console.log(`Test case "${testCase.name}" passed.`);
      } else {
        console.error(`Test case "${testCase.name}" failed: ${result.error}`);
      }
      results.push(result);
    }

    // If any test failed, return an error response.
    const failedTests = results.filter((result) => !result.success);
    if (failedTests.length > 0) {
      console.error("Some tests failed:", failedTests);
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "One or more tests failed",
          results,
        }),
      };
    }

    console.log("All tests passed successfully.");
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "All tests passed successfully",
        results,
      }),
    };
  } catch (error: any) {
    console.error("Error in Lambda function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error occurred in Lambda test runner",
        error: error.message,
      }),
    };
  }
};

const fetchFootprints = async (baseUrl: string, accessToken: string) =>
  await fetch(`${baseUrl}/2/footprints`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }).then((response) => response.json());
