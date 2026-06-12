import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { appendToSheet, updateSheetCell } from "@/lib/data/writeToSheet";

const client = new Anthropic();
const SHEET_TAB = "Balances";

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

async function findExistingRow(sheetId: string, token: string, accountName: string): Promise<number | null> {
  const range = encodeURIComponent(`${SHEET_TAB}!A:A`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  const data = await res.json() as { values?: string[][] };
  const rows = data.values ?? [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === accountName) return i + 1; // 1-indexed sheet row
  }
  return null;
}

export async function POST(req: NextRequest) {
  const sheetId = process.env.GOOGLE_SHEETS_FINANCE_ID;
  if (!sheetId) return NextResponse.json({ error: "Sheet not configured" }, { status: 500 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  if (file.type !== "application/pdf") return NextResponse.json({ error: "PDF only" }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const pdfBase64 = Buffer.from(arrayBuffer).toString("base64");

  // Ask Claude to extract portfolio value from the statement
  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 512,
    messages: [{
      role: "user",
      content: [
        {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
        } as any,
        {
          type: "text",
          text: `Extract the following from this investment/brokerage statement and respond ONLY with valid JSON, no markdown:

{
  "brokerage": "<institution name, e.g. M1 Finance>",
  "totalValue": <total portfolio/account value as a number, no commas or symbols>,
  "statementDate": "<YYYY-MM-DD or null if not found>"
}

Rules:
- totalValue must be a plain number (e.g. 12345.67)
- Use the TOTAL portfolio value — not individual holdings
- If multiple accounts are shown, sum them or use the grand total
- brokerage should be a clean name like "M1 Finance", "Fidelity", "Schwab", etc.`,
        },
      ] as any,
    }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();

  let parsed: { brokerage: string; totalValue: number; statementDate: string | null };
  try {
    // Strip markdown fences if Claude added them
    const json = raw.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();
    parsed = JSON.parse(json);
  } catch {
    return NextResponse.json({ error: "Could not parse investment statement", raw }, { status: 422 });
  }

  const { brokerage, totalValue } = parsed;
  if (!brokerage || typeof totalValue !== "number" || isNaN(totalValue)) {
    return NextResponse.json({ error: "Could not find a total portfolio value in this PDF" }, { status: 422 });
  }

  const updated_at = new Date().toLocaleString("en-US", {
    timeZone: process.env.USER_TIMEZONE ?? "America/Chicago",
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  });

  try {
    const token = await getAccessToken();
    const existingRow = await findExistingRow(sheetId, token, brokerage);

    if (existingRow) {
      await updateSheetCell(sheetId, `${SHEET_TAB}!B${existingRow}`, totalValue);
      await updateSheetCell(sheetId, `${SHEET_TAB}!C${existingRow}`, updated_at);
    } else {
      await appendToSheet(sheetId, SHEET_TAB, [[brokerage, totalValue, updated_at]]);
    }

    // Trigger net worth snapshot via the balances POST endpoint (internal call)
    await fetch(`${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/finance/balances`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account: brokerage, balance: totalValue, row: existingRow ?? undefined }),
    }).catch(() => {}); // fire-and-forget, don't fail on this

    return NextResponse.json({ ok: true, brokerage, totalValue, updated_at });
  } catch (err) {
    console.error("[upload-investment] error:", err);
    return NextResponse.json({ error: "Could not save balance" }, { status: 500 });
  }
}
