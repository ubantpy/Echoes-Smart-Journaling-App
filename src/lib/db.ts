import * as SQLite from "expo-sqlite";
import {Entry, Summary, SentimentLabel} from "./types";
import { formatDateString, getTodayDate } from "./dateUtils";

let db: SQLite.SQLiteDatabase;

export function initDatabase() {
  db = SQLite.openDatabaseSync("echoes.db");
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
    const lowConfidence = params.sentimentConfidence != undefined && params.sentimentConfidence < 50 ? 1 : 0;

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

/** Returns all non-deleted entries within a date range (inclusive), oldest first*/
export function getEntriesInRange(start: string, end: string): Entry[] {
  const rows = db.getAllSync<any>(
    `SELECT * FROM entries
     WHERE is_deleted = 0 AND entry_date >= ? AND entry_date <= ?
     ORDER BY entry_date ASC`,
    [start, end]
  );
  return rows.map(mapRowToEntry);
}

/**Count consecutive days ending today that have at least one entry*/
export function getStreak(): number {
  // Fetch all nondeleted entry dates - newest first
  const rows = db.getAllSync<{ entry_date: string }>(
    `SELECT entry_date FROM entries WHERE is_deleted = 0 ORDER BY entry_date DESC`
  );

  if (rows.length == 0) return 0;

  // Build a Set for O(1) date lookup
  const dateSet = new Set(rows.map((r) => r.entry_date));

  let streak = 0;
  const cursor = new Date(getTodayDate() + "T00:00:00");

  // If there's no entry today, start counting from yesterday, so the streak isn't broken until next day
  if (!dateSet.has(getTodayDate())){
    cursor.setDate(cursor.getDate() - 1);
  }

  // Walk backwards day-by-day, stop on the first gap
  for (let i = 0; i < 365; i++) {
    if (dateSet.has(formatDateString(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    else {
      break;
    }
  }

  return streak;
}

/** Returns count of entries grouped by sentiment label*/
export function getMoodDistribution(): Record<string, number> {
  const rows = db.getAllSync<{ sentiment_label: string; count: number }>(
    `SELECT sentiment_label, COUNT(*) as count
     FROM entries
     WHERE is_deleted = 0 AND sentiment_label IS NOT NULL
     GROUP BY sentiment_label`
  );
  const result: Record<string, number> = {};
  rows.forEach((r) => { result[r.sentiment_label] = r.count; });
  return result;
}

/** Updates only the sentiment label on an existing entry, clearing low confidence flag */
export function updateEntrySentiment(entryDate: string, label: SentimentLabel): void {
  db.runSync(
    `UPDATE entries SET sentiment_label = ? WHERE entry_date = ?`,
    [label, entryDate]
  );
}

/** Returns total number of non-deleted entries*/
export function getTotalEntries(): number {
  const row = db.getFirstSync<{ count: number }>(
    `SELECT COUNT(*) as count FROM entries WHERE is_deleted = 0`
  );
  return row?.count ?? 0;
}

/** Returns the longest consecutive day streak across all time*/
export function getLongestStreak(): number {
  const rows = db.getAllSync<{ entry_date: string }>(
    `SELECT entry_date FROM entries WHERE is_deleted = 0 ORDER BY entry_date ASC`
  );

  if (rows.length == 0) return 0;

  let longest = 1;
  let current = 1;

  // Walk forward through dates. increment on consecutive days, reset on gaps
  for (let i = 1; i < rows.length; i++) {
    const prev = new Date(rows[i - 1].entry_date + "T00:00:00");
    const curr = new Date(rows[i].entry_date + "T00:00:00");
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);

    if (diffDays == 1) {
      current++;
      if (current > longest) longest = current;
    } 
    else {
      current = 1;
    }
  }

  return longest;
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

/** Permanently deletes all entries from the database */
export function deleteAllEntries(): void {
  console.log("delete entries run")
  db.runSync(`DELETE FROM entries`);
}

/** Permanently deletes all summaries from the database */
export function deleteAllSummaries(): void {
  console.log("delete summaries run")
  db.runSync(`DELETE FROM summaries`);
}

// Data Migration (export/import)

/** Exports all entries and summaries into a single JSON string */
export async function exportData(): Promise<string> {
  const entries = await db.getAllAsync(`SELECT * FROM entries`);
  const summaries = await db.getAllAsync(`SELECT * FROM summaries`);
  
  const backup = {version: 1, entries, summaries};
  return JSON.stringify(backup);
}

/** Takes a JSON string, parses it, and inserts into  database.*/
export function importData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (!data.entries || !data.summaries || !Array.isArray(data.entries) || 
    !Array.isArray(data.summaries) || (data.entries.length > 0 && !data.entries[0].entry_date) || data.version != 1
    ) return false;

    // Run inside a transaction. If one fails, roll back to prevent corrupted data
    db.execSync('BEGIN TRANSACTION');

    for (const e of data.entries) {
      db.runSync(
        `INSERT OR REPLACE INTO entries (entry_date, created_at, main_text, additional_entries, sentiment_label, sentiment_confidence, low_confidence, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [e.entry_date, e.created_at, e.main_text, e.additional_entries, e.sentiment_label, e.sentiment_confidence, e.low_confidence, e.is_deleted]
      );
    }

    for (const s of data.summaries) {
      db.runSync(
        `INSERT OR REPLACE INTO summaries (period_type, period_start, period_end, summary_text, generated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [s.period_type, s.period_start, s.period_end, s.summary_text, s.generated_at]
      );
    }

    db.execSync('COMMIT');
    return true;
  }
  catch{
    db.execSync('ROLLBACK');
    return false;
  }
}