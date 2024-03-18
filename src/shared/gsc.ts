import { Status } from "./types";
import { fetchRetry } from "./utils";

/**
 * Converts a given input string to a valid Google Search Console site URL format.
 * @param input - The input string to be converted.
 * @returns The converted site URL (domain.com or https://domain.com/)
 */
export function convertToSiteUrl(input: string) {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return input.endsWith("/") ? input : `${input}/`;
  }
  return `sc-domain:${input}`;
}

/**
 * Converts a given file path to a formatted version suitable for use as a file name.
 * @param path - The url to be converted as a file name
 * @returns The converted file path
 */
export function convertToFilePath(path: string) {
  return path.replace("http://", "http_").replace("https://", "https_").replace("/", "_");
}

/**
 * Retrieves the indexing status of a page.
 * @param accessToken - The access token for authentication.
 * @param siteUrl - The URL of the site.
 * @param inspectionUrl - The URL of the page to inspect.
 * @returns A promise resolving to the status of indexing.
 */
export async function getPageIndexingStatus(
  accessToken: string,
  siteUrl: string,
  inspectionUrl: string
): Promise<Status> {
  try {
    const response = await fetchRetry(`https://searchconsole.googleapis.com/v1/urlInspection/index:inspect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        inspectionUrl,
        siteUrl,
      }),
    });

    if (response.status === 403) {
      console.error(`🔐 This service account doesn't have access to this site.`);
      console.error(await response.text());

      return Status.Forbidden;
    }

    if (response.status >= 300) {
      if (response.status === 429) {
        return Status.RateLimited;
      } else {
        console.error(`❌ Failed to get indexing status.`);
        console.error(`Response was: ${response.status}`);
        console.error(await response.text());

        return Status.Error;
      }
    }

    const body = await response.json();
    return body.inspectionResult.indexStatusResult.coverageState;
  } catch (error) {
    console.error(`❌ Failed to get indexing status.`);
    console.error(`Error was: ${error}`);
    throw error;
  }
}

/**
 * Retrieves an emoji representation corresponding to the given status.
 * @param status - The status for which to retrieve the emoji.
 * @returns The emoji representing the status.
 */
export function getEmojiForStatus(status: Status) {
  switch (status) {
    case Status.SubmittedAndIndexed:
      return "✅";
    case Status.DuplicateWithoutUserSelectedCanonical:
      return "😵";
    case Status.CrawledCurrentlyNotIndexed:
    case Status.DiscoveredCurrentlyNotIndexed:
      return "👀";
    case Status.PageWithRedirect:
      return "🔀";
    case Status.URLIsUnknownToGoogle:
      return "❓";
    case Status.RateLimited:
      return "🚦";
    default:
      return "❌";
  }
}

/**
 * Retrieves metadata for publishing from the given URL.
 * @param accessToken - The access token for authentication.
 * @param url - The URL for which to retrieve metadata.
 * @returns The status of the request.
 */
export async function getPublishMetadata(accessToken: string, url: string) {
  const response = await fetchRetry(
    `https://indexing.googleapis.com/v3/urlNotifications/metadata?url=${encodeURIComponent(url)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (response.status === 403) {
    console.error(`🔐 This service account doesn't have access to this site.`);
    console.error(`Response was: ${response.status}`);
    console.error(await response.text());
  }

  if (response.status === 429) {
    console.error("🚦 Rate limit exceeded, try again later.");
    console.error("");
    console.error("   Quota: https://developers.google.com/search/apis/indexing-api/v3/quota-pricing#quota");
    console.error("   Usage: https://console.cloud.google.com/apis/enabled");
    console.error("");
    process.exit(1);
  }

  if (response.status >= 500) {
    console.error(`❌ Failed to get publish metadata.`);
    console.error(`Response was: ${response.status}`);
    console.error(await response.text());
  }

  return response.status;
}

/**
 * Requests indexing for the given URL.
 * @param accessToken - The access token for authentication.
 * @param url - The URL to be indexed.
 */
export async function requestIndexing(accessToken: string, url: string) {
  const response = await fetchRetry("https://indexing.googleapis.com/v3/urlNotifications:publish", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      url: url,
      type: "URL_UPDATED",
    }),
  });

  if (response.status === 403) {
    console.error(`🔐 This service account doesn't have access to this site.`);
    console.error(`Response was: ${response.status}`);
  }

  if (response.status >= 300) {
    if (response.status === 429) {
      console.error("🚦 Rate limit exceeded, try again later.");
      console.error("");
      console.error("   Quota: https://developers.google.com/search/apis/indexing-api/v3/quota-pricing#quota");
      console.error("   Usage: https://console.cloud.google.com/apis/enabled");
      console.error("");
      process.exit(1);
    } else {
      console.error(`❌ Failed to request indexing.`);
      console.error(`Response was: ${response.status}`);
      console.error(await response.text());
    }
  }
}
