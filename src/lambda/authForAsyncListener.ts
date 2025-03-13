import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const authHeader = event.headers.Authorization || event.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "BadRequest" }),
    };
  }

  const base64Credentials = authHeader.slice("Basic ".length).trim();
  const credentials = Buffer.from(base64Credentials, "base64").toString("utf8");
  const [clientId, clientSecret] = credentials.split(":");

  if (clientId !== "test_client_id" || clientSecret !== "test_client_secret") {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "BadRequest" }),
    };
  }

  const token = jwt.sign({ clientId }, JWT_SECRET, { expiresIn: "1h" });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  };
};
