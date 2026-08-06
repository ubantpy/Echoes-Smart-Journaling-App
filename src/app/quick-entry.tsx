import { useState } from "react";
import { Text, View, StyleSheet, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { colors, fonts } from "../constants/theme";
import { addQuickEntry, getEntryForDate } from "@/lib/db";

// Produce current YYYY-MM-DD date
function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function QuickEntry() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Appends text to today's entry's additional_entries array in SQLite
  const handleSave = () => {
    if (text.trim().length === 0) return;

    const today = getTodayDate();

    // Quick entries can only be added if a daily entry already exists for today
    const existing = getEntryForDate(today);
    if (!existing) {
      setError("Write your daily entry first before adding quick notes.");
      return;
    }

    addQuickEntry(today, text.trim());
    router.back();
  };

  return (
    <View style={styles.container}>
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

        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveText}>Save</Text>
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