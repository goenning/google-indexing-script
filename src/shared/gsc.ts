import { webmasters_v3 } from "googleapis";
import { QUOTA } from "..";
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
  return path.replace("http://", "http_").replace("https://", "https_").replaceAll("/", "_");
}

/**
 * Converts an HTTP URL to a sc-domain URL format.
 * @param httpUrl The HTTP URL to be converted.
 * @returns The sc-domain formatted URL.
 */
export function convertToSCDomain(httpUrl: string) {
  return `sc-domain:${httpUrl.replace("http://", "").replace("https://", "").replace("/", "")}`;
}

/**
 * Converts a domain to an HTTP URL.
 * @param domain The domain to be converted.
 * @returns The HTTP URL.
 */
export function convertToHTTP(domain: string) {
  return `http://${domain}/`;
}

/**
 * Converts a domain to an HTTPS URL.
 * @param domain The domain to be converted.
 * @returns The HTTPS URL.
 */
export function convertToHTTPS(domain: string) {
  return `https://${domain}/`;
}

/**
 * Retrieves a list of sites associated with the specified service account from the Google Webmasters API.
 * @param accessToken - The access token for authentication.
 * @returns An array containing the site URLs associated with the service account.
 */
export async function getSites(accessToken: string) {
  const sitesResponse = await fetchRetry("https://www.googleapis.com/webmasters/v3/sites", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (sitesResponse.status === 403) {
    console.error("🔐 This service account doesn't have access to any sites.");
    return [];
  }

  const sitesBody: webmasters_v3.Schema$SitesListResponse = await sitesResponse.json();

  if (!sitesBody.siteEntry) {
    console.error("❌ No sites found, add them to Google Search Console and try again.");
    return [];
  }

  return sitesBody.siteEntry.map((x) => x.siteUrl);
}

/**
 * Checks if the site URL is valid and accessible by the service account.
 * @param accessToken - The access token for authentication.
 * @param siteUrl - The URL of the site to check.
 * @returns The corrected URL if found, otherwise the original site URL.
 */
export async function checkSiteUrl(accessToken: string, siteUrl: string) {
  const sites = await getSites(accessToken);
  let formattedUrls: string[] = [];

  // Convert the site URL into all possible formats
  if (siteUrl.startsWith("https://")) {
    formattedUrls.push(siteUrl);
    formattedUrls.push(convertToHTTP(siteUrl.replace("https://", "")));
    formattedUrls.push(convertToSCDomain(siteUrl));
  } else if (siteUrl.startsWith("http://")) {
    formattedUrls.push(siteUrl);
    formattedUrls.push(convertToHTTPS(siteUrl.replace("http://", "")));
    formattedUrls.push(convertToSCDomain(siteUrl));
  } else if (siteUrl.startsWith("sc-domain:")) {
    formattedUrls.push(siteUrl);
    formattedUrls.push(convertToHTTP(siteUrl.replace("sc-domain:", "")));
    formattedUrls.push(convertToHTTPS(siteUrl.replace("sc-domain:", "")));
  } else {
    console.error("❌ Unknown site URL format.");
    console.error("");
    process.exit(1);
  }

  // Check if any of the formatted URLs are accessible
  for (const formattedUrl of formattedUrls) {
    if (sites.includes(formattedUrl)) {
      return formattedUrl;
    }
  }

  // If none of the formatted URLs are accessible
  console.error("❌ This service account doesn't have access to this site.");
  console.error("");
  process.exit(1);
}

/**
 * Checks if the given URLs are valid.
 * @param siteUrl - The URL of the site.
 * @param urls - The URLs to check.
 * @returns An array containing the corrected URLs if found, otherwise the original URLs
 */
export function checkCustomUrls(siteUrl: string, urls: string[]) {
  const protocol = siteUrl.startsWith("http://") ? "http://" : "https://";
  const domain = siteUrl.replace("https://", "").replace("http://", "").replace("sc-domain:", "");
  const formattedUrls: string[] = urls.map((url) => {
    url = url.trim();
    if (url.startsWith("/")) {
      // the url is a relative path (e.g. /about)
      return `${protocol}${domain}${url}`;
    } else if (url.startsWith("http://") || url.startsWith("https://")) {
      // the url is already a full url (e.g. https://domain.com/about)
      return url;
    } else if (url.startsWith(domain)) {
      // the url is a full url without the protocol (e.g. domain.com/about)
      return `${protocol}${url}`;
    } else {
      // the url is a relative path without the leading slash (e.g. about)
      return `${protocol}${domain}/${url}`;
    }
  });

  return formattedUrls;
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
 * @param options - The options for the request.
 * @returns The status of the request.
 */
export async function getPublishMetadata(accessToken: string, url: string, options?: { retriesOnRateLimit: number }) {
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
    if (options?.retriesOnRateLimit && options?.retriesOnRateLimit > 0) {
      const RPM_WATING_TIME = (QUOTA.rpm.retries - options.retriesOnRateLimit + 1) * QUOTA.rpm.waitingTime; // increase waiting time for each retry
      console.log(
        `🚦 Rate limit exceeded for read requests. Retries left: ${options.retriesOnRateLimit}. Waiting for ${
          RPM_WATING_TIME / 1000
        }sec.`
      );
      await new Promise((resolve) => setTimeout(resolve, RPM_WATING_TIME));
      await getPublishMetadata(accessToken, url, { retriesOnRateLimit: options.retriesOnRateLimit - 1 });
    } else {
      console.error("🚦 Rate limit exceeded, try again later.");
      console.error("");
      console.error("   Quota: https://developers.google.com/search/apis/indexing-api/v3/quota-pricing#quota");
      console.error("   Usage: https://console.cloud.google.com/apis/enabled");
      console.error("");
      process.exit(1);
    }
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
