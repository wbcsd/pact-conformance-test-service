import Ajv from "ajv";
import addFormats from "ajv-formats";
import betterErrors from "ajv-errors";
import { ApiVersion, TestCase, TestResult } from "../types/types";

const isMandatoryVersion = (testCase: TestCase, version: ApiVersion) => {
  if (testCase.mandatoryVersion) {
    return testCase.mandatoryVersion.includes(version);
  }
  return false;
};

/**
 * Generates a curl command representation of the HTTP request
 */
const generateCurlCommand = (
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: string
): string => {
  let curlCmd = `curl -X ${method} '${url}'`;

  // Add headers
  for (const [key, value] of Object.entries(headers)) {
    curlCmd += ` -H '${key}: ${value}'`;
  }

  // Add request body if present
  if (body) {
    curlCmd += ` -d '${body}'`;
  }

  return curlCmd;
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
      curlRequest: "N/A - Missing URL",
    };
  }

  const url = testCase.customUrl || `${baseUrl}${testCase.endpoint}`;

  const options: RequestInit = {
    method: testCase.method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  };

  if (testCase.requestData) {
    options.body =
      typeof testCase.requestData === "string"
        ? testCase.requestData
        : JSON.stringify(testCase.requestData);
  }

  if (testCase.headers) {
    options.headers = {
      ...options.headers,
      ...testCase.headers,
    };
  }

  // Generate curl command before making the actual request
  const headers = options.headers as Record<string, string>;
  const body = options.body as string | undefined;
  const curlCmd = generateCurlCommand(url, testCase.method, headers, body);

  try {
    const response = await fetch(url, options);

    if (
      testCase.expectedStatusCodes &&
      !testCase.expectedStatusCodes.includes(response.status)
    ) {
      return {
        name: testCase.name,
        status: "FAILURE",
        success: false,
        errorMessage: `Expected status [${testCase.expectedStatusCodes.join(
          ","
        )}], but got ${response.status}`,
        mandatory: isMandatoryVersion(testCase, version),
        testKey: testCase.testKey,
        curlRequest: curlCmd,
      };
    }

    const rawResponse = await response.text();

    let responseData;
    responseData = rawResponse.length > 0 ? JSON.parse(rawResponse) : "";

    console.log(`Test response data from ${url}`, responseData);

    // Validate the response JSON using AJV if a schema is provided.
    if (testCase.schema) {
      const ajv = new Ajv({ allErrors: true });
      addFormats(ajv);
      betterErrors(ajv);
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
          curlRequest: curlCmd,
        };
      }
    }

    console.log("Schema validation passed");

    // Run condition if provided
    if (typeof testCase.condition === "function") {
      const conditionPassed = testCase.condition(
        responseData,
        response.headers
      );
      if (!conditionPassed) {
        return {
          name: testCase.name,
          status: "FAILURE",
          success: false,
          errorMessage: testCase.conditionErrorMessage,
          apiResponse: JSON.stringify(responseData),
          mandatory: isMandatoryVersion(testCase, version),
          testKey: testCase.testKey,
          curlRequest: curlCmd,
        };
      }
    }

    return {
      name: testCase.name,
      status: "SUCCESS",
      success: true,
      mandatory: isMandatoryVersion(testCase, version),
      testKey: testCase.testKey,
      curlRequest: curlCmd,
    };
  } catch (error: any) {
    return {
      name: testCase.name,
      status: "FAILURE",
      success: false,
      errorMessage: error.message,
      mandatory: isMandatoryVersion(testCase, version),
      testKey: testCase.testKey,
      curlRequest: curlCmd,
    };
  }
};
