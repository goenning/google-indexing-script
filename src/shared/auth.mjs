import { google } from "googleapis";
import { existsSync, readFileSync } from "fs";

export async function getAccessToken() {
  if (!existsSync("./service_account.json")) {
    console.error("❌ service_account.json not found, please follow the instructions in README.md");
    console.error("");
    process.exit(1);
  }

  const key = JSON.parse(readFileSync("./service_account.json", "utf8"));
  const jwtClient = new google.auth.JWT(
    key.client_email,
    null,
    key.private_key,
    ["https://www.googleapis.com/auth/webmasters.readonly", "https://www.googleapis.com/auth/indexing"],
    null
  );

  const tokens = await jwtClient.authorize();
  return tokens.access_token;
}
