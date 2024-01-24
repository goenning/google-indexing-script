# Google Indexing Script

Use this script to get your entire site indexed on Google in less than 48 hours. No tricks, no hacks, just a simple script and a Google API.

You can read more about the motivation behind it and how it works on this blog post https://seogets.com/blog/google-indexing-script

> [!IMPORTANT]  
> This script uses [Google Indexing API](https://developers.google.com/search/apis/indexing-api/v3/quickstart). While there is no absolute guarantee that every page will be indexed, recent tests conducted in December 2023 have shown a notably high success rate.

## Requirements

- Install [Node.js](https://nodejs.org/en/download)
- An account on [Google Search Console](https://search.google.com/search-console/about) with the verified sites you want to index
- An account on [Google Cloud](https://console.cloud.google.com/)

## Preparation

1. Download or clone this repository
2. Follow this [guide](https://developers.google.com/search/apis/indexing-api/v3/prereqs) from Google. By the end of it, you should have a project on Google Cloud with the Indexing API enabled, a service account with the `Owner` permission on your sites.
3. Make sure you enable both `Google Search Console API` and `Web Search Indexing API` on your [Google Project ➤ API Services ➤ Enabled API & Services](https://console.cloud.google.com/apis/dashboard).
4. Download the JSON file with the credentials of the service account and save it in the same folder as the script. The file should be named `service_account.json`

## Usage

1. Open a terminal and navigate to the folder where you cloned repository
2. Run `npm install` to install the dependencies
3. Run `npm run index <domain>` to index all the pages of your site. Replace `<domain>` with your site domain. For example, if your site is `https://seogets.com`, you should run `node run index seogets.com`

Here's an example of what you should expect:

![](./output.png)

**Important Notes:**

- Your site must have 1 or more sitemaps submitted to Google Search Console. Otherwise, the script will not be able to find the pages to index.
- You can run the script as many times as you want. It will only index the pages that are not already indexed.
- Sites with a large number of pages might take a while to index, be patient.

## 📄 License

MIT License
