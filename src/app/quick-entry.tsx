import { useState } from "react";
import { Text, View, StyleSheet, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { colors, fonts } from "../constants/theme";
import { getTodayDate } from "@/lib/dateUtils";
import { addQuickEntry, getEntryForDate } from "@/lib/db";
import { analyseSentiment } from "@/lib/sentiment";
import { isConnected } from "@/lib/connectivity";
import { OfflineBanner } from "@/components/OfflineBanner";

export default function QuickEntry() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  /** Saves quick entry then attempts sentiment re-analysis on the full day's text */
  const handleSave = async () => {
    if (text.trim().length === 0) return;

    const today = getTodayDate();

    // Quick entries can only be added if a daily entry already exists for today
    const existing = getEntryForDate(today);
    if (!existing) {
      setError("Write your daily entry first before adding quick notes.");
      return;
    }

    setIsProcessing(true);

    // Save the quick entry immediately — this always succeeds regardless of connectivity
    addQuickEntry(today, text.trim());

    // Re-analyse sentiment on the combined day text if online
    const online = await isConnected();
    if (online) {
      const fullText = [existing.mainText, ...existing.additionalEntries, text.trim()].join(" ");
      const sentiment = await analyseSentiment(fullText);
      if (sentiment) {
        // Update the main entry's sentiment to reflect the full day's tone
        const { updateEntrySentiment } = await import("@/lib/db");
        updateEntrySentiment(today, sentiment.label);
      }
    } else {
      setBannerMessage("Quick note saved — mood not updated while offline.");
    }

    setIsProcessing(false);
    router.back();
  };

  return (
    <View style={styles.container}>
      {bannerMessage && (
        <OfflineBanner
          message={bannerMessage}
          onDismiss={() => setBannerMessage(null)}
        />
      )}
      <Pressable style={styles.closeButton} onPress={() => router.back()}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>

      <View style={styles.centerContent}>
        <Text style={styles.title}>Quick entry</Text>

        <TextInput
          style={styles.textInput}
          multiline
          placeholder="What's on your mind?"
          placeholderTextColor={colors.textSecondary}
          value={text}
          onChangeText={(t) => { setText(t); setError(null); }}
          autoFocus
        />

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <Pressable
          style={[styles.saveButton, isProcessing && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={isProcessing}
        >
          <Text style={styles.saveText}>
            {isProcessing ? "Saving…" : "Save"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  closeButton: {
    position: "absolute",
    top: 56,
    right: 24,
    zIndex: 1,
  },
  closeText: {
    fontFamily: fonts.medium,
    fontSize: 20,
    color: colors.textSecondary,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    width: "100%",
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.textPrimary,
    marginBottom: 32,
  },
  textInput: {
    width: "100%",
    minHeight: 160,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textPrimary,
    textAlignVertical: "top",
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.mood.low,
    marginTop: 12,
    textAlign: "center",
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: 24,
    paddingVertical: 18,
    alignItems: "center",
    width: "100%",
    marginTop: 20,
  },
  saveText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.background,
  },
});