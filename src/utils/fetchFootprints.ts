export const fetchFootprints = async (baseUrl: string, accessToken: string) =>
  await fetch(`${baseUrl}/2/footprints`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }).then((response) => response.json());
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
