export interface TokenResponse {
  token: string;
}

export const randomString = (length: number) => {
  let variation =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let string = "";
  for (let i = 0; i < length; i++) {
    string += variation[Math.floor(Math.random() * variation.length)];
  }
  return string;
};

export const getIncorrectAuthHeaders = (host: string) => {
  const incorrectUserName = randomString(16);
  const incorrectPassword = randomString(16);
  const incorrectAuthHeaders = {
    host: host,
    accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization:
      "Basic " +
      Buffer.from(incorrectUserName + ":" + incorrectPassword).toString(
        "base64"
      ),
  };
  return incorrectAuthHeaders;
};

export const getCorrectAuthHeaders = (
  host: string,
  clientId: string,
  clientSecret: string
) => {
  let authHeaders = {
    host: host,
    Accept: "application/json",
    "content-type": "application/x-www-form-urlencoded",
    Authorization:
      "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
  };
  return authHeaders;
};

/**
 * Retrieves an access token from the authentication endpoint.
 */
export const getAccessToken = async (
  baseUrl: string,
  clientId: string,
  clientSecret: string,
  customAuthUrl?: string
): Promise<string> => {
  const url = customAuthUrl || `${baseUrl}/auth/token`;

  const encodedCredentials = Buffer.from(
    `${clientId}:${clientSecret}`
  ).toString("base64");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${encodedCredentials}`,
    },
    body: "",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to obtain access token. Status: ${response.status}`
    );
  }

  const data: TokenResponse = await response.json();
  if (!data.token) {
    throw new Error("Access token not present in response");
  }
  return data.token;
};

// Get token_endpoint from .well-known endpoint
export const getOidAuthUrl = async (
  baseUrl: string
): Promise<string | undefined> => {
  try {
    const response = await fetch(`${baseUrl}/.well-known/openid-configuration`);
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    return data.token_endpoint;
  } catch (error) {
    return;
  }
};
