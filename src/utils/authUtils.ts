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
  let incorrectUserName = randomString(16);
  let incorrectPassword = randomString(16);
  let incorrectAuthHeaders = {
    host: host,
    accept: "application/json",
    "content-type": "application/x-www-form-urlencoded",
    authorization:
      "Basic " +
      Buffer.from(incorrectUserName + ":" + incorrectPassword).toString(
        "base64"
      ),
  };
  return incorrectAuthHeaders;
};
