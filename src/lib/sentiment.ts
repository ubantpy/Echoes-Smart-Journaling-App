import type { SentimentLabel } from "@/lib/types";
import { colors } from "../constants/theme";

const BASE_URL = "https://echoes-backend.vercel.app";

const labelMap: Record<string, SentimentLabel> = {
  "Very Positive": "very_positive",
  "Positive": "positive",
  "Neutral": "neutral",
  "Negative": "negative",
  "Very Negative": "very_negative",
};

// Exported mood dictionaries for use across the app
export const moodColourMap: Record<SentimentLabel, string> = {
  very_positive: colors.mood.great,
  positive: colors.mood.good,
  neutral: colors.mood.neutral,
  negative: colors.mood.low,
  very_negative: colors.mood.veryLow,
};

export const moodIconMap: Record<SentimentLabel, any> = {
  very_positive: require("../../assets/icons/vh1.2.png"),
  positive: require("../../assets/icons/happy.png"),
  neutral: require("../../assets/icons/neutral.png"),
  negative: require("../../assets/icons/sad1.png"),
  very_negative: require("../../assets/icons/verysad.png"),
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