import { NextResponse } from "next/server";
import type { Transaction } from "@/lib/types/finance";

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
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", Buffer.from(keyData, "base64"),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, Buffer.from(signingInput));
  const sig = Buffer.from(signature).toString("base64")
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const jwt = `${signingInput}.${sig}`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const data = await tokenRes.json() as { access_token: string };
  return data.access_token;
}

export async function GET() {
  const sheetId = process.env.GOOGLE_SHEETS_FINANCE_ID;
  if (!sheetId) return NextResponse.json({ transactions: [] });

  try {
    const token = await getAccessToken();
    const range = encodeURIComponent("Transactions!A:E");
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return NextResponse.json({ transactions: [] });

    const data = await res.json() as { values?: string[][] };
    // Only include rows where column A looks like a date (skips title/header rows)
    const rows = (data.values ?? []).filter(r => {
      const cell = r[0] ?? "";
      if (!cell || cell === "Date") return false;
      // Accept YYYY-MM-DD, MM/DD/YYYY, M/D/YYYY, or any string starting with digits or month names
      return /^\d/.test(cell) || /^[A-Za-z]{3}/.test(cell);
    });

    function normalizeDate(d: string): string {
      if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d;
      const mdy = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
      const serial = parseInt(d);
      if (!isNaN(serial) && serial > 40000 && serial < 60000) {
        const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
      }
      return d;
    }

    const transactions: Transaction[] = rows
      .filter(r => r[0])
      .map(r => ({
        date: normalizeDate(r[0] ?? ""),
        description: r[1] ?? "",
        category: r[2] ?? "Other",
        amount: parseFloat(r[3]) || 0,
        account: r[4] ?? "",
      }));

    return NextResponse.json({ transactions });
  } catch {
    return NextResponse.json({ transactions: [] });
  }
}
