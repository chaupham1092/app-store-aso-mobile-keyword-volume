import { SignJWT, importPKCS8 } from "jose";
import fs from "fs";
import path from "path";

let cachedToken: { token: string; expiresAt: number } | null = null;

function getPrivateKey(): string {
  // Try env var first
  if (process.env.APPLE_ADS_PRIVATE_KEY) {
    return process.env.APPLE_ADS_PRIVATE_KEY.replace(/\\n/g, "\n");
  }
  // Fallback to file
  const keyPath = path.join(process.cwd(), "private-key.pem");
  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, "utf-8");
  }
  throw new Error(
    "No private key found. Set APPLE_ADS_PRIVATE_KEY env var or place private-key.pem in project root."
  );
}

async function createClientSecret(): Promise<string> {
  const clientId = process.env.APPLE_ADS_CLIENT_ID!;
  const teamId = process.env.APPLE_ADS_TEAM_ID!;
  const keyId = process.env.APPLE_ADS_KEY_ID!;

  const privateKeyPem = getPrivateKey();
  const privateKey = await importPKCS8(privateKeyPem, "ES256");

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 86400 * 180; // 180 days

  const jwt = await new SignJWT({
    sub: clientId,
    aud: "https://appleid.apple.com",
    iss: teamId,
  })
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(privateKey);

  return jwt;
}

export async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.token;
  }

  const clientId = process.env.APPLE_ADS_CLIENT_ID!;
  const clientSecret = await createClientSecret();

  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "searchadsorg",
  });

  const response = await fetch("https://appleid.apple.com/auth/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Host: "appleid.apple.com",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token request failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

export async function appleAdsRequest(
  endpoint: string,
  body: object,
  orgId: string
) {
  const token = await getAccessToken();

  const baseUrl = "https://api.ads.apple.com";
  const url = `${baseUrl}${endpoint}`;

  // Different endpoints need different context headers
  // Insights endpoints use adAccountId, suggestions/recommendations use orgId
  const isInsightsOrReports =
    endpoint.includes("/insights/") || endpoint.includes("/reports/");
  const contextHeader = isInsightsOrReports
    ? `adAccountId=${orgId}`
    : `orgId=${orgId}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-AP-Context": contextHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apple Ads API error (${response.status}): ${text}`);
  }

  return response.json();
}
