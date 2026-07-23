import { useState } from "react";
import { Text, View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { colors, fonts } from "../constants/theme";

type Mode = "choose" | "recording" | "text";

export default function NewEntry() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");

  return (
    <View style={styles.container}>
      <Pressable style={styles.closeButton} onPress={() => router.back()}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>

      {mode === "choose" && (
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

      {mode === "recording" && (
        <View style={styles.centerContent}>
          <View style={styles.recordCircle} />
          <Text style={styles.timerText}>0:00</Text>
          <Text style={styles.hintText}>Tap to stop</Text>
        </View>
      )}

      {mode === "text" && (
        <View style={styles.centerContent}>
          <Text style={styles.title}>Write your entry</Text>
          <View style={styles.textBoxPlaceholder} />
          <Text style={styles.hintText}>0 / 500 words</Text>
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
  textBoxPlaceholder: {
    width: "100%",
    height: 220,
    backgroundColor: colors.surface,
    borderRadius: 16,
  },
});