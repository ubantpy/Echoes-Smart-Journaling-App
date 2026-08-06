import * as SQLite from "expo-sqlite";
import {Entry, Summary, SentimentLabel} from "./types";
import { formatDateString } from "./dateUtils";

const db = SQLite.openDatabaseSync("echoes.db");

export function initDatabase() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_date TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      main_text TEXT NOT NULL,
      additional_entries TEXT,
      sentiment_label TEXT,
      sentiment_confidence REAL,
      low_confidence INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period_type TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      summary_text TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      UNIQUE(period_type, period_start)
    );
  `);
}

// Entries


export function insertEntry(params: {
    entryDate: string;
    mainText: string;
    sentimentLabel?: SentimentLabel;
    sentimentConfidence?: number;
}){
    const createdAt = new Date().toISOString();
    const lowConfidence = params.sentimentConfidence !== undefined && params.sentimentConfidence < 50 ? 1 : 0;

    // If an entry already exists for this date, update it instead
    const existing = db.getFirstSync<{id: number}>(
        `SELECT id FROM entries WHERE entry_date = ?`,
        [params.entryDate]
    );

    if (existing) {
        db.runSync(
            `UPDATE entries SET main_text = ?, sentiment_label = ?, sentiment_confidence = ?, low_confidence = ? WHERE entry_date = ?`,
            [
                params.mainText,
                params.sentimentLabel ?? null,
                params.sentimentConfidence ?? null,
                lowConfidence,
                params.entryDate,
            ]
        );
    } else {
        db.runSync(
            `INSERT INTO entries (entry_date, created_at, main_text, sentiment_label, sentiment_confidence, low_confidence)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                params.entryDate,
                createdAt,
                params.mainText,
                params.sentimentLabel ?? null,
                params.sentimentConfidence ?? null,
                lowConfidence,
            ]
        );
    }
}

export function addQuickEntry(entryDate: string, text: string){
    const existing = db.getFirstSync<{additional_entries: string | null}>(
        `SELECT additional_entries FROM entries WHERE entry_date = ?`,
        [entryDate]
    );

    // No daily entry yet
    if(!existing) return;

    const current: string[] = existing.additional_entries
        ? JSON.parse(existing.additional_entries) : [];
    current.push(text);

    db.runSync(
        `UPDATE entries SET additional_entries = ? WHERE entry_date = ?`,
        [JSON.stringify(current), entryDate]
    );
}

export function getEntryForDate(entryDate: string): Entry | null {
    const row = db.getFirstSync<any>(
        `SELECT * FROM entries WHERE entry_date = ? AND is_deleted = 0`,
        [entryDate]
    );
    if(!row) return null;
    return mapRowToEntry(row);
}

export function getRecentEntries(limit: number): Entry[]{
    const rows = db.getAllSync<any>(
        `SELECT * FROM entries WHERE is_deleted = 0 ORDER BY entry_date DESC LIMIT ?`,
        [limit]
    );
    return rows.map(mapRowToEntry);
}

// Count consecutive days ending today that have at least one entry
export function getStreak(): number {
  // Fetch all non-deleted entry dates — newest first
  const rows = db.getAllSync<{ entry_date: string }>(
    `SELECT entry_date FROM entries WHERE is_deleted = 0 ORDER BY entry_date DESC`
  );

  if (rows.length === 0) return 0;

  // Build a Set for O(1) date lookup
  const dateSet = new Set(rows.map((r) => r.entry_date));

  let streak = 0;
  const cursor = new Date();

  // Walk backwards day-by-day from today; stop on the first gap
  for (let i = 0; i < 365; i++) {
    if (dateSet.has(formatDateString(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}



function mapRowToEntry(row: any): Entry{
    return{
        id: row.id,
        entryDate: row.entry_date,
        createdAt: row.created_at,
        mainText: row.main_text,
        additionalEntries: row.additional_entries
        ? JSON.parse(row.additional_entries)
        : [],
        sentimentLabel: row.sentiment_label,
        sentimentConfidence: row.sentiment_confidence,
        lowConfidence: !!row.low_confidence,
        isDeleted: !!row.is_deleted,
    };
}

// Summaries


export function insertSummary(params: {
    periodType: "weekly" | "monthly";
    periodStart: string;
    periodEnd: string;
    summaryText: string;
}){
    db.runSync(
        `INSERT OR REPLACE INTO summaries (period_type, period_start, period_end, summary_text, generated_at)
        VALUES (?, ?, ?, ?, ?)`,
        [
            params.periodType,
            params.periodStart,
            params.periodEnd,
            params.summaryText,
            new Date().toISOString(),
        ]
    );
}

export function getSummary(
    periodType: "weekly" | "monthly",
    periodStart: string
): Summary | null {
    const row = db.getFirstSync<any>(
        `SELECT * FROM summaries WHERE period_type = ? AND period_start = ?`,
        [periodType, periodStart]
    );
    if(!row) return null;
    return{
        id: row.id,
        periodType: row.period_type,
        periodStart: row.period_start,
        periodEnd: row.period_end,
        summaryText: row.summary_text,
        generatedAt: row.generated_at,
    };
}