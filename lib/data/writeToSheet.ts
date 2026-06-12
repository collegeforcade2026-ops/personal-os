async function getAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY!;
  const privateKey = rawKey.replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  function b64url(obj: object) {
    return Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }

  const signingInput = `${b64url(header)}.${b64url(payload)}`;
  const keyData = privateKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", Buffer.from(keyData, "base64"),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", cryptoKey, Buffer.from(signingInput)
  );

  const sig = Buffer.from(signature).toString("base64")
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${signingInput}.${sig}`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await tokenRes.json() as { access_token: string };
  return data.access_token;
}

export async function appendToSheet(
  sheetId: string,
  tabName: string,
  rows: (string | number)[][]
): Promise<void> {
  const token = await getAccessToken();
  const range = encodeURIComponent(`${tabName}!A1`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: rows }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sheets write failed: ${err}`);
  }
}

export async function updateSheetCell(
  sheetId: string,
  range: string,
  value: string | number
): Promise<void> {
  const token = await getAccessToken();
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [[value]] }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sheets update failed: ${err}`);
  }
}
