import { ApiVersion, TestCase } from "../types/types";
import { randomUUID } from "crypto";
import { randomString } from "../utils/authUtils";
import {
  v2_0_ResponseSchema,
  v2_1_ResponseSchema,
  v2_2_ResponseSchema,
  v2_3_ResponseSchema,
  simpleResponseSchema,
  simpleSingleFootprintResponseSchema,
} from "../schemas/responseSchema";

export const generateV2TestCases = ({
  testRunId,
  footprints,
  paginationLinks,
  baseUrl,
  authBaseUrl,
  oidAuthUrl,
  clientId,
  clientSecret,
  version,
  webhookUrl,
}: {
  testRunId: string;
  footprints: any;
  paginationLinks: Record<string, string>;
  baseUrl: string;
  authBaseUrl: string;
  oidAuthUrl: string | null | undefined;
  clientId: string;
  clientSecret: string;
  version: ApiVersion;
  webhookUrl: string;
}): TestCase[] => {
  // Get the correct response schema based on the version
  const responseSchema = (() => {
    switch (version) {
      case "V2.0":
        return v2_0_ResponseSchema;
      case "V2.1":
        return v2_1_ResponseSchema;
      case "V2.2":
        return v2_2_ResponseSchema;
      case "V2.3":
        return v2_3_ResponseSchema;
      default:
        return v2_3_ResponseSchema; // Default to latest if unknown
    }
  })();

  return [
    {
      name: "Test Case 1: Obtain auth token with valid credentials",
      method: "POST",
      customUrl: oidAuthUrl || `${authBaseUrl}/auth/token`,
      requestData: "grant_type=client_credentials",
      expectedStatusCodes: [200],
      headers: getCorrectAuthHeaders(baseUrl, clientId, clientSecret),
      mandatoryVersion: ["V2.0", "V2.1", "V2.2", "V2.3"],
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
      testKey: "TESTCASE#3",
    },
    {
      name: "Test Case 4: Get all PCFs using ListFootprints",
      method: "GET",
      endpoint: "/2/footprints",
      expectedStatusCodes: [200, 202],
      schema: responseSchema,
      condition: ({ data }) => {
        return data.length === footprints.data.length;
      },
      conditionErrorMessage: "Number of footprints does not match",
      mandatoryVersion: ["V2.0", "V2.1", "V2.2", "V2.3"],
      testKey: "TESTCASE#4",
    },
    {
      name: "Test Case 5: Pagination link implementation of Action ListFootprints",
      method: "GET",
      endpoint: Object.values(paginationLinks)[0]?.replace(baseUrl, ""),
      expectedStatusCodes: [200],
      schema: simpleResponseSchema,
      mandatoryVersion: ["V2.0", "V2.1", "V2.2", "V2.3"],
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
      testKey: "TESTCASE#8",
    },
    {
      name: "Test Case 9: Attempt Authentication through HTTP (non-HTTPS)",
      customUrl:
        oidAuthUrl?.replace("https", "http") ||
        `${authBaseUrl.replace("https", "http")}/auth/token`,
      method: "POST",
      expectedStatusCodes: [400, 401, 403, 405],
      headers: getCorrectAuthHeaders(baseUrl, clientId, clientSecret),
      mandatoryVersion: ["V2.0", "V2.1", "V2.2", "V2.3"],
      testKey: "TESTCASE#9",
      requestData: "grant_type=client_credentials",
    },
    {
      name: "Test Case 10: Attempt ListFootprints through HTTP (non-HTTPS)",
      method: "GET",
      customUrl: `${baseUrl.replace("https", "http")}/2/footprints`,
      expectedStatusCodes: [400, 401, 403, 405],
      mandatoryVersion: ["V2.0", "V2.1", "V2.2", "V2.3"],
      testKey: "TESTCASE#10",
    },
    {
      name: "Test Case 11: Attempt GetFootprint through HTTP (non-HTTPS)",
      method: "GET",
      customUrl: `${baseUrl.replace("https", "http")}/2/footprints/${
        footprints.data[0].id
      }`,
      expectedStatusCodes: [400, 401, 403, 405],
      mandatoryVersion: ["V2.0", "V2.1", "V2.2", "V2.3"],
      testKey: "TESTCASE#11",
    },
    {
      name: "Test Case 12: Receive Asynchronous PCF Request",
      method: "POST",
      endpoint: `/2/events`,
      headers: {
        "Content-Type": "application/cloudevents+json; charset=UTF-8",
      },
      expectedStatusCodes: [200],
      requestData: {
        specversion: "1.0",
        id: testRunId,
        source: webhookUrl,
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
        id: testRunId,
        source: webhookUrl,
        time: new Date().toISOString(),
        data: {
          pfIds: ["urn:gtin:4712345060507"],
        },
      },
      headers: {
        Authorization: `Bearer very-invalid-access-token-${randomString(16)}`,
        "Content-Type": "application/cloudevents+json; charset=UTF-8",
      },
      condition: ({ code }) => {
        return code === "BadRequest";
      },
      mandatoryVersion: ["V2.2", "V2.3"],
      testKey: "TESTCASE#14",
    },
    {
      name: "Test Case 15: Attempt Action Events through HTTP (non-HTTPS)",
      method: "POST",
      customUrl: `${baseUrl.replace("https", "http")}/2/events`,
      expectedStatusCodes: [400, 401, 403, 405],
      requestData: {
        specversion: "1.0",
        id: testRunId,
        source: webhookUrl,
        time: new Date().toISOString(),
        type: "org.wbcsd.pathfinder.ProductFootprint.Published.v1",
        data: {
          pf: {
            productIds: ["urn:gtin:4712345060507"],
          },
          comment: "Please send PCF data for this year.",
        },
      },
      headers: {
        "Content-Type": "application/cloudevents+json; charset=UTF-8",
      },
      mandatoryVersion: ["V2.2", "V2.3"],
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
        source: webhookUrl,
        time: new Date().toISOString(),
        data: {
          pfIds: ["urn:gtin:4712345060507"],
        },
      },
      headers: {
        "Content-Type": "application/cloudevents+json; charset=UTF-8",
      },
      mandatoryVersion: ["V2.2", "V2.3"],
      testKey: "TESTCASE#16",
    },
    {
      name: "Test Case 17: OpenId Connect-based Authentication Flow",
      method: "POST",
      customUrl: oidAuthUrl || undefined,
      expectedStatusCodes: [200],
      headers: getCorrectAuthHeaders(baseUrl, clientId, clientSecret),
      testKey: "TESTCASE#17",
      requestData: "grant_type=client_credentials",
    },
    {
      name: "Test Case 18: OpenId connect-based authentication flow with incorrect credentials",
      method: "POST",
      customUrl: oidAuthUrl || undefined,
      expectedStatusCodes: [400, 401],
      headers: getIncorrectAuthHeaders(baseUrl),
      testKey: "TESTCASE#18",
      requestData: "grant_type=client_credentials",
    },
    {
      name: "Test Case 19: Get Filtered List of Footprints",
      method: "GET",
      endpoint: `/2/footprints?$filter=${encodeURIComponent(
        `created ge '${footprints.data[0].created}'`
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
      testKey: "TESTCASE#19",
    },
  ];
};

// Import the auth header functions directly from authUtils
import {
  getCorrectAuthHeaders,
  getIncorrectAuthHeaders,
} from "../utils/authUtils";
