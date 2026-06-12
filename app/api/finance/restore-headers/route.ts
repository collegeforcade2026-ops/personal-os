import { NextResponse } from "next/server";

async function getAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY!;
  const privateKey = rawKey.replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const scope = "https://www.googleapis.com/auth/spreadsheets";
  const header = { alg: "RS256", typ: "JWT" };
  const payload = { iss: email, scope, aud: "https://oauth2.googleapis.com/token", exp: now + 3600, iat: now };
  function b64url(obj: object) {
    return Buffer.from(JSON.stringify(obj)).toString("base64")
      .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }
  const signingInput = `${b64url(header)}.${b64url(payload)}`;
  const keyData = privateKey
    .replace("-----BEGIN PRIVATE KEY-----", "").replace("-----END PRIVATE KEY-----", "").replace(/\n/g, "");
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", Buffer.from(keyData, "base64"),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = Buffer.from(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, Buffer.from(signingInput))
  ).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const jwt = `${signingInput}.${sig}`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  return ((await tokenRes.json()) as { access_token: string }).access_token;
}

export async function GET() {
  const sheetId = process.env.GOOGLE_SHEETS_FINANCE_ID;
  if (!sheetId) return NextResponse.json({ error: "Sheet not configured" }, { status: 500 });

  try {
    const token = await getAccessToken();
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          valueInputOption: "RAW",
          data: [
            { range: "Transactions!A1:E1",     values: [["Date", "Description", "Category", "Amount", "Account"]] },
            { range: "Balances!A1:C1",          values: [["Account", "Balance", "Updated At"]] },
            { range: "Net Worth History!A1:F1", values: [["Period", "Net Worth", "Liquid", "Invested", "Liabilities", "Delta"]] },
          ],
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: "Failed", detail: err }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Headers restored to all 3 tabs" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
