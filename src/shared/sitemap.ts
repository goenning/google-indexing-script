import Sitemapper from "sitemapper";
import { fetchRetry } from "./utils";
import { webmasters_v3 } from "googleapis";

async function getSitemapsList(accessToken: string, siteUrl: string) {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps`;

  const response = await fetchRetry(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 403) {
    console.error(`🔐 This service account doesn't have access to this site.`);
    return [];
  }

  if (response.status >= 300) {
    console.error(`❌ Failed to get list of sitemaps.`);
    console.error(`Response was: ${response.status}`);
    console.error(await response.text());
    return [];
  }

  const body: webmasters_v3.Schema$SitemapsListResponse = await response.json();

  if (!body.sitemap) {
    console.error("❌ No sitemaps found, add them to Google Search Console and try again.");
    return [];
  }

  return body.sitemap.filter((x) => x.path !== undefined && x.path !== null).map((x) => x.path as string);
}

export async function getSitemapPages(accessToken: string, siteUrl: string) {
  const sitemaps = await getSitemapsList(accessToken, siteUrl);

  let pages: string[] = [];
  for (const url of sitemaps) {
    const Google = new Sitemapper({
      url,
    });

    const { sites } = await Google.fetch();
    pages = [...pages, ...sites];
  }

  return [sitemaps, [...new Set(pages)]];
}
