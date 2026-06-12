import { NextRequest, NextResponse } from "next/server";
import { appendToSheet, updateSheetCell } from "@/lib/data/writeToSheet";
import type { Balance } from "@/lib/types/finance";

export type { Balance };

const SHEET_TAB = "Balances";

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

export async function GET() {
  const sheetId = process.env.GOOGLE_SHEETS_FINANCE_ID;
  if (!sheetId) return NextResponse.json({ balances: [] });

  try {
    const token = await getAccessToken();
    const range = encodeURIComponent(`${SHEET_TAB}!A:C`);
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return NextResponse.json({ balances: [] });

    const data = await res.json() as { values?: string[][] };
    const rows = data.values ?? [];
    // rows[0] is header, rows[1..] are data
    const balances: Balance[] = rows.slice(1)
      .map((r, i) => ({
        account: r[0] ?? "",
        balance: parseFloat(r[1]) || 0,
        updated_at: r[2] ?? "",
        row: i + 2, // +1 for header, +1 for 1-index
      }))
      .filter(b => b.account);

    return NextResponse.json({ balances });
  } catch {
    return NextResponse.json({ balances: [] });
  }
}

export async function POST(req: NextRequest) {
  const sheetId = process.env.GOOGLE_SHEETS_FINANCE_ID;
  if (!sheetId) return NextResponse.json({ error: "Sheet not configured" }, { status: 500 });

  const { account, balance, row } = await req.json() as { account: string; balance: number; row?: number };
  const updated_at = new Date().toLocaleString("en-US", {
    timeZone: process.env.USER_TIMEZONE ?? "America/Chicago",
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  });

  try {
    if (row) {
      // Update existing row
      await updateSheetCell(sheetId, `${SHEET_TAB}!B${row}`, balance);
      await updateSheetCell(sheetId, `${SHEET_TAB}!C${row}`, updated_at);
    } else {
      // New account — append row (will also write header if sheet is empty)
      await appendToSheet(sheetId, SHEET_TAB, [[account, balance, updated_at]]);
    }
    return NextResponse.json({ ok: true, updated_at });
  } catch (err) {
    console.error("[balances] write error:", err);
    return NextResponse.json({ error: "Could not save balance" }, { status: 500 });
  }
}
