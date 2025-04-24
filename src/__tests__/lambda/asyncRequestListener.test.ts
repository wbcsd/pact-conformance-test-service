// filepath: /home/jose/projects/wbcsd/pact-api-test-service/src/__tests__/lambda/asyncRequestListenerWithNock.test.ts
import { handler } from "../../lambda/asyncRequestListener";
import { APIGatewayProxyEvent } from "aws-lambda";

import * as dbUtils from "../../utils/dbUtils";
import { mockFootprints } from "../mocks/footprints";

// Mock the DB utils
jest.mock("../../utils/dbUtils");

// Mock environment variable
process.env.DYNAMODB_TABLE_NAME = "test-table";

describe("asyncRequestListener Lambda handler with nock", () => {
  // Prepare the APIGatewayProxyEvent mock
  const createEvent = (
    body: any,
    queryParams?: Record<string, string>
  ): APIGatewayProxyEvent => {
    return {
      body: JSON.stringify(body),
      headers: {},
      multiValueHeaders: {},
      httpMethod: "POST",
      isBase64Encoded: false,
      path: "/async-listener",
      pathParameters: null,
      queryStringParameters: queryParams || null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: "",
    };
  };

  // Setup before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should process valid fulfillment event and mark test as successful", async () => {
    // Mock test data that would be retrieved from DB
    const mockTestData = {
      version: "V2.3",
      productIds: ["urn:product-123", "urn:product-456"],
    };

    // Mock DB utility functions
    (dbUtils.getTestData as jest.Mock).mockResolvedValue(mockTestData);
    (dbUtils.saveTestCaseResult as jest.Mock).mockResolvedValue(undefined);

    const currentTime = new Date().toISOString();
    // Valid event fulfillment body that matches the schema requirements
    const validEventBody = {
      id: "123e4567-e89b-12d3-a456-426614174000", // Valid UUID format
      eventId: "123e4567-e89b-12d3-a456-426614174000",
      specversion: "1.0",
      type: "org.wbcsd.pathfinder.ProductFootprintRequest.Fulfilled.v1",
      source: "https://example.com",
      time: currentTime,
      data: {
        requestEventId: "request-123",
        pfs: [
          {
            ...mockFootprints.data[0],
            productIds: mockTestData.productIds,
          },
        ],
      },
    };

    // Create the API Gateway event with query parameters
    const event = createEvent(validEventBody, {
      testRunId: "test-run-123",
      testCaseName: "TESTCASE#12",
    });

    // Call the handler
    const response = await handler(event);

    // Validate the response
    expect(response.statusCode).toBe(200);

    // Verify that getTestData was called correctly
    expect(dbUtils.getTestData).toHaveBeenCalledWith("request-123");

    // Verify that saveTestCaseResult was called with the successful test result
    expect(dbUtils.saveTestCaseResult).toHaveBeenCalledWith(
      "test-run-123",
      expect.objectContaining({
        name: "Test Case 13: Respond to Asynchronous PCF Request",
        status: "SUCCESS",
        success: true,
        mandatory: true,
        testKey: "TESTCASE#13",
      }),
      true
    );
  });

  test("should mark test as failure when product IDs do not match", async () => {
    // Mock test data with different product IDs than what's in the response
    const mockTestData = {
      version: "V2.3",
      productIds: ["urn:different-product-id"],
    };

    // Mock DB utility functions
    (dbUtils.getTestData as jest.Mock).mockResolvedValue(mockTestData);
    (dbUtils.saveTestCaseResult as jest.Mock).mockResolvedValue(undefined);

    // Valid event structure but with different product IDs
    const eventBody = {
      id: "event-id-1234",
      eventId: "event-id-1234",
      specversion: "1.0",
      type: "org.wbcsd.pathfinder.ProductFootprintRequest.Fulfilled.v1",
      source: "https://example.com",
      time: new Date().toISOString(),
      data: {
        requestEventId: "request-123",
        pfs: [
          {
            id: "pf-id-123",
            specVersion: "2.3.0",
            version: "2.3.0",
            created: new Date().toISOString(),
            status: "active",
            comment: "Test comment",
            companyName: "Test Company",
            companyIds: [{ value: "company-123", type: "DUNS" }],
            productDescription: "Test Product",
            productCategoryCpc: "Test Category",
            productNameCompany: "Test Product Name",
            productIds: ["urn:product-123"], // Different from mockTestData
            pcf: {
              declaredUnit: "kg",
              unitaryProductAmount: 1,
              carbonFootprint: {
                value: 10,
              },
            },
            footprint: {
              id: "footprint-123",
              version: "2.3.0",
              status: "active",
              companyName: "Test Company",
              companyIds: [{ value: "company-123", type: "DUNS" }],
              productDescription: "Test Product",
            },
          },
        ],
      },
    };

    // Create the API Gateway event with query parameters
    const event = createEvent(eventBody, {
      testRunId: "test-run-123",
      testCaseName: "TESTCASE#12",
    });

    // Call the handler
    const response = await handler(event);

    // Verify response
    expect(response.statusCode).toBe(200);

    // Verify that saveTestCaseResult was called with a failure result
    expect(dbUtils.saveTestCaseResult).toHaveBeenCalledWith(
      "test-run-123",
      expect.objectContaining({
        name: "Test Case 13: Respond to Asynchronous PCF Request",
        status: "FAILURE",
        success: false,
        mandatory: true,
        testKey: "TESTCASE#13",
        errorMessage: expect.stringContaining("Product IDs do not match"),
      }),
      true
    );
  });

  test("should mark test as failure when event validation fails", async () => {
    // Mock test data
    const mockTestData = {
      version: "V2.3",
      productIds: ["urn:product-123"],
    };

    // Mock DB utility functions
    (dbUtils.getTestData as jest.Mock).mockResolvedValue(mockTestData);
    (dbUtils.saveTestCaseResult as jest.Mock).mockResolvedValue(undefined);

    // Invalid event body (missing required fields but with enough structure to process)
    const invalidEventBody = {
      id: "event-id-1234",
      eventId: "event-id-1234",
      // Missing specversion
      type: "org.wbcsd.pathfinder.ProductFootprintRequest.Fulfilled.v1",
      source: "https://example.com",
      data: {
        requestEventId: "request-123",
        pfs: [
          {
            // Missing most required fields
            productIds: ["urn:product-123"],
          },
        ],
      },
    };

    // Create the API Gateway event with query parameters
    const event = createEvent(invalidEventBody, {
      testRunId: "test-run-123",
      testCaseName: "TESTCASE#12",
    });

    // Call the handler
    const response = await handler(event);

    // Verify response
    expect(response.statusCode).toBe(200);

    // Verify that saveTestCaseResult was called with a failure result due to validation
    expect(dbUtils.saveTestCaseResult).toHaveBeenCalledWith(
      "test-run-123",
      expect.objectContaining({
        name: "Test Case 13: Respond to Asynchronous PCF Request",
        status: "FAILURE",
        success: false,
        mandatory: true,
        testKey: "TESTCASE#13",
        errorMessage: expect.stringContaining("Event validation failed"),
      }),
      true
    );
  });

  test("should return 200 status code even when body is missing", async () => {
    // Create event with no body
    const event = {
      ...createEvent(null),
      body: null,
    };

    // Call the handler
    const response = await handler(event);

    // Verify response is still 200 even though processing didn't happen
    expect(response.statusCode).toBe(200);

    // Verify that getTestData was not called
    expect(dbUtils.getTestData).not.toHaveBeenCalled();
    expect(dbUtils.saveTestCaseResult).not.toHaveBeenCalled();
  });

  test("should return 200 status code even when testRunId is missing", async () => {
    // Create event with body but no testRunId
    const event = createEvent({
      data: { requestEventId: "123" },
    });

    // Call the handler
    const response = await handler(event);

    // Verify response is still 200 even though processing didn't happen
    expect(response.statusCode).toBe(200);

    // Verify that getTestData was not called
    expect(dbUtils.getTestData).not.toHaveBeenCalled();
    expect(dbUtils.saveTestCaseResult).not.toHaveBeenCalled();
  });

  test("should handle errors gracefully and return 200", async () => {
    // Mock DB utility function to throw an error
    (dbUtils.getTestData as jest.Mock).mockRejectedValue(
      new Error("Database error")
    );

    // Valid event body
    const eventBody = {
      eventId: "event-id-1234",
      specversion: "1.0",
      type: "org.wbcsd.pathfinder.ProductFootprintRequest.Fulfilled.v1",
      source: "https://example.com",
      time: new Date().toISOString(),
      data: {
        requestEventId: "request-123",
        pfs: [
          {
            productIds: ["product-123"],
            footprint: {
              id: "footprint-123",
              version: "2.3.0",
            },
          },
        ],
      },
    };

    // Create the API Gateway event with query parameters
    const event = createEvent(eventBody, {
      testRunId: "test-run-123",
      testCaseName: "TESTCASE#12",
    });

    // Call the handler
    const response = await handler(event);

    // Verify response is still 200 even when an error occurs
    expect(response.statusCode).toBe(200);
  });

  test("should do nothing when testCaseName is not TESTCASE#12", async () => {
    // Valid event body
    const eventBody = {
      eventId: "event-id-1234",
      specversion: "1.0",
      type: "org.wbcsd.pathfinder.ProductFootprintRequest.Fulfilled.v1",
      source: "https://example.com",
      time: new Date().toISOString(),
      data: {
        requestEventId: "request-123",
        pfs: [
          {
            productIds: ["product-123"],
            footprint: { id: "footprint-123" },
          },
        ],
      },
    };

    // Create the API Gateway event with a different testCaseName
    const event = createEvent(eventBody, {
      testRunId: "test-run-123",
      testCaseName: "TESTCASE#99", // Not TESTCASE#12
    });

    // Call the handler
    const response = await handler(event);

    // Verify response is 200
    expect(response.statusCode).toBe(200);

    // Verify that DB functions were not called
    expect(dbUtils.getTestData).not.toHaveBeenCalled();
    expect(dbUtils.saveTestCaseResult).not.toHaveBeenCalled();
  });
});
