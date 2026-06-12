const PASS_THROUGH = new Set(["CC Payment", "Transfer"]);

export interface TransactionSummary {
  totalIncome: number;
  totalSpend: number;
  net: number;
  topCategory: string;
  monthLabel: string;
  transactionCount: number;
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

export async function getTransactionSummary(): Promise<TransactionSummary | null> {
  const sheetId = process.env.GOOGLE_SHEETS_FINANCE_ID;
  if (!sheetId || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) return null;

  try {
    const token = await getAccessToken();
    const range = encodeURIComponent("Transactions!A:E");
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const data = await res.json() as { values?: string[][] };
    // Skip any row where column A isn't a date (handles title rows like "TRANSACTION LOG")
    const rows = (data.values ?? []).filter(r => {
      const cell = r[0] ?? "";
      if (!cell || cell === "Date") return false;
      return /^\d/.test(cell) || /^[A-Za-z]{3}/.test(cell);
    });
    if (rows.length === 0) return null;

    // Find the most recent month in the data
    // Normalize any date string to "YYYY-MM" for grouping
    function toYearMonth(d: string): string | null {
      // YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 7);
      // M/D/YYYY or MM/DD/YYYY
      const mdy = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, "0")}`;
      // M/D/YY
      const mdyShort = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
      if (mdyShort) return `20${mdyShort[3]}-${mdyShort[1].padStart(2, "0")}`;
      // Google Sheets serial number (days since 1899-12-30)
      const serial = parseInt(d);
      if (!isNaN(serial) && serial > 40000 && serial < 60000) {
        const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
      }
      return null;
    }

    const yearMonths = rows.map(r => toYearMonth(r[0] ?? "")).filter(Boolean) as string[];
    if (yearMonths.length === 0) return null;
    const latestYearMonth = yearMonths.sort().at(-1)!;
    const monthLabel = new Date(latestYearMonth + "-15").toLocaleString("en-US", { month: "long", year: "numeric" });

    const monthRows = rows.filter(r => toYearMonth(r[0] ?? "") === latestYearMonth);

    let totalIncome = 0;
    let totalSpend = 0;
    const categorySpend: Record<string, number> = {};

    for (const r of monthRows) {
      const category = r[2] ?? "Other";
      const amount = parseFloat(r[3]) || 0;
      if (PASS_THROUGH.has(category)) continue;
      // Use category as the source of truth — some banks report income as negative
      if (category === "Income" || category === "Savings & Investing") {
        totalIncome += Math.abs(amount);
      } else {
        totalSpend += Math.abs(amount);
        categorySpend[category] = (categorySpend[category] ?? 0) + Math.abs(amount);
      }
    }

    const topCategory = Object.entries(categorySpend).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

    return {
      totalIncome,
      totalSpend,
      net: totalIncome - totalSpend,
      topCategory,
      monthLabel,
      transactionCount: monthRows.length,
    };
  } catch (err) {
    console.error("[getTransactionSummary]", err);
    return null;
  }
}
