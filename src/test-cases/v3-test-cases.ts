import { ApiVersion, TestCase } from "../types/types";
import { randomUUID } from "crypto";
import { randomString } from "../utils/authUtils";
import {
  simpleResponseSchema,
  simpleSingleFootprintResponseSchema,
} from "../schemas/responseSchema";
import {
  getCorrectAuthHeaders,
  getIncorrectAuthHeaders,
} from "../utils/authUtils";
import { v3_0_ResponseSchema } from "../schemas/v3_0_schema";

export const generateV3TestCases = ({
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
      case "V3.0":
        return v3_0_ResponseSchema;
      default:
        return v3_0_ResponseSchema; // Default to latest if unknown
    }
  })();

  // TODO: validate properties needed in the footprints for the test cases, especially filters

  return [
    {
      name: "Test Case 1: Obtain auth token with valid credentials",
      method: "POST",
      customUrl: oidAuthUrl || `${authBaseUrl}/auth/token`,
      requestData: "grant_type=client_credentials",
      expectedStatusCodes: [200],
      headers: getCorrectAuthHeaders(baseUrl, clientId, clientSecret),
      mandatoryVersion: ["V3.0"],
      testKey: "TESTCASE#1",
    },
    {
      name: "Test Case 2: Obtain auth token with invalid credentials",
      method: "POST",
      customUrl: oidAuthUrl || `${authBaseUrl}/auth/token`,
      requestData: "grant_type=client_credentials",
      expectedStatusCodes: [400, 401],
      headers: getIncorrectAuthHeaders(baseUrl),
      mandatoryVersion: ["V3.0"],
      testKey: "TESTCASE#2",
    },
    {
      name: "Test Case 3: Get PCF using GetFootprint",
      method: "GET",
      endpoint: `/3/footprints/${footprints.data[0].id}`,
      expectedStatusCodes: [200],
      schema: simpleSingleFootprintResponseSchema,
      condition: ({ data }) => {
        return data.id === footprints.data[0].id;
      },
      conditionErrorMessage: `Returned footprint does not match the requested footprint with id ${footprints.data[0].id}`,
      mandatoryVersion: ["V3.0"],
      testKey: "TESTCASE#3",
    },
    {
      name: "Test Case 4: Get all PCFs using ListFootprints",
      method: "GET",
      endpoint: "/3/footprints",
      expectedStatusCodes: [200, 202],
      schema: responseSchema,
      condition: ({ data }) => {
        return data.length === footprints.data.length;
      },
      conditionErrorMessage: "Number of footprints does not match",
      mandatoryVersion: ["V3.0"],
      testKey: "TESTCASE#4",
    },
    {
      name: "Test Case 5: Pagination link implementation of Action ListFootprints",
      method: "GET",
      endpoint: Object.values(paginationLinks)[0]?.replace(baseUrl, ""),
      expectedStatusCodes: [200],
      schema: simpleResponseSchema,
      mandatoryVersion: ["V3.0"],
      testKey: "TESTCASE#5",
    },
    {
      name: "Test Case 6: Attempt ListFootPrints with Invalid Token",
      method: "GET",
      endpoint: `/3/footprints`,
      expectedStatusCodes: [400],
      condition: ({ code }) => {
        return code === "BadRequest";
      },
      conditionErrorMessage: `Expected error code BadRequest in response.`,
      headers: {
        Authorization: `Bearer very-invalid-access-token-${randomString(16)}`,
      },
      mandatoryVersion: ["V3.0"],
      testKey: "TESTCASE#6",
    },
    {
      name: "Test Case 7: Attempt GetFootprint with Invalid Token",
      method: "GET",
      endpoint: `/3/footprints/${footprints.data[0].id}`,
      expectedStatusCodes: [400],
      condition: ({ code }) => {
        return code === "BadRequest";
      },
      conditionErrorMessage: `Expected error code BadRequest in response.`,
      headers: {
        Authorization: `Bearer very-invalid-access-token-${randomString(16)}`,
      },
      mandatoryVersion: ["V3.0"],
      testKey: "TESTCASE#7",
    },
    {
      name: "Test Case 8: Attempt GetFootprint with Non-Existent PfId",
      method: "GET",
      endpoint: `/3/footprints/random-string-as-id-${randomString(16)}`,
      expectedStatusCodes: [404],
      condition: ({ code }) => {
        return code === "NoSuchFootprint";
      },
      conditionErrorMessage: `Expected error code NoSuchFootprint in response.`,
      mandatoryVersion: ["V3.0"],
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
      mandatoryVersion: ["V3.0"],
      testKey: "TESTCASE#9",
      requestData: "grant_type=client_credentials",
    },
    {
      name: "Test Case 10: Attempt ListFootprints through HTTP (non-HTTPS)",
      method: "GET",
      customUrl: `${baseUrl.replace("https", "http")}/3/footprints`,
      expectedStatusCodes: [400, 401, 403, 405],
      mandatoryVersion: ["V3.0"],
      testKey: "TESTCASE#10",
    },
    {
      name: "Test Case 11: Attempt GetFootprint through HTTP (non-HTTPS)",
      method: "GET",
      customUrl: `${baseUrl.replace("https", "http")}/3/footprints/${
        footprints.data[0].id
      }`,
      expectedStatusCodes: [400, 401, 403, 405],
      mandatoryVersion: ["V3.0"],
      testKey: "TESTCASE#11",
    },
    {
      name: "Test Case 12: Receive Asynchronous PCF Request",
      method: "POST",
      endpoint: `/3/events`,
      headers: {
        "Content-Type": "application/cloudevents+json; charset=UTF-8",
      },
      expectedStatusCodes: [200],
      requestData: {
        specversion: "1.0",
        id: testRunId,
        source: webhookUrl,
        time: new Date().toISOString(),
        type: "org.wbcsd.pact.ProductFootprint.RequestCreatedEvent.3",
        data: {
          pf: {
            productIds: footprints.data[0].productIds,
          },
          comment: "Please send PCF data for this year.",
        },
      },
      mandatoryVersion: ["V3.0"],
      testKey: "TESTCASE#12",
    },
    // Test Case 13 is about receiving the PCF data from the webhook endpoint as a data recipient, this request will be triggered by the previous test.
    // It will be tested in the listener lambda
    {
      name: "Test Case 14: Attempt Action Events with Invalid Token",
      method: "POST",
      endpoint: `/3/events`,
      expectedStatusCodes: [400],
      requestData: {
        type: "org.wbcsd.pact.ProductFootprint.PublishedEvent.3",
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
      mandatoryVersion: ["V3.0"],
      testKey: "TESTCASE#14",
    },
    {
      name: "Test Case 15: Attempt Action Events through HTTP (non-HTTPS)",
      method: "POST",
      customUrl: `${baseUrl.replace("https", "http")}/3/events`,
      expectedStatusCodes: [400, 401, 403, 405],
      requestData: {
        specversion: "1.0",
        id: testRunId,
        source: webhookUrl,
        time: new Date().toISOString(),
        type: "org.wbcsd.pact.ProductFootprint.PublishedEvent.3",
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
      mandatoryVersion: ["V3.0"],
      testKey: "TESTCASE#15",
    },
    {
      name: "Test Case 16: Receive Notification of PCF Update",
      method: "POST",
      endpoint: `/3/events`,
      expectedStatusCodes: [200],
      requestData: {
        type: "org.wbcsd.pact.ProductFootprint.PublishedEvent.3",
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
      mandatoryVersion: ["V3.0"],
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
      mandatoryVersion: ["V3.0"],
    },
    {
      name: "Test Case 18: OpenId connect-based authentication flow with incorrect credentials",
      method: "POST",
      customUrl: oidAuthUrl || undefined,
      expectedStatusCodes: [400, 401],
      headers: getIncorrectAuthHeaders(baseUrl),
      testKey: "TESTCASE#18",
      requestData: "grant_type=client_credentials",
      mandatoryVersion: ["V3.0"],
    },
    {
      name: `Test Case 19: V3 Filtering Functionality: Get Filtered List of Footprints by "productId" parameter`,
      method: "GET",
      endpoint: `/3/footprints?$productId=${footprints.data[0].productIds[0]}`,
      expectedStatusCodes: [200],
      schema: simpleResponseSchema,
      condition: ({ data }) => {
        return data.every((footprint: { productIds: string[] }) =>
          footprint.productIds.includes(footprints.data[0].productIds[0])
        );
      },
      conditionErrorMessage: `One or more footprints do not match the condition: 'productIds contains ${footprints.data[0].productIds.toString()}'`,
      testKey: "TESTCASE#19",
      mandatoryVersion: ["V3.0"],
    },
    {
      name: `Test Case 20: V3 Filtering Functionality: Get Filtered List of Footprints by "companyId" parameter`,
      method: "GET",
      endpoint: `/3/footprints?$companyId=${footprints.data[0].companyIds[0]}`,
      expectedStatusCodes: [200],
      schema: simpleResponseSchema,
      condition: ({ data }) => {
        return data.every((footprint: { companyIds: string[] }) =>
          footprint.companyIds.includes(footprints.data[0].companyIds[0])
        );
      },
      conditionErrorMessage: `One or more footprints do not match the condition: 'companyIds contains ${footprints.data[0].companyIds[0]}'`,
      testKey: "TESTCASE#20",
      mandatoryVersion: ["V3.0"],
    },
    {
      name: `Test Case 21: V3 Filtering Functionality: Get Filtered List of Footprints by "geography" parameter`,
      method: "GET",
      endpoint: `/3/footprints?$geography=${footprints.data[0].pcf.geographyCountry}`,
      expectedStatusCodes: [200],
      schema: simpleResponseSchema,
      condition: ({ data }) => {
        return data.every(
          (footprint: { pcf: { geographyCountry: string } }) =>
            footprint.pcf.geographyCountry ===
            footprints.data[0].pcf.geographyCountry
        );
      },
      conditionErrorMessage: `One or more footprints do not match the condition: 'pcf.geographyCountry = ${footprints.data[0].pcf.geographyCountry}'`,
      testKey: "TESTCASE#21",
      mandatoryVersion: ["V3.0"],
    },
    {
      name: `Test Case 22: V3 Filtering Functionality: Get Filtered List of Footprints by "classification" parameter`,
      method: "GET",
      endpoint: `/3/footprints?$classification=${footprints.data[0].productClassifications[0]}`,
      expectedStatusCodes: [200],
      schema: simpleResponseSchema,
      condition: ({ data }) => {
        return data.every((footprint: { productClassifications: string[] }) =>
          footprint.productClassifications.includes(
            footprints.data[0].productClassifications[0]
          )
        );
      },
      conditionErrorMessage: `One or more footprints do not match the condition: 'productClassifications contains ${footprints.data[0].productClassifications[0]}'`,
      testKey: "TESTCASE#22",
      mandatoryVersion: ["V3.0"],
    },
    {
      name: `Test Case 23: V3 Filtering Functionality: Get Filtered List of Footprints by "validOn" parameter`,
      method: "GET",
      endpoint: `/3/footprints?$validOn=${footprints.data[0].validityPeriodStart}`,
      expectedStatusCodes: [200],
      schema: simpleResponseSchema,
      condition: ({ data }) => {
        return data.every(
          (footprint: {
            validityPeriodStart: string;
            validityPeriodEnd: string;
          }) =>
            new Date(footprint.validityPeriodStart) <=
              new Date(footprints.data[0].validityPeriodStart) &&
            new Date(footprint.validityPeriodEnd) >=
              new Date(footprints.data[0].validityPeriodStart)
        );
      },
      conditionErrorMessage: `One or more footprints do not match the condition: 'validityPeriodStart <= ${footprints.data[0].validityPeriodStart} <= validityPeriodEnd'`,
      testKey: "TESTCASE#23",
      mandatoryVersion: ["V3.0"],
    },
    {
      name: `Test Case 24: V3 Filtering Functionality: Get Filtered List of Footprints by "validAfter" parameter`,
      method: "GET",
      endpoint: `/3/footprints?$validAfter=${getDateOneDayBefore(
        footprints.data[0].validityPeriodStart
      )}`,
      expectedStatusCodes: [200],
      schema: simpleResponseSchema,
      condition: ({ data }) => {
        return data.every(
          (footprint: { validityPeriodStart: string }) =>
            new Date(footprint.validityPeriodStart) >
            new Date(
              getDateOneDayBefore(footprints.data[0].validityPeriodStart)
            )
        );
      },
      conditionErrorMessage: `One or more footprints do not match the condition: 'validityPeriodStart > ${getDateOneDayBefore(
        footprints.data[0].validityPeriodStart
      )}'`,
      testKey: "TESTCASE#24",
      mandatoryVersion: ["V3.0"],
    },
    {
      name: `Test Case 25: V3 Filtering Functionality: Get Filtered List of Footprints by "validBefore" parameter`,
      method: "GET",
      endpoint: `/3/footprints?$validBefore=${getDateOneDayAfter(
        footprints.data[0].validityPeriodEnd
      )}`,
      expectedStatusCodes: [200],
      schema: simpleResponseSchema,
      condition: ({ data }) => {
        return data.every(
          (footprint: { validityPeriodEnd: string }) =>
            new Date(footprint.validityPeriodEnd) <
            new Date(getDateOneDayAfter(footprints.data[0].validityPeriodEnd))
        );
      },
      conditionErrorMessage: `One or more footprints do not match the condition: 'validityPeriodEnd < ${getDateOneDayAfter(
        footprints.data[0].validityPeriodEnd
      )}'`,
      testKey: "TESTCASE#25",
      mandatoryVersion: ["V3.0"],
    },
    {
      name: `Test Case 26: V3 Filtering Functionality: Get Filtered List of Footprints by "status" parameter`,
      method: "GET",
      endpoint: `/3/footprints?$status=${footprints.data[0].status}`,
      expectedStatusCodes: [200],
      schema: simpleResponseSchema,
      condition: ({ data }) => {
        return data.every(
          (footprint: { status: string }) =>
            footprint.status === footprints.data[0].status
        );
      },
      conditionErrorMessage: `One or more footprints do not match the condition: 'status = ${footprints.data[0].status}'`,
      testKey: "TESTCASE#26",
      mandatoryVersion: ["V3.0"],
    },
    {
      name: `Test Case 27: V3 Filtering Functionality: Get Filtered List of Footprints by both "status" and "productId" parameters`,
      method: "GET",
      endpoint: `/3/footprints?$status=${footprints.data[0].status}&$productId=${footprints.data[0].productIds[0]}`,
      expectedStatusCodes: [200],
      schema: simpleResponseSchema,
      condition: ({ data }) => {
        return data.every(
          (footprint: { status: string; productIds: string[] }) =>
            footprint.status === footprints.data[0].status &&
            footprint.productIds.includes(footprints.data[0].productIds[0])
        );
      },
      conditionErrorMessage: `One or more footprints do not match the condition: 'status = ${footprints.data[0].status} AND productIds contains ${footprints.data[0].productIds[0]}'`,
      testKey: "TESTCASE#27",
      mandatoryVersion: ["V3.0"],
    },
  ];
};

// implementation of getDateOneDayBefore function
const getDateOneDayBefore = (dateString: string): string => {
  const date = new Date(dateString);
  date.setDate(date.getDate() - 1);
  return date.toISOString();
};

// implementation of getDateOneDayAfter function
const getDateOneDayAfter = (dateString: string): string => {
  const date = new Date(dateString);
  date.setDate(date.getDate() + 1);
  return date.toISOString();
};
