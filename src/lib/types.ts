export type SentimentLabel = | "very_positive" | "positive" | "neutral" | "negative" | "very_negative";

export interface Entry {
  id: number;
  // 'YYYY-MM-DD'
  entryDate: string;
  // ISO timestamp
  createdAt: string;
  mainText: string;
  additionalEntries: string[];
  sentimentLabel: SentimentLabel | null;
  sentimentConfidence: number | null;
  lowConfidence: boolean;
  isDeleted: boolean;
}

export interface Summary {
  id: number;
  periodType: "weekly" | "monthly";
  // 'YYYY-MM-DD'
  periodStart: string;
  periodEnd: string;
  summaryText: string;
  generatedAt: string;
}