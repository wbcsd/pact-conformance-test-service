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
export interface TestCase {
  name: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  endpoint?: string;
  expectedStatusCode: number;
  schema?: object;
  requestData?: any;
  condition?: (response: any) => boolean;
  conditionErrorMessage?: string;
  headers?: Record<string, string>;
  customUrl?: string;
}
export interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  apiResponse?: string;
}
