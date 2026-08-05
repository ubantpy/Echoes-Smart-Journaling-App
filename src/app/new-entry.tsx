import { useState } from "react";
import { Text, View, StyleSheet, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { colors, fonts } from "../constants/theme";
import { insertEntry } from "@/lib/db";
import { analyseSentiment } from "@/lib/sentiment";

type Mode = "choose" | "recording" | "text";

// Produce current YYYY-MM-DD date
function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  // Months in JS Date are 0-11, then make sure all months are 2 digit
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(1, "0");
  const date = `${year}-${month}-${day}`;
  return date;
}

export default function NewEntry() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [text, setText] = useState("");

  // 
  const handleSave = async () => {
    if (text.trim().length === 0) return;

    const sentiment = await analyseSentiment(text.trim());

    insertEntry({
      entryDate: getTodayDate(),
      mainText: text.trim(),
      sentimentLabel: sentiment?.label ?? undefined,
      sentimentConfidence: sentiment?.confidence ?? undefined,
    });

    router.back();
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.closeButton} onPress={() => router.back()}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>

      {mode == "choose" && (
        <View style={styles.centerContent}>
          <Text style={styles.title}>New entry</Text>
          <Pressable
            style={styles.optionButton}
            onPress={() => setMode("recording")}
          >
            <Text style={styles.optionText}>Start recording</Text>
          </Pressable>
          <Pressable
            style={[styles.optionButton, styles.secondaryOption]}
            onPress={() => setMode("text")}
          >
            <Text style={styles.optionText}>Write instead</Text>
          </Pressable>
        </View>
      )}

      {mode == "recording" && (
        <View style={styles.centerContent}>
          <View style={styles.recordCircle} />
          <Text style={styles.timerText}>0:00</Text>
          <Text style={styles.hintText}>Tap to stop</Text>
        </View>
      )}

      {mode === "text" && (
        <View style={styles.centerContent}>
          <Text style={styles.title}>Write your entry</Text>
          <TextInput
            style={styles.textInput}
            multiline
            placeholder="What's on your mind?"
            placeholderTextColor={colors.textSecondary}
            value={text}
            onChangeText={setText}
          />
          <Text style={styles.hintText}>{text.trim().split(/\s+/).filter(Boolean).length} / 500 words</Text>

          <Pressable style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveText}>Save entry</Text>
          </Pressable>
        </View>
      )}
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
  optionButton: {
    backgroundColor: colors.accent,
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },
  secondaryOption: {
    backgroundColor: colors.surface,
  },
  optionText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.background,
  },
  recordCircle: {
    width: 140,
    height: 140,
    borderRadius: 40,
    backgroundColor: colors.accent,
  },
  timerText: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.textPrimary,
    marginTop: 24,
  },
  hintText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
  },
  textInput: {
    width: "100%",
    minHeight: 220,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textPrimary,
    textAlignVertical: "top",
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