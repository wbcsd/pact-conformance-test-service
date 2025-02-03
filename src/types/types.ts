export interface TestRun {
  testId: string;
  timestamp: number;
  testCases: TestCase[];
}
interface TestCase {
  name: string;
  status: string;
  message?: string;
}
export enum TestCaseNames {
  AUTHENTICATE_WITH_INCORRECT_CREDENTIALS = "Authenticate with incorrect credentials",
}
