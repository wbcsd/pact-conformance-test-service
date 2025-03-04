import Ajv from "ajv";
import addFormats from "ajv-formats";
import { TestCase, TestResult } from "../types/types";

/**
 * Runs an individual test case against the API.
 * Validates both the HTTP status and the JSON response against a provided schema.
 */
export const runTestCase = async (
  baseUrl: string,
  testCase: TestCase,
  accessToken: string
): Promise<TestResult> => {
  if (!testCase.endpoint && !testCase.customUrl) {
    return {
      name: testCase.name,
      success: false,
      error: "Either endpoint or customUrl must be provided",
    };
  }

  const url = testCase.customUrl || `${baseUrl}${testCase.endpoint}`;
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
};
