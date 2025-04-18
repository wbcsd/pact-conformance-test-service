export const fetchFootprints = async (baseUrl: string, accessToken: string) => {
  const footprintsUrl = `${baseUrl}/2/footprints`;
  const response = await fetch(footprintsUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    console.error(
      `Error fetching footprints from ${footprintsUrl}: ${response.status} ${response.statusText}`
    );
    throw new Error(
      `Error fetching footprints from ${footprintsUrl}: ${response.status} ${response.statusText}`
    );
  }

  const responseJson = await response.json();

  if (
    !responseJson.data ||
    !Array.isArray(responseJson.data) ||
    responseJson.data.length === 0
  ) {
    console.error(
      `No footprint data returned from the API. Called ${footprintsUrl}`,
      responseJson
    );
    throw new Error("No footprint data returned from the API");
  }

  return responseJson;
};

export const getLinksHeaderFromFootprints = async (
  baseUrl: string,
  accessToken: string
) => {
  const response = await fetch(`${baseUrl}/2/footprints?limit=1`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const linksHeader = response.headers.get("Link");

  return parseLinkHeader(linksHeader);
};

const parseLinkHeader = (header: string | null): Record<string, string> => {
  if (!header) return {};

  return header.split(", ").reduce<Record<string, string>>((acc, link) => {
    const match = link.match(/<(.*)>;\s*rel="(.*)"/);
    if (match) {
      acc[match[2]] = match[1]; // Store links by their "rel" value
    }
    return acc;
  }, {});
};
