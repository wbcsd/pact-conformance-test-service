// Import schemas from version-specific files
import {
  v2_0_ResponseSchema,
  v2_0_productFootprintSchema,
} from "./v2_0_schema";
import {
  v2_1_ResponseSchema,
  v2_1_productFootprintSchema,
} from "./v2_1_schema";
import {
  v2_2_ResponseSchema,
  v2_2_productFootprintSchema,
} from "./v2_2_schema";
import {
  v2_3_ResponseSchema,
  v2_3_productFootprintSchema,
  eventFulfilledSchema,
} from "./v2_3_schema";
import {
  v3_0_ResponseSchema,
  v3_0_productFootprintSchema,
  v3_0_EventFulfilledSchema,
} from "./v3_0_schema";

// Simple response schemas for general use
export const simpleResponseSchema = {
  type: "object",
  properties: {
    data: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
        },
        required: ["id"],
      },
    },
  },
  required: ["data"],
};

export const simpleSingleFootprintResponseSchema = {
  type: "object",
  properties: {
    data: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
      required: ["id"],
    },
  },
  required: ["data"],
};

// Re-export all schemas
export {
  v2_0_ResponseSchema,
  v2_0_productFootprintSchema,
  v2_1_ResponseSchema,
  v2_1_productFootprintSchema,
  v2_2_ResponseSchema,
  v2_2_productFootprintSchema,
  v2_3_ResponseSchema,
  v2_3_productFootprintSchema,
  eventFulfilledSchema,
  v3_0_ResponseSchema,
  v3_0_productFootprintSchema,
  v3_0_EventFulfilledSchema,
};
