import { google } from "googleapis";
import fs from "fs";
import path from "path";
import os from "os";

export async function getAccessToken() {
  const filePath = "service_account.json";
  const filePathFromHome = path.join(os.homedir(), ".gis", "service_account.json");
  const isFile = fs.existsSync(filePath);
  const isFileFromHome = fs.existsSync(filePathFromHome);

  if (!isFile && !isFileFromHome) {
    console.error("❌ service_account.json not found, please follow the instructions in README.md");
    console.error("");
    process.exit(1);
  }
  
  const key = JSON.parse(fs.readFileSync(isFile ? filePath : filePathFromHome, "utf8"));
  const jwtClient = new google.auth.JWT(
    key.client_email,
    undefined,
    key.private_key,
    ["https://www.googleapis.com/auth/webmasters.readonly", "https://www.googleapis.com/auth/indexing"],
    undefined
  );

  const tokens = await jwtClient.authorize();
  return tokens.access_token;
}
