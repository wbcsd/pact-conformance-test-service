export interface TestRun {
  testId: string;
  timestamp: number;
  testCases: TestCaseResult[];
}
interface TestCaseResult {
  name: string;
  status: string;
  message?: string;
}
export enum TestCaseNames {
  AUTHENTICATE_WITH_INCORRECT_CREDENTIALS = "Authenticate with incorrect credentials",
}

// Constants for test run status
export enum TestRunStatus {
  PASS = "PASS",
  FAIL = "FAIL",
  PENDING = "PENDING",
}

export interface TestCase {
  name: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  endpoint?: string;
  expectedStatusCodes: number[];
  schema?: object;
  requestData?: any;
  condition?: (response: any) => boolean;
  conditionErrorMessage?: string;
  headers?: Record<string, string>;
  customUrl?: string;
  mandatoryVersion?: ApiVersion[];
  testKey: string;
}
export interface TestResult {
  name: string;
  success: boolean;
  status: "PENDING" | "SUCCESS" | "FAILURE";
  errorMessage?: string;
  apiResponse?: string;
  mandatory: boolean;
  testKey: string;
  curlRequest?: string;
}

export type ApiVersion = "V2.0" | "V2.1" | "V2.2" | "V2.3";
