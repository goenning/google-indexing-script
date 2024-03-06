import { google } from "googleapis";
import fs from "fs";
import path from "path";
import os from "os";

export async function getAccessToken(client_email?: string, private_key?: string, customPath?: string) {
  if (!client_email && !private_key) {
    const filePath = "service_account.json";
    const filePathFromHome = path.join(os.homedir(), ".gis", "service_account.json");
    const isFile = fs.existsSync(filePath);
    const isFileFromHome = fs.existsSync(filePathFromHome);
    const isCustomFile = !!customPath && fs.existsSync(customPath);

    if (!isFile && !isFileFromHome && !isCustomFile) {
      console.error(`❌ ${filePath} not found, please follow the instructions in README.md`);
      console.error("");
      process.exit(1);
    }

    const key = JSON.parse(
      fs.readFileSync(!!customPath && isCustomFile ? customPath : isFile ? filePath : filePathFromHome, "utf8")
    );
    client_email = key.client_email;
    private_key = key.private_key;
  } else {
    if (!client_email) {
      console.error("❌ Missing client_email in service account credentials.");
      console.error("");
      process.exit(1);
    }

    if (!private_key) {
      console.error("❌ Missing private_key in service account credentials.");
      console.error("");
      process.exit(1);
    }
  }

  const jwtClient = new google.auth.JWT(
    client_email,
    undefined,
    private_key,
    ["https://www.googleapis.com/auth/webmasters.readonly", "https://www.googleapis.com/auth/indexing"],
    undefined
  );

  const tokens = await jwtClient.authorize();
  return tokens.access_token;
}
