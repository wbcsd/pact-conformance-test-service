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

interface Footprint {
  id: string;
  productIds: string[];
  companyIds: string[];
  pcf: {
    geographyCountry: string;
  };
  productClassifications: string[];
  validityPeriodStart: string;
  validityPeriodEnd: string;
  status: string;
}

interface FootprintsData {
  data: Footprint[];
}

const getFilterParameters = (footprints: FootprintsData) => {
  if (!footprints.data?.[0]) {
    throw new Error(
      "Invalid footprints data: Missing required data structure. Please check the API response."
    );
  }

  const firstFootprint = footprints.data[0];

  // TODO validate required params are present

  return {
    productId: firstFootprint.productIds[0],
    productIds: firstFootprint.productIds,
    companyId: firstFootprint.companyIds[0],
    geography: firstFootprint.pcf.geographyCountry || "",
    classification: firstFootprint.productClassifications
      ? firstFootprint.productClassifications[0]
      : "",
    validOn: firstFootprint.validityPeriodStart,
    validAfter: getDateOneDayBefore(firstFootprint.validityPeriodStart),
    validBefore: getDateOneDayAfter(firstFootprint.validityPeriodEnd),
    status: firstFootprint.status,
    id: firstFootprint.id,
  };
};

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
  const responseSchema = (() => {
    switch (version) {
      case "V3.0":
        return v3_0_ResponseSchema;
      default:
        return v3_0_ResponseSchema; // Default to latest if unknown
    }
  })();

  const filterParams = getFilterParameters(footprints);

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
      endpoint: `/3/footprints/${filterParams.id}`,
      expectedStatusCodes: [200],
      schema: simpleSingleFootprintResponseSchema,
      condition: ({ data }) => {
        return data.id === filterParams.id;
      },
      conditionErrorMessage: `Returned footprint does not match the requested footprint with id ${filterParams.id}`,
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
      endpoint: `/3/footprints/${filterParams.id}`,
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
      headers: getCorrectAuthHeaders(baseUrl, clientId, clientSecret),
      mandatoryVersion: ["V3.0"],
      testKey: "TESTCASE#9",
      requestData: "grant_type=client_credentials",
      condition: (response) => {
        return !response.data && !response.access_token;
      },
      conditionErrorMessage:
        "Expected response to not include data or access_token property",
    },
    {
      name: "Test Case 10: Attempt ListFootprints through HTTP (non-HTTPS)",
      method: "GET",
      customUrl: `${baseUrl.replace("https", "http")}/3/footprints`,
      mandatoryVersion: ["V3.0"],
      testKey: "TESTCASE#10",
      condition: (response) => {
        return !response.data;
      },
      conditionErrorMessage: "Expected response to not include data property",
    },
    {
      name: "Test Case 11: Attempt GetFootprint through HTTP (non-HTTPS)",
      method: "GET",
      customUrl: `${baseUrl.replace("https", "http")}/3/footprints/${
        filterParams.id
      }`,
      mandatoryVersion: ["V3.0"],
      testKey: "TESTCASE#11",
      condition: (response) => {
        return !response.data;
      },
      conditionErrorMessage: "Expected response to not include data property",
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
            productIds: filterParams.productIds,
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
      name: "Test Case 15: Receive Notification of PCF Update (Published Event)",
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
      testKey: "TESTCASE#15",
    },
    {
      name: "Test Case 16: Attempt Action Events with Invalid Token",
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
      testKey: "TESTCASE#16",
    },
    {
      name: "Test Case 17: Attempt Action Events through HTTP (non-HTTPS)",
      method: "POST",
      customUrl: `${baseUrl.replace("https", "http")}/3/events`,
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
      testKey: "TESTCASE#17",
      condition: (response) => {
        return !response.data;
      },
      conditionErrorMessage: "Expected response to not include data property",
    },
    {
      name: "Test Case 18: OpenId Connect-based Authentication Flow",
      method: "POST",
      customUrl: oidAuthUrl || undefined,
      expectedStatusCodes: [200],
      headers: getCorrectAuthHeaders(baseUrl, clientId, clientSecret),
      testKey: "TESTCASE#18",
      requestData: "grant_type=client_credentials",
      mandatoryVersion: ["V3.0"],
    },
    {
      name: "Test Case 19: OpenId connect-based authentication flow with incorrect credentials",
      method: "POST",
      customUrl: oidAuthUrl || undefined,
      expectedStatusCodes: [400, 401],
      headers: getIncorrectAuthHeaders(baseUrl),
      testKey: "TESTCASE#19",
      requestData: "grant_type=client_credentials",
      mandatoryVersion: ["V3.0"],
    },
    {
      name: `Test Case 20: V3 Filtering Functionality: Get Filtered List of Footprints by "productId" parameter`,
      method: "GET",
      endpoint: `/3/footprints?$productId=${filterParams.productId}`,
      expectedStatusCodes: [200],
      schema: simpleResponseSchema,
      condition: ({ data }) => {
        return data.every((footprint: { productIds: string[] }) =>
          footprint.productIds.includes(filterParams.productId)
        );
      },
      conditionErrorMessage: `One or more footprints do not match the condition: 'productIds contains ${filterParams.productId}'`,
      testKey: "TESTCASE#20",
      mandatoryVersion: ["V3.0"],
    },
    {
      name: `Test Case 21: V3 Filtering Functionality: Get Filtered List of Footprints by "companyId" parameter`,
      method: "GET",
      endpoint: `/3/footprints?$companyId=${filterParams.companyId}`,
      expectedStatusCodes: [200],
      schema: simpleResponseSchema,
      condition: ({ data }) => {
        return data.every((footprint: { companyIds: string[] }) =>
          footprint.companyIds.includes(filterParams.companyId)
        );
      },
      conditionErrorMessage: `One or more footprints do not match the condition: 'companyIds contains ${filterParams.companyId}'`,
      testKey: "TESTCASE#21",
      mandatoryVersion: ["V3.0"],
    },
    {
      name: `Test Case 22: V3 Filtering Functionality: Get Filtered List of Footprints by "geography" parameter`,
      method: "GET",
      endpoint: `/3/footprints?$geography=${filterParams.geography}`,
      expectedStatusCodes: [200],
      schema: simpleResponseSchema,
      condition: ({ data }) => {
        return data.every(
          (footprint: { pcf: { geographyCountry: string } }) =>
            footprint.pcf.geographyCountry === filterParams.geography
        );
      },
      conditionErrorMessage: `One or more footprints do not match the condition: 'pcf.geographyCountry = ${filterParams.geography}'`,
      testKey: "TESTCASE#22",
      mandatoryVersion: ["V3.0"],
    },
    {
      name: `Test Case 23: V3 Filtering Functionality: Get Filtered List of Footprints by "classification" parameter`,
      method: "GET",
      endpoint: `/3/footprints?$classification=${filterParams.classification}`,
      expectedStatusCodes: [200],
      schema: simpleResponseSchema,
      condition: ({ data }) => {
        return data.every((footprint: { productClassifications: string[] }) =>
          footprint.productClassifications.includes(filterParams.classification)
        );
      },
      conditionErrorMessage: `One or more footprints do not match the condition: 'productClassifications contains ${filterParams.classification}'`,
      testKey: "TESTCASE#23",
      mandatoryVersion: ["V3.0"],
    },
    {
      name: `Test Case 24: V3 Filtering Functionality: Get Filtered List of Footprints by "validOn" parameter`,
      method: "GET",
      endpoint: `/3/footprints?$validOn=${filterParams.validOn}`,
      expectedStatusCodes: [200],
      schema: simpleResponseSchema,
      condition: ({ data }) => {
        return data.every(
          (footprint: {
            validityPeriodStart: string;
            validityPeriodEnd: string;
          }) =>
            new Date(footprint.validityPeriodStart) <=
              new Date(filterParams.validOn) &&
            new Date(footprint.validityPeriodEnd) >=
              new Date(filterParams.validOn)
        );
      },
      conditionErrorMessage: `One or more footprints do not match the condition: 'validityPeriodStart <= ${filterParams.validOn} <= validityPeriodEnd'`,
      testKey: "TESTCASE#24",
      mandatoryVersion: ["V3.0"],
    },
    {
      name: `Test Case 25: V3 Filtering Functionality: Get Filtered List of Footprints by "validAfter" parameter`,
      method: "GET",
      endpoint: `/3/footprints?$validAfter=${filterParams.validAfter}`,
      expectedStatusCodes: [200],
      schema: simpleResponseSchema,
      condition: ({ data }) => {
        return data.every(
          (footprint: { validityPeriodStart: string }) =>
            new Date(footprint.validityPeriodStart) >
            new Date(filterParams.validAfter)
        );
      },
      conditionErrorMessage: `One or more footprints do not match the condition: 'validityPeriodStart > ${filterParams.validAfter}'`,
      testKey: "TESTCASE#25",
      mandatoryVersion: ["V3.0"],
    },
    {
      name: `Test Case 26: V3 Filtering Functionality: Get Filtered List of Footprints by "validBefore" parameter`,
      method: "GET",
      endpoint: `/3/footprints?$validBefore=${filterParams.validBefore}`,
      expectedStatusCodes: [200],
      schema: simpleResponseSchema,
      condition: ({ data }) => {
        return data.every(
          (footprint: { validityPeriodEnd: string }) =>
            new Date(footprint.validityPeriodEnd) <
            new Date(filterParams.validBefore)
        );
      },
      conditionErrorMessage: `One or more footprints do not match the condition: 'validityPeriodEnd < ${filterParams.validBefore}'`,
      testKey: "TESTCASE#26",
      mandatoryVersion: ["V3.0"],
    },
    {
      name: `Test Case 27: V3 Filtering Functionality: Get Filtered List of Footprints by "status" parameter`,
      method: "GET",
      endpoint: `/3/footprints?$status=${filterParams.status}`,
      expectedStatusCodes: [200],
      schema: simpleResponseSchema,
      condition: ({ data }) => {
        return data.every(
          (footprint: { status: string }) =>
            footprint.status === filterParams.status
        );
      },
      conditionErrorMessage: `One or more footprints do not match the condition: 'status = ${filterParams.status}'`,
      testKey: "TESTCASE#27",
      mandatoryVersion: ["V3.0"],
    },
    {
      name: `Test Case 28: V3 Filtering Functionality: Get Filtered List of Footprints by both "status" and "productId" parameters`,
      method: "GET",
      endpoint: `/3/footprints?$status=${filterParams.status}&$productId=${filterParams.productId}`,
      expectedStatusCodes: [200],
      schema: simpleResponseSchema,
      condition: ({ data }) => {
        return data.every(
          (footprint: { status: string; productIds: string[] }) =>
            footprint.status === filterParams.status &&
            footprint.productIds.includes(filterParams.productId)
        );
      },
      conditionErrorMessage: `One or more footprints do not match the condition: 'status = ${filterParams.status} AND productIds contains ${filterParams.productId}'`,
      testKey: "TESTCASE#28",
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
