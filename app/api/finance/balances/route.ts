import { NextRequest, NextResponse } from "next/server";
import { appendToSheet, updateSheetCell } from "@/lib/data/writeToSheet";
import type { Balance } from "@/lib/types/finance";
import { summariseBalances } from "@/lib/types/finance";

export type { Balance };

const SHEET_TAB = "Balances";
const HISTORY_TAB = "Net Worth History";

async function getAccessToken(scope = "https://www.googleapis.com/auth/spreadsheets"): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY!;
  const privateKey = rawKey.replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
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

async function readAllBalances(sheetId: string, token: string): Promise<Balance[]> {
  const range = encodeURIComponent(`${SHEET_TAB}!A:C`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return [];
  const data = await res.json() as { values?: string[][] };
  return (data.values ?? [])
    .filter(r => r[0] && r[0] !== "Account")
    .map((r, i) => ({ account: r[0], balance: parseFloat(r[1]) || 0, updated_at: r[2] ?? "", row: i + 2 }));
}

async function readHistoryRows(sheetId: string, token: string): Promise<{ period: string; row: number }[]> {
  const range = encodeURIComponent(`${HISTORY_TAB}!A:A`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return [];
  const data = await res.json() as { values?: string[][] };
  return (data.values ?? [])
    .map((r, i) => ({ period: r[0] ?? "", row: i + 1 }))
    .filter(r => /^\d{4}-\d{2}$/.test(r.period));
}

async function writeSnapshot(sheetId: string, balances: Balance[]): Promise<void> {
  const token = await getAccessToken();
  const summary = summariseBalances(balances);
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Read history to find prior month net worth and whether this month exists
  const historyRows = await readHistoryRows(sheetId, token);
  const thisMonthRow = historyRows.find(r => r.period === period);

  // Find prior month net worth for delta
  const sortedHistory = [...historyRows].sort((a, b) => b.period.localeCompare(a.period));
  const priorRow = sortedHistory.find(r => r.period < period);
  let priorNetWorth = 0;
  if (priorRow) {
    const range = encodeURIComponent(`${HISTORY_TAB}!B${priorRow.row}`);
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.ok) {
      const d = await res.json() as { values?: string[][] };
      priorNetWorth = parseFloat(d.values?.[0]?.[0] ?? "0") || 0;
    }
  }

  const delta = summary.netWorth - priorNetWorth;
  const rowData = [period, summary.netWorth, summary.liquid, summary.invested, summary.liabilities, delta];

  if (thisMonthRow) {
    // Update existing row
    const range = `${HISTORY_TAB}!A${thisMonthRow.row}:F${thisMonthRow.row}`;
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [rowData] }),
      }
    );
  } else {
    await appendToSheet(sheetId, HISTORY_TAB, [rowData]);
  }
}

export async function GET() {
  const sheetId = process.env.GOOGLE_SHEETS_FINANCE_ID;
  if (!sheetId) return NextResponse.json({ balances: [] });
  try {
    const token = await getAccessToken("https://www.googleapis.com/auth/spreadsheets.readonly");
    const balances = await readAllBalances(sheetId, token);
    return NextResponse.json({ balances });
  } catch { return NextResponse.json({ balances: [] }); }
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
      await updateSheetCell(sheetId, `${SHEET_TAB}!B${row}`, balance);
      await updateSheetCell(sheetId, `${SHEET_TAB}!C${row}`, updated_at);
    } else {
      await appendToSheet(sheetId, SHEET_TAB, [[account, balance, updated_at]]);
    }

    // Read all balances and write snapshot — fire and forget, don't fail the response
    const token = await getAccessToken();
    const allBalances = await readAllBalances(sheetId, token);
    // Merge the just-saved balance into allBalances for accurate snapshot
    const merged = allBalances.map(b => b.account === account ? { ...b, balance } : b);
    if (!merged.find(b => b.account === account)) {
      merged.push({ account, balance, updated_at, row: merged.length + 2 });
    }
    await writeSnapshot(sheetId, merged).catch(err => console.error("[balances] snapshot error:", err));

    return NextResponse.json({ ok: true, updated_at });
  } catch (err) {
    console.error("[balances] write error:", err);
    return NextResponse.json({ error: "Could not save balance" }, { status: 500 });
  }
}
