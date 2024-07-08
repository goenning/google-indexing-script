const { index } = require(".");
const { Command } = require("commander");
const packageJson = require("../package.json");
const { green } = require("picocolors");

const program = new Command();

program
  .version(packageJson.version, "-v, --version")
  .argument("[input]")
  .usage(`${green("[input]")} [options]`)
  .option("-c, --client-email <email>", "The client email for the Google service account.")
  .option("-k, --private-key <key>", "The private key for the Google service account.")
  .option("-p, --path <path>", "The path to the Google service account credentials file.")
  .option("-u, --urls <urls>", "A comma-separated list of URLs to index.")
  .option("--rpm-retry", "Retry when the rate limit is exceeded.")
  .action((input, options) => {
    index(input, {
      client_email: options.clientEmail,
      private_key: options.privateKey,
      path: options.path,
      urls: options.urls ? options.urls.split(",") : undefined,
      quota: {
        rpmRetry: options.rpmRetry,
      },
    });
  })
  .parse(process.argv);
