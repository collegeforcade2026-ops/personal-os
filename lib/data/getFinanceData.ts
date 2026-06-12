export interface FinanceRow {
  date: string;
  net_worth: number;
  cash: number;
  investments: number;
  notes: string;
}

async function getAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY!;
  const privateKey = rawKey.replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  function b64url(obj: object) {
    return Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  }

  const signingInput = `${b64url(header)}.${b64url(payload)}`;

  // Import private key
  const keyData = privateKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");

  const binaryKey = Buffer.from(keyData, "base64");
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    Buffer.from(signingInput)
  );

  const sig = Buffer.from(signature)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${signingInput}.${sig}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json() as { access_token: string };
  return tokenData.access_token;
}

export async function getFinanceData(): Promise<FinanceRow[]> {
  const sheetId = process.env.GOOGLE_SHEETS_FINANCE_ID;
  if (!sheetId || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) return [];

  try {
    const token = await getAccessToken();
    const range = "Transactions!A:E";
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error("[getFinanceData] Sheets API error:", res.status);
      return [];
    }

    const data = await res.json() as { values: string[][] };
    const rows = data.values ?? [];
    if (rows.length < 2) return [];

    // Skip header row
    return rows.slice(1).map((r) => ({
      date: r[0] ?? "",
      net_worth: parseFloat(r[1]) || 0,
      cash: parseFloat(r[2]) || 0,
      investments: parseFloat(r[3]) || 0,
      notes: r[4] ?? "",
    }));
  } catch (err) {
    console.error("[getFinanceData]", err);
    return [];
  }
}
