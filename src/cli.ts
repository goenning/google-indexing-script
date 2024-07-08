import { index } from ".";
import { Command } from "commander";
import packageJson from "../package.json";
import { green } from "picocolors";

const program = new Command(packageJson.name);

program
  .alias("gis")
  .version(packageJson.version, "-v, --version", "Output the current version.")
  .description(packageJson.description)
  .argument("[input]")
  .usage(`${green("[input]")} [options]`)
  .helpOption("-h, --help", "Output usage information.")
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
