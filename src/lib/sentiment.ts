import type { SentimentLabel } from "@/lib/types";

const BASE_URL = "https://echoes-backend.vercel.app";

const labelMap: Record<string, SentimentLabel> = {
  "Very Positive": "very_positive",
  "Positive": "positive",
  "Neutral": "neutral",
  "Negative": "negative",
  "Very Negative": "very_negative",
};

export async function analyseSentiment(
  text: string
): Promise<{ label: SentimentLabel; confidence: number } | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/sentiment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const label = labelMap[data.label];
    if (!label) return null;
    return { label, confidence: data.confidence };
  } catch {
    return null;
  }
}