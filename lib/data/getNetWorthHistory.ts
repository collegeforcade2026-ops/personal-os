import type { NetWorthSnapshot } from "@/lib/types/finance";

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

function periodLabel(period: string): string {
  // period = "2026-04"
  const [year, month] = period.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
}

export async function getNetWorthHistory(): Promise<NetWorthSnapshot[]> {
  const sheetId = process.env.GOOGLE_SHEETS_FINANCE_ID;
  if (!sheetId || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) return [];
  try {
    const token = await getAccessToken();
    const range = encodeURIComponent("Net Worth History!A:F");
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,
      { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const data = await res.json() as { values?: string[][] };
    return (data.values ?? [])
      .filter(r => /^\d{4}-\d{2}$/.test(r[0] ?? ""))
      .map(r => ({
        period: r[0],
        periodLabel: periodLabel(r[0]),
        netWorth:    parseFloat(r[1]) || 0,
        liquid:      parseFloat(r[2]) || 0,
        invested:    parseFloat(r[3]) || 0,
        liabilities: parseFloat(r[4]) || 0,
        delta:       parseFloat(r[5]) || 0,
      }))
      .sort((a, b) => b.period.localeCompare(a.period)); // newest first
  } catch { return []; }
}
