import { randomUUID } from "crypto";
import { TestCaseNames, TestRun } from "../types/types";

export const getDefaultTestRun = (): TestRun => {
  return {
    testId: randomUUID(),
    timestamp: Date.now(),
    testCases: [
      {
        name: TestCaseNames.AUTHENTICATE_WITH_INCORRECT_CREDENTIALS,
        status: "PENDING",
      },
    ],
  };
};
