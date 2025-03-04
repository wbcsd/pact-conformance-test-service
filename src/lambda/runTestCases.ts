import { TestCase, TestResult } from "../types/types";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  responseSchema,
  simpleResponseSchema,
  simpleSingleFootprintResponseSchema,
} from "../schemas/responseSchema";
import {
  getAccessToken,
  getCorrectAuthHeaders,
  getCustomAuthUrl,
  getIncorrectAuthHeaders,
} from "../utils/authUtils";
import {
  fetchFootprints,
  getLinksHeaderFromFootprints,
} from "../utils/fetchFootprints";
import { runTestCase } from "../utils/runTestCase";

const WEBHOOK_URL = process.env.WEBHOOK_URL;

/**
 * Lambda handler that runs the test scenarios.
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Lambda test runner started");

  const {
    baseUrl,
    clientId,
    clientSecret,
  }: { baseUrl: string; clientId: string; clientSecret: string } = JSON.parse(
    event.body || "{}"
  );

  // TODO validate body, all three fields must be present

  try {
    const accessToken = await getAccessToken(baseUrl, clientId, clientSecret);

    const footprints = await fetchFootprints(baseUrl, accessToken);

    const paginationLinks = await getLinksHeaderFromFootprints(
      baseUrl,
      accessToken
    );

    const customAuthUrl = await getCustomAuthUrl(baseUrl);

    // Define your test cases.
    // TODO when the test cases are optional, returning 400 not implemented is also an option. Confirm with the team
    // TODO confirm if in the case of limit and filtering for < 2.3 the endpoint should return 400 or 200 without filtering and limit
    // TODO Add api response to error message
    const testCases: TestCase[] = [
      {
        name: "Test Case 1: Authentication against default endpoint",
        method: "POST",
        endpoint: "/auth/token",
        expectedStatusCode: 200,
        headers: getCorrectAuthHeaders(baseUrl, clientId, clientSecret),
      },
      {
        name: "Test Case 2: Authentication with invalid credentials against default endpoint",
        method: "POST",
        endpoint: "/auth/token",
        expectedStatusCode: 400,
        headers: getIncorrectAuthHeaders(baseUrl),
      },
      {
        name: "Test Case 3: Get all footprints",
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
        name: "Test Case 4: Get Limited List of Footprints",
        method: "GET",
        endpoint: `/2/footprints?limit=1`,
        expectedStatusCode: 200, // TODO add support for more than one status code. See 5.4.2. Expected Response in https://wbcsd.github.io/pact-conformance-testing/checklist.html#tc004
        schema: simpleResponseSchema,
        condition: ({ data }) => {
          return data.length === 1;
        },
        conditionErrorMessage: `Returned more footprints than the limit of 1`,
      },
      {
        // TODO this test will need further implementation to support multiple calls to the endpoint with different urls
        name: "Test Case 5: Pagination link implementation of Action ListFootprints",
        method: "GET",
        endpoint: Object.values(paginationLinks)[0]?.replace(baseUrl, ""), // TODO add skip support to tests in case no pagination links are present
        expectedStatusCode: 200,
        schema: simpleResponseSchema,
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
      // TODO Test case 6 is about testing with an expired token, we can't test that
      {
        name: "Test Case 7:Attempt ListFootPrints with Invalid Token",
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
        name: "Test Case 8: Retrieve the specific footprint",
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
        name: "Test Case 10: Attempt GetFootprint with Invalid Token",
        method: "GET",
        endpoint: `/2/footprints/${footprints.data[0].id}`,
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
        name: "Test Case 11: Attempt GetFootprint with Non-Existent PfId",
        method: "GET",
        endpoint: `/2/footprints/random-string-as-id`, // TODO add a random uuid string to the id
        expectedStatusCode: 404,
        condition: ({ code }) => {
          return code === "NoSuchFootprint";
        },
        conditionErrorMessage: `Expected error code NoSuchFootprint in response.`,
      },
      {
        name: "Test Case 12: Asynchronous PCF Request",
        method: "POST",
        endpoint: `/2/events`,
        expectedStatusCode: 200,
        requestData: {
          specversion: "1.0",
          id: "string", // TODO generate uuid
          source: `${WEBHOOK_URL}?testId=foo&testCaseName=bar`,
          time: new Date().toISOString(),
          type: "org.wbcsd.pathfinder.ProductFootprint.Published.v1",
          data: {
            pf: {
              productIds: ["urn:gtin:4712345060507"],
            },
            comment: "Please send PCF data for this year.",
          },
        },
      },
      // TODO: Test Case 13 is about receiving the PCF data from the webhook endpoint as a data recipient, this request will be triggered by the previous test
      {
        name: "Test Case 14: Receive Notification of PCF Update",
        method: "POST",
        endpoint: `/2/events`,
        expectedStatusCode: 200,
        requestData: {
          type: "org.wbcsd.pathfinder.ProductFootprint.Published.v1",
          specversion: "1.0",
          id: "EventId", // TODO generate uuid
          source: "//EventHostname/EventSubpath",
          time: new Date().toISOString(),
          data: {
            pfIds: ["urn:gtin:4712345060507"],
          },
        },
      },
      // TODO: Test Case 15 is about receiving the PCF update as a recipient (see notes)
      {
        name: "Test Case 16: OpenId Connect-based Authentication Flow",
        method: "POST",
        customUrl: customAuthUrl,
        expectedStatusCode: 200,
        headers: getCorrectAuthHeaders(baseUrl, clientId, clientSecret),
      },
      {
        name: "Test Case 17: Authentication with invalid credentials against default endpoint",
        method: "POST",
        customUrl: customAuthUrl,
        expectedStatusCode: 400,
        headers: getIncorrectAuthHeaders(baseUrl),
      },
      // TODO: Test cases 18 and 19 are about testing the http(s) protocol, can't see the value of it in the context of the API
      {
        name: "Test Case 20: Get Filtered List of Footprints",
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
      // TODO: Test cas 21 is getFootprint without https, can't see the value of it in the context of the API
      {
        name: "Test Case 23: Receive Notification of PCF Update",
        method: "POST",
        endpoint: `/2/events`,
        expectedStatusCode: 400,
        requestData: {
          type: "org.wbcsd.pathfinder.ProductFootprint.Published.v1",
          specversion: "1.0",
          id: "EventId", // TODO generate uuid
          source: "//EventHostname/EventSubpath",
          time: new Date().toISOString(),
          data: {
            pfIds: ["urn:gtin:4712345060507"],
          },
        },
        headers: {
          Authorization: `Bearer very-invalid-access-token`, // TODO add a random string to the token
        },
        condition: ({ code }) => {
          return code === "BadRequest";
        },
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
