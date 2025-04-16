import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { randomUUID } from "crypto";
import { ApiVersion, TestCase, TestResult } from "../types/types";
import {
  v2_3_ResponseSchema,
  simpleResponseSchema,
  simpleSingleFootprintResponseSchema,
} from "../schemas/responseSchema";
import {
  getAccessToken,
  getCorrectAuthHeaders,
  getOidAuthUrl,
  getIncorrectAuthHeaders,
  randomString,
} from "../utils/authUtils";
import {
  fetchFootprints,
  getLinksHeaderFromFootprints,
} from "../utils/fetchFootprints";
import { runTestCase } from "../utils/runTestCase";
import {
  saveTestCaseResults,
  saveTestData,
  saveTestRun,
} from "../utils/dbUtils";

const WEBHOOK_URL = process.env.WEBHOOK_URL;

/**
 * Lambda handler that runs the test scenarios.
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const {
    baseUrl,
    clientId,
    clientSecret,
    version,
    companyName,
    companyIdentifier,
    adminEmail,
    adminFullName,
    customAuthBaseUrl,
  }: {
    baseUrl: string;
    clientId: string;
    clientSecret: string;
    version: ApiVersion;
    companyName: string;
    companyIdentifier: string;
    adminEmail: string;
    adminFullName: string;
    customAuthBaseUrl?: string;
  } = JSON.parse(event.body || "{}");

  // TODO validate body, all fields must be present

  try {
    const testRunId = randomUUID();

    await saveTestRun({
      testRunId,
      companyName,
      companyIdentifier,
      adminEmail,
      adminFullName,
      techSpecVersion: version,
    });

    const authBaseUrl = customAuthBaseUrl || baseUrl;

    const oidAuthUrl = await getOidAuthUrl(authBaseUrl);

    const accessToken = await getAccessToken(
      authBaseUrl,
      clientId,
      clientSecret,
      oidAuthUrl
    );

    const footprints = await fetchFootprints(baseUrl, accessToken);

    const paginationLinks = await getLinksHeaderFromFootprints(
      baseUrl,
      accessToken
    );

    saveTestData(testRunId, {
      productIds: footprints.data[0].productIds,
      version,
    });

    // TODO when the test cases are optional, returning 400 not implemented is also an option. Confirm with the team
    // TODO confirm if in the case of limit and filtering for < 2.3 the endpoint should return 400 or 200 without filtering and limit
    // TODO Add support for https
    const testCases: TestCase[] = [
      {
        name: "Test Case 1: Obtain auth token with valid credentials",
        method: "POST",
        customUrl: oidAuthUrl || `${authBaseUrl}/auth/token`,
        requestData: "grant_type=client_credentials",
        expectedStatusCodes: [200],
        headers: getCorrectAuthHeaders(baseUrl, clientId, clientSecret),
        mandatoryVersion: ["V2.0", "V2.1", "V2.2", "V2.3"],
        ensureHttps: false,
        testKey: "TESTCASE#1",
      },
      {
        name: "Test Case 2: Obtain auth token with invalid credentials",
        method: "POST",
        customUrl: oidAuthUrl || `${authBaseUrl}/auth/token`,
        requestData: "grant_type=client_credentials",
        expectedStatusCodes: [400, 401],
        headers: getIncorrectAuthHeaders(baseUrl),
        mandatoryVersion: ["V2.0", "V2.1", "V2.2", "V2.3"],
        ensureHttps: false,
        testKey: "TESTCASE#2",
      },
      {
        name: "Test Case 3: Get PCF using GetFootprint",
        method: "GET",
        endpoint: `/2/footprints/${footprints.data[0].id}`,
        expectedStatusCodes: [200],
        schema: simpleSingleFootprintResponseSchema,
        condition: ({ data }) => {
          return data.id === footprints.data[0].id;
        },
        conditionErrorMessage: `Returned footprint does not match the requested footprint with id ${footprints.data[0].id}`,
        mandatoryVersion: ["V2.0", "V2.1", "V2.2", "V2.3"],
        ensureHttps: false,
        testKey: "TESTCASE#3",
      },
      {
        name: "Test Case 4: Get all PCFs using ListFootprints",
        method: "GET",
        endpoint: "/2/footprints",
        expectedStatusCodes: [200, 202],
        schema: v2_3_ResponseSchema,
        condition: ({ data }) => {
          return data.length === footprints.data.length;
        },
        conditionErrorMessage: "Number of footprints does not match",
        mandatoryVersion: ["V2.0", "V2.1", "V2.2", "V2.3"],
        ensureHttps: false,
        testKey: "TESTCASE#4",
      },
      {
        name: "Test Case 5: Pagination link implementation of Action ListFootprints",
        method: "GET",
        endpoint: Object.values(paginationLinks)[0]?.replace(baseUrl, ""), // TODO add skip support to tests in case no pagination links are present
        expectedStatusCodes: [200],
        schema: simpleResponseSchema,
        mandatoryVersion: ["V2.0", "V2.1", "V2.2", "V2.3"],
        ensureHttps: false,
        testKey: "TESTCASE#5",
      },
      {
        name: "Test Case 6: Attempt ListFootPrints with Invalid Token",
        method: "GET",
        endpoint: `/2/footprints`,
        expectedStatusCodes: [400],
        condition: ({ code }) => {
          return code === "BadRequest";
        },
        conditionErrorMessage: `Expected error code BadRequest in response.`,
        headers: {
          Authorization: `Bearer very-invalid-access-token-${randomString(16)}`,
        },
        mandatoryVersion: ["V2.0", "V2.1", "V2.2", "V2.3"],
        ensureHttps: false,
        testKey: "TESTCASE#6",
      },
      {
        name: "Test Case 7: Attempt GetFootprint with Invalid Token",
        method: "GET",
        endpoint: `/2/footprints/${footprints.data[0].id}`,
        expectedStatusCodes: [400],
        condition: ({ code }) => {
          return code === "BadRequest";
        },
        conditionErrorMessage: `Expected error code BadRequest in response.`,
        headers: {
          Authorization: `Bearer very-invalid-access-token-${randomString(16)}`,
        },
        mandatoryVersion: ["V2.0", "V2.1", "V2.2", "V2.3"],
        ensureHttps: false,
        testKey: "TESTCASE#7",
      },
      {
        name: "Test Case 8: Attempt GetFootprint with Non-Existent PfId",
        method: "GET",
        endpoint: `/2/footprints/random-string-as-id-${randomString(16)}`,
        expectedStatusCodes: [404],
        condition: ({ code }) => {
          return code === "NoSuchFootprint";
        },
        conditionErrorMessage: `Expected error code NoSuchFootprint in response.`,
        mandatoryVersion: ["V2.0", "V2.1", "V2.2", "V2.3"],
        ensureHttps: false,
        testKey: "TESTCASE#8",
      },
      {
        name: "Test Case 9: Attempt Authentication through HTTP (non-HTTPS)",
        customUrl: oidAuthUrl || `${authBaseUrl}/auth/token`,
        method: "POST",
        endpoint: "/auth/token",
        expectedStatusCodes: [200],
        headers: getCorrectAuthHeaders(baseUrl, clientId, clientSecret),
        mandatoryVersion: ["V2.0", "V2.1", "V2.2", "V2.3"],
        ensureHttps: true,
        testKey: "TESTCASE#9",
      },
      {
        name: "Test Case 10: Attempt ListFootprints through HTTP (non-HTTPS)",
        method: "GET",
        endpoint: "/2/footprints",
        expectedStatusCodes: [200],
        schema: simpleResponseSchema,
        condition: ({ data }) => {
          return data.length === footprints.data.length;
        },
        conditionErrorMessage: "Number of footprints does not match",
        mandatoryVersion: ["V2.0", "V2.1", "V2.2", "V2.3"],
        ensureHttps: true,
        testKey: "TESTCASE#10",
      },
      {
        name: "Test Case 11: Attempt GetFootprint through HTTP (non-HTTPS)",
        method: "GET",
        endpoint: `/2/footprints/${footprints.data[0].id}`,
        expectedStatusCodes: [200],
        schema: simpleSingleFootprintResponseSchema,
        condition: ({ data }) => {
          return data.id === footprints.data[0].id;
        },
        conditionErrorMessage: `Returned footprint does not match the requested footprint with id ${footprints.data[0].id}`,
        mandatoryVersion: ["V2.0", "V2.1", "V2.2", "V2.3"],
        ensureHttps: true,
        testKey: "TESTCASE#11",
      },
      {
        name: "Test Case 12: Receive Asynchronous PCF Request",
        method: "POST",
        endpoint: `/2/events`,
        expectedStatusCodes: [200],
        requestData: {
          specversion: "1.0",
          id: testRunId,
          source: `${WEBHOOK_URL}?testRunId=${testRunId}&testCaseName=${encodeURIComponent(
            "TESTCASE#12"
          )}`,
          time: new Date().toISOString(),
          type: "org.wbcsd.pathfinder.ProductFootprintRequest.Created.v1",
          data: {
            pf: {
              productIds: footprints.data[0].productIds,
            },
            comment: "Please send PCF data for this year.",
          },
        },
        mandatoryVersion: ["V2.2", "V2.3"],
        ensureHttps: false,
        testKey: "TESTCASE#12",
      },
      // Test Case 13 is about receiving the PCF data from the webhook endpoint as a data recipient, this request will be triggered by the previous test.
      // It will be tested in the listener lambda
      {
        name: "Test Case 14: Attempt Action Events with Invalid Token",
        method: "POST",
        endpoint: `/2/events`,
        expectedStatusCodes: [400],
        requestData: {
          type: "org.wbcsd.pathfinder.ProductFootprint.Published.v1",
          specversion: "1.0",
          id: randomUUID(),
          source: `${WEBHOOK_URL}?testRunId=${testRunId}&testCaseName=${encodeURIComponent(
            "TESTCASE#14"
          )}`,
          time: new Date().toISOString(),
          data: {
            pfIds: ["urn:gtin:4712345060507"],
          },
        },
        headers: {
          Authorization: `Bearer very-invalid-access-token-${randomString(16)}`,
        },
        condition: ({ code }) => {
          return code === "BadRequest";
        },
        mandatoryVersion: ["V2.2", "V2.3"],
        ensureHttps: false,
        testKey: "TESTCASE#14",
      },
      {
        name: "Test Case 15: Attempt Action Events through HTTP (non-HTTPS)",
        method: "POST",
        endpoint: `/2/events`,
        expectedStatusCodes: [200],
        requestData: {
          specversion: "1.0",
          id: randomUUID(),
          source: `${WEBHOOK_URL}?testRunId=${testRunId}&testCaseName=${encodeURIComponent(
            "TESTCASE#15"
          )}`,
          time: new Date().toISOString(),
          type: "org.wbcsd.pathfinder.ProductFootprint.Published.v1",
          data: {
            pf: {
              productIds: ["urn:gtin:4712345060507"],
            },
            comment: "Please send PCF data for this year.",
          },
        },
        mandatoryVersion: ["V2.2", "V2.3"],
        ensureHttps: true,
        testKey: "TESTCASE#15",
      },
      {
        name: "Test Case 16: Receive Notification of PCF Update",
        method: "POST",
        endpoint: `/2/events`,
        expectedStatusCodes: [200],
        requestData: {
          type: "org.wbcsd.pathfinder.ProductFootprint.Published.v1",
          specversion: "1.0",
          id: randomUUID(),
          source: `${WEBHOOK_URL}?testRunId=foo&testCaseName=bar`, // TODO send correct test ID and test case name
          time: new Date().toISOString(),
          data: {
            pfIds: ["urn:gtin:4712345060507"],
          },
        },
        mandatoryVersion: ["V2.2", "V2.3"],
        ensureHttps: false,
        testKey: "TESTCASE#16",
      },
      {
        name: "Test Case 17: OpenId Connect-based Authentication Flow",
        method: "POST",
        customUrl: oidAuthUrl,
        expectedStatusCodes: [200],
        headers: getCorrectAuthHeaders(baseUrl, clientId, clientSecret),
        ensureHttps: false,
        testKey: "TESTCASE#17",
        requestData: "grant_type=client_credentials",
      },
      {
        name: "Test Case 18: OpenId connect-based authentication flow with incorrect credentials",
        method: "POST",
        customUrl: oidAuthUrl,
        expectedStatusCodes: [400],
        headers: getIncorrectAuthHeaders(baseUrl),
        ensureHttps: false,
        testKey: "TESTCASE#18",
      },
      {
        name: "Test Case 19: Get Filtered List of Footprints",
        method: "GET",
        endpoint: `/2/footprints?$filter=${encodeURIComponent(
          `created ge ${footprints.data[0].created}`
        )}`,
        expectedStatusCodes: [200],
        schema: simpleResponseSchema,
        condition: ({ data }) => {
          return data.every(
            (footprint: { created: Date }) =>
              footprint.created >= footprints.data[0].created
          );
        },
        conditionErrorMessage: `One or more footprints do not match the condition: 'created date >= ${footprints.data[0].created}'`,
        ensureHttps: false,
        testKey: "TESTCASE#19",
      },
    ];

    const results: TestResult[] = [];

    // Run each test case sequentially.
    for (const testCase of testCases) {
      console.log(`Running test case: ${testCase.name}`);
      const result = await runTestCase(baseUrl, testCase, accessToken, version);
      if (result.success) {
        console.log(`Test case "${testCase.name}" passed.`);
      } else {
        console.error(
          `Test case "${testCase.name}" failed: ${result.errorMessage}`
        );
      }
      results.push(result);
    }

    const resultsWithAsyncPlaceholder: TestResult[] = [
      ...results,
      {
        name: "Test Case 13: Respond to Asynchronous PCF Request",
        status: "PENDING",
        success: false,
        mandatory: false,
        testKey: "TESTCASE#13",
      },
    ];

    await saveTestCaseResults(testRunId, resultsWithAsyncPlaceholder);

    // If any test failed, return an error response.
    const failedTests = resultsWithAsyncPlaceholder.filter(
      (result) => !result.success
    );
    if (failedTests.length > 0) {
      console.error("Some tests failed:", failedTests);
      // Filter out optional tests for passing percentage calculation
      const mandatoryTests = resultsWithAsyncPlaceholder.filter(
        (result) => result.mandatory
      );
      const failedMandatoryTests = mandatoryTests.filter(
        (result) => !result.success
      );

      const passingPercentage =
        mandatoryTests.length > 0
          ? Math.round(
              ((mandatoryTests.length - failedMandatoryTests.length) /
                mandatoryTests.length) *
                100
            )
          : 0;

      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "One or more tests failed",
          results: resultsWithAsyncPlaceholder,
          passingPercentage,
          testRunId,
        }),
      };
    }

    console.log("All tests passed successfully.");
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "All tests passed successfully",
        results: resultsWithAsyncPlaceholder,
        passingPercentage: 100,
        testRunId,
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
