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

  /** Saves quick entry then re-analyses sentiment on the full day's combined text */
  const handleSave = async () => {
    if (text.trim().length == 0) return;

    const today = getTodayDate();
    const existing = getEntryForDate(today);
    if (!existing) {
      setError("Write your daily entry first before adding quick notes.");
      return;
    }

    setIsProcessing(true);

    // Save immediately - always succeeds regardless of connectivity
    addQuickEntry(today, text.trim());

    const online = await isConnected();
    if (online) {
      // Re-analyse using the full day's text so the mood reflects everything written
      const fullText = [existing.mainText, ...existing.additionalEntries, text.trim()].join(" ");
      const sentiment = await analyseSentiment(fullText);
      if (sentiment) {
        const { updateEntrySentiment } = await import("@/lib/db");
        updateEntrySentiment(today, sentiment.label);
      }
    } else {
      setBannerMessage("Quick note saved - mood not updated while offline.");
    }

    setIsProcessing(false);
    router.back();
  };

  return (
    <View style={styles.container}>
      {bannerMessage && (
        <OfflineBanner message={bannerMessage} onDismiss={() => setBannerMessage(null)} />
      )}

      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topLabel}>Quick note</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        {/* Input wrapped in a card for border + highlight texture */}
        <View style={styles.inputCard}>
          <View style={styles.inputHighlight} />
          <TextInput
            style={styles.textInput}
            multiline
            placeholder="What's on your mind?"
            placeholderTextColor={colors.textSecondary}
            value={text}
            onChangeText={(t) => { setText(t); setError(null); }}
            autoFocus
          />
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          style={[styles.saveButton, isProcessing && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={isProcessing}
        >
          <View style={styles.buttonHighlight} />
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

  // ── Top bar ─────────────────────────────────────────
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#2e3530",
  },
  topLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  closeText: {
    fontFamily: fonts.medium,
    fontSize: 20,
    color: colors.textSecondary,
  },

  // ── Content ──────────────────────────────────────────
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  inputCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2e3530",
    overflow: "hidden",
    marginBottom: 12,
    position: "relative",
  },
  inputHighlight: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    zIndex: 1,
  },
  textInput: {
    minHeight: 200,
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
    marginBottom: 16,
    textAlign: "center",
  },

  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    width: "100%",
    overflow: "hidden",
    position: "relative",
  },
  buttonHighlight: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  saveText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.background,
  },
});