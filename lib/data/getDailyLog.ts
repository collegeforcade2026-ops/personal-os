// Daily log stored in Google Sheets "Daily Log" tab
// Columns: Date | User ID | Notes JSON

export interface MealEntry {
  time: string;
  name: string;
  kcal: number;
  protein: number;
}

export interface HabitLog {
  [habitId: string]: boolean;
}

export interface GoalItem {
  id: string;
  text: string;
  done: boolean;
}

export interface DailyLogNotes {
  habits?: HabitLog;
  goalsWeek?: GoalItem[];
  goalsMonth?: GoalItem[];
  nutrition?: { meals: MealEntry[]; goal_kcal: number };
  reviewNotes?: string;
}

const TAB = "Daily Log";

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

async function getAllRows(token: string): Promise<string[][]> {
  const sheetId = process.env.GOOGLE_SHEETS_FINANCE_ID!;
  const range = encodeURIComponent(`${TAB}!A:C`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json() as { values?: string[][] };
  return data.values ?? [];
}

export async function getDailyLog(
  _userId: string,
  date: string
): Promise<DailyLogNotes> {
  try {
    const token = await getAccessToken();
    const values = await getAllRows(token);
    const row = values.find(r => r[0] === date);
    if (!row || !row[2]) return {};
    return JSON.parse(row[2]) as DailyLogNotes;
  } catch (err) {
    console.error("[getDailyLog]", err);
    return {};
  }
}

export async function upsertDailyLog(
  _userId: string,
  date: string,
  patch: Partial<DailyLogNotes>
): Promise<void> {
  try {
    const token = await getAccessToken();
    const values = await getAllRows(token);
    const sheetId = process.env.GOOGLE_SHEETS_FINANCE_ID!;

    // Ensure headers exist
    if (!values[0] || values[0][0] !== "Date") {
      const hRange = encodeURIComponent(`${TAB}!A1:C1`);
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${hRange}?valueInputOption=RAW`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [["Date", "User ID", "Notes"]] }),
      });
    }

    const rowIndex = values.findIndex(r => r[0] === date);
    const existing: DailyLogNotes = (rowIndex >= 0 && values[rowIndex][2])
      ? (JSON.parse(values[rowIndex][2]) as DailyLogNotes)
      : {};

    const merged: DailyLogNotes = {
      ...existing,
      ...patch,
      habits: { ...(existing.habits ?? {}), ...(patch.habits ?? {}) },
      goalsWeek: patch.goalsWeek ?? existing.goalsWeek,
      goalsMonth: patch.goalsMonth ?? existing.goalsMonth,
      reviewNotes: patch.reviewNotes ?? existing.reviewNotes,
    };

    const newRow = [date, "cade", JSON.stringify(merged)];

    if (rowIndex >= 0) {
      const writeRange = encodeURIComponent(`${TAB}!A${rowIndex + 1}:C${rowIndex + 1}`);
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${writeRange}?valueInputOption=RAW`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [newRow] }),
      });
    } else {
      const appendRange = encodeURIComponent(`${TAB}!A1`);
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${appendRange}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [newRow] }),
      });
    }
  } catch (err) {
    console.error("[upsertDailyLog]", err);
  }
}
