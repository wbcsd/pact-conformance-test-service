const randomString = (length: number) => {
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
