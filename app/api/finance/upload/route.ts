import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { appendToSheet } from "@/lib/data/writeToSheet";
import type { Transaction } from "@/lib/types/finance";

export type { Transaction };

const CATEGORIES = [
  "Housing", "Food & Groceries", "Dining Out", "Transport & Gas",
  "Entertainment", "Subscriptions", "Health & Fitness", "Personal & Shopping",
  "Income", "Transfer", "CC Payment", "Savings & Investing", "Other"
];

async function extractTransactions(pdfBase64: string): Promise<Transaction[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const msg = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{
      role: "user",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content: [
        {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
        } as any,
        {
          type: "text",
          text: `Extract all transactions from this bank statement and return a JSON array.

For each transaction return:
- date: "YYYY-MM-DD"
- description: cleaned merchant/description name
- category: one of [${CATEGORIES.join(", ")}]
- amount: number (positive = credit/income, negative = debit/expense)
- account: "checking" or "savings" or "credit" based on context

Return ONLY a valid JSON array, no markdown, no explanation.`,
        },
      ] as any,
    }],
  });

  const raw = (msg.content[0] as { type: string; text: string }).text.trim();
  const cleaned = raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(cleaned) as Transaction[];
}

export async function POST(req: NextRequest) {
  const sheetId = process.env.GOOGLE_SHEETS_FINANCE_ID;
  if (!sheetId) {
    return NextResponse.json({ error: "Sheet not configured" }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }

  // Convert PDF to base64 for Claude's document API
  const buffer = Buffer.from(await file.arrayBuffer());
  const pdfBase64 = buffer.toString("base64");

  // Extract transactions with Claude (reads PDF natively — no pdf-parse needed)
  let transactions: Transaction[];
  try {
    transactions = await extractTransactions(pdfBase64);
  } catch (err) {
    console.error("[finance/upload] Extraction error:", err);
    return NextResponse.json({ error: "Could not extract transactions from PDF" }, { status: 500 });
  }

  // Write to Transactions tab in Google Sheet
  try {
    const rows = transactions.map((t) => [
      t.date,
      t.description,
      t.category,
      t.amount,
      t.account,
    ]);
    await appendToSheet(sheetId, "Transactions", rows);
  } catch (err) {
    console.error("[finance/upload] Sheet write error:", err);
    return NextResponse.json({
      ok: true,
      transactions,
      warning: "Transactions extracted but could not write to sheet — check sheet permissions",
    });
  }

  return NextResponse.json({ ok: true, transactions, count: transactions.length });
}
