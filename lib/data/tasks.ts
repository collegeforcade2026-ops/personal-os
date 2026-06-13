import type { Task } from "@/lib/types/task";

const SHEET_HEADERS = [
  "ID", "Title", "Description", "Urgency", "Key", "Priority Score",
  "Tags", "Due Date", "Entity ID", "Owner", "Completed At", "Created At", "Updated At",
];

export const TASKS_TAB = "Tasks";

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

function rowToTask(row: string[]): Task {
  return {
    id: row[0] ?? "",
    title: row[1] ?? "",
    description: row[2] ?? "",
    urgency: (row[3] as Task["urgency"]) ?? "someday",
    key: row[4] === "true",
    priorityScore: parseFloat(row[5]) || 0,
    tags: row[6] ? row[6].split(",").map(t => t.trim()).filter(Boolean) : [],
    dueDate: row[7] ?? "",
    entityId: row[8] ?? "",
    owner: row[9] ?? "",
    completedAt: row[10] ?? "",
    createdAt: row[11] ?? "",
    updatedAt: row[12] ?? "",
  };
}

function taskToRow(task: Task): string[] {
  return [
    task.id,
    task.title,
    task.description,
    task.urgency,
    String(task.key),
    String(task.priorityScore),
    task.tags.join(", "),
    task.dueDate,
    task.entityId,
    task.owner,
    task.completedAt,
    task.createdAt,
    task.updatedAt,
  ];
}

export async function getTasks(status: "open" | "done" = "open"): Promise<Task[]> {
  const sheetId = process.env.GOOGLE_SHEETS_FINANCE_ID!;
  const token = await getAccessToken();
  const range = encodeURIComponent(`${TASKS_TAB}!A:M`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json() as { values?: string[][] };
  const rows = (data.values ?? []).filter(r => r[0] && r[0] !== "ID");
  const tasks = rows.map(rowToTask);
  if (status === "open") return tasks.filter(t => !t.completedAt);
  return tasks.filter(t => !!t.completedAt);
}

export async function createTask(task: Task): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEETS_FINANCE_ID!;
  const token = await getAccessToken();

  // Ensure Tasks tab has headers
  await ensureHeaders(sheetId, token);

  // Insert at row 2 (after header) to put new tasks at top
  // First get current data to shift rows down
  const range = encodeURIComponent(`${TASKS_TAB}!A2:M`);
  const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;
  const readRes = await fetch(readUrl, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const readData = await readRes.json() as { values?: string[][] };
  const existingRows = readData.values ?? [];

  // Write new row + all existing rows starting at A2
  const allRows = [taskToRow(task), ...existingRows];
  const writeRange = encodeURIComponent(`${TASKS_TAB}!A2:M${allRows.length + 1}`);
  const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${writeRange}?valueInputOption=RAW`;
  await fetch(writeUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: allRows }),
  });
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEETS_FINANCE_ID!;
  const token = await getAccessToken();
  const range = encodeURIComponent(`${TASKS_TAB}!A:M`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const data = await res.json() as { values?: string[][] };
  const rows = data.values ?? [];
  const rowIndex = rows.findIndex(r => r[0] === id);
  if (rowIndex === -1) return;

  const existing = rowToTask(rows[rowIndex]);
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  const writeRange = encodeURIComponent(`${TASKS_TAB}!A${rowIndex + 1}:M${rowIndex + 1}`);
  const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${writeRange}?valueInputOption=RAW`;
  await fetch(writeUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: [taskToRow(updated)] }),
  });
}

async function ensureHeaders(sheetId: string, token: string): Promise<void> {
  const range = encodeURIComponent(`${TASKS_TAB}!A1:M1`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const data = await res.json() as { values?: string[][] };
  if (data.values?.[0]?.[0] === "ID") return;
  await fetch(`${url}?valueInputOption=RAW`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: [SHEET_HEADERS] }),
  });
}
