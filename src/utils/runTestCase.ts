import Ajv from "ajv";
import addFormats from "ajv-formats";
import { ApiVersion, TestCase, TestResult } from "../types/types";

const isMandatoryVersion = (testCase: TestCase, version: ApiVersion) => {
  if (testCase.mandatoryVersion) {
    return testCase.mandatoryVersion.includes(version);
  }
  return false;
};

/**
 * Runs an individual test case against the API.
 * Validates both the HTTP status and the JSON response against a provided schema.
 */
export const runTestCase = async (
  baseUrl: string,
  testCase: TestCase,
  accessToken: string,
  version: ApiVersion
): Promise<TestResult> => {
  if (!testCase.endpoint && !testCase.customUrl) {
    return {
      name: testCase.name,
      status: "FAILURE",
      success: false,
      errorMessage: "Either endpoint or customUrl must be provided",
      mandatory: isMandatoryVersion(testCase, version),
      testKey: testCase.testKey,
    };
  }

  const url = testCase.customUrl || `${baseUrl}${testCase.endpoint}`;

  // TODO: the case is about refusing the request, tighten the implementation later
  // ... just replace https with http in the request and expect an error code
  if (testCase.ensureHttps && !url.startsWith("https://")) {
    return {
      name: testCase.name,
      status: "FAILURE",
      success: false,
      errorMessage: `HTTPS is required for this endpoint, but the URL is ${url}`,
      mandatory: isMandatoryVersion(testCase, version),
      testKey: testCase.testKey,
    };
  }

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

    if (!testCase.expectedStatusCodes.includes(response.status)) {
      return {
        name: testCase.name,
        status: "FAILURE",
        success: false,
        errorMessage: `Expected status [${testCase.expectedStatusCodes.join(
          ","
        )}], but got ${response.status}`,
        mandatory: isMandatoryVersion(testCase, version),
        testKey: testCase.testKey,
      };
    }

    // Parse the response as JSON.
    const responseData = await response.json();

    console.log(`Test response data from ${url}`, responseData);

    // Validate the response JSON using AJV if a schema is provided.
    if (testCase.schema) {
      const ajv = new Ajv({ allErrors: true });
      addFormats(ajv);
      const validate = ajv.compile(testCase.schema);
      const valid = validate(responseData);
      if (!valid) {
        console.log("Schema validation failed:", validate.errors);
        return {
          name: testCase.name,
          success: false,
          status: "FAILURE",
          errorMessage: `Schema validation failed: ${JSON.stringify(
            validate.errors
          )}`,
          apiResponse: JSON.stringify(responseData),
          mandatory: isMandatoryVersion(testCase, version),
          testKey: testCase.testKey,
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
          status: "FAILURE",
          success: false,
          errorMessage: testCase.conditionErrorMessage,
          apiResponse: JSON.stringify(responseData),
          mandatory: isMandatoryVersion(testCase, version),
          testKey: testCase.testKey,
        };
      }
    }

    return {
      name: testCase.name,
      status: "SUCCESS",
      success: true,
      mandatory: isMandatoryVersion(testCase, version),
      testKey: testCase.testKey,
    };
  } catch (error: any) {
    return {
      name: testCase.name,
      status: "FAILURE",
      success: false,
      errorMessage: error.message,
      mandatory: isMandatoryVersion(testCase, version),
      testKey: testCase.testKey,
    };
  }
};
