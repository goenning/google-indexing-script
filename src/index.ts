import { getAccessToken } from "./shared/auth";
import {
  convertToSiteUrl,
  getPublishMetadata,
  requestIndexing,
  getEmojiForStatus,
  getPageIndexingStatus,
  convertToFilePath,
} from "./shared/gsc";
import { getSitemapPages } from "./shared/sitemap";
import { Status } from "./shared/types";
import { batch, parseCommandLineArgs } from "./shared/utils";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

const CACHE_TIMEOUT = 1000 * 60 * 60 * 24 * 14; // 14 days

export type IndexOptions = {
  client_email?: string;
  private_key?: string;
  path?: string;
};

export const index = async (
  input: string = process.argv[2],
  options: IndexOptions = {},
) => {
  if (!input) {
    console.error("❌ Please provide a domain or site URL as the first argument.");
    console.error("");
    process.exit(1);
  }

  const args = parseCommandLineArgs(process.argv.slice(2));
  options.client_email = args['client-email'] || process.env.GIS_CLIENT_EMAIL;
  options.private_key = args['private-key'] || process.env.GIS_PRIVATE_KEY;
  options.path = args['path'] || process.env.GIS_PATH;

  const accessToken = await getAccessToken(options.client_email, options.private_key, options.path);
  const siteUrl = convertToSiteUrl(input);
  console.log(`🔎 Processing site: ${siteUrl}`);
  const cachePath = path.join(".cache", `${convertToFilePath(siteUrl)}.json`);

  if (!accessToken) {
    console.error("❌ Failed to get access token, check your service account credentials.");
    console.error("");
    process.exit(1);
  }

  const [sitemaps, pages] = await getSitemapPages(accessToken, siteUrl);

  if (sitemaps.length === 0) {
    console.error("❌ No sitemaps found, add them to Google Search Console and try again.");
    console.error("");
    process.exit(1);
  }

  console.log(`👉 Found ${pages.length} URLs in ${sitemaps.length} sitemap`);

  const statusPerUrl: Record<string, { status: Status; lastCheckedAt: string }> = existsSync(cachePath)
    ? JSON.parse(readFileSync(cachePath, "utf8"))
    : {};
  const pagesPerStatus: Record<Status, string[]> = {
    [Status.SubmittedAndIndexed]: [],
    [Status.DuplicateWithoutUserSelectedCanonical]: [],
    [Status.CrawledCurrentlyNotIndexed]: [],
    [Status.DiscoveredCurrentlyNotIndexed]: [],
    [Status.PageWithRedirect]: [],
    [Status.URLIsUnknownToGoogle]: [],
    [Status.RateLimited]: [],
    [Status.Forbidden]: [],
    [Status.Error]: [],
  };

  const indexableStatuses = [
    Status.DiscoveredCurrentlyNotIndexed,
    Status.CrawledCurrentlyNotIndexed,
    Status.URLIsUnknownToGoogle,
    Status.Forbidden,
    Status.Error,
    Status.RateLimited,
  ];

  const shouldRecheck = (status: Status, lastCheckedAt: string) => {
    const shouldIndexIt = indexableStatuses.includes(status);
    const isOld = new Date(lastCheckedAt) < new Date(Date.now() - CACHE_TIMEOUT);
    return shouldIndexIt || isOld;
  };

  await batch(
    async (url) => {
      let result = statusPerUrl[url];
      if (!result || shouldRecheck(result.status, result.lastCheckedAt)) {
        const status = await getPageIndexingStatus(accessToken, siteUrl, url);
        result = { status, lastCheckedAt: new Date().toISOString() };
        statusPerUrl[url] = result;
      }

      pagesPerStatus[result.status] = pagesPerStatus[result.status] ? [...pagesPerStatus[result.status], url] : [url];
    },
    pages,
    50,
    (batchIndex, batchCount) => {
      console.log(`📦 Batch ${batchIndex + 1} of ${batchCount} complete`);
    }
  );

  console.log(``);
  console.log(`👍 Done, here's the status of all ${pages.length} pages:`);
  mkdirSync(".cache", { recursive: true });
  writeFileSync(cachePath, JSON.stringify(statusPerUrl, null, 2));

  for (const status of Object.keys(pagesPerStatus)) {
    const pages = pagesPerStatus[status as Status];
    if (pages.length === 0) continue;
    console.log(`• ${getEmojiForStatus(status as Status)} ${status}: ${pages.length} pages`);
  }
  console.log("");

  const indexablePages = Object.entries(pagesPerStatus).flatMap(([status, pages]) =>
    indexableStatuses.includes(status as Status) ? pages : []
  );

  if (indexablePages.length === 0) {
    console.log(`✨ There are no pages that can be indexed. Everything is already indexed!`);
  } else {
    console.log(`✨ Found ${indexablePages.length} pages that can be indexed.`);
    indexablePages.forEach((url) => console.log(`• ${url}`));
  }
  console.log(``);

  for (const url of indexablePages) {
    console.log(`📄 Processing url: ${url}`);
    const status = await getPublishMetadata(accessToken, url);
    if (status === 404) {
      await requestIndexing(accessToken, url);
      console.log("🚀 Indexing requested successfully. It may take a few days for Google to process it.");
    } else if (status < 400) {
      console.log(`🕛 Indexing already requested previously. It may take a few days for Google to process it.`);
    }
    console.log(``);
  }

  console.log(`👍 All done!`);
  console.log(`💖 Brought to you by https://seogets.com - SEO Analytics.`);
  console.log(``);
};

export * from "./shared";
