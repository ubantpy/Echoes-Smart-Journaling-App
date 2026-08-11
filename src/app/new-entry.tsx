import { useState, useEffect, useRef } from "react";
import { Text, View, StyleSheet, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useAudioRecorder, AudioModule, RecordingPresets } from "expo-audio";
import { colors, fonts } from "../constants/theme";
import { insertEntry, getEntryForDate } from "@/lib/db";
import { analyseSentiment } from "@/lib/sentiment";
import { transcribeAudio } from "@/lib/transcribe";
import { getTodayDate } from "@/lib/dateUtils";

type Mode = "choose" | "recording" | "text";

// Converts total seconds into a m:ss display string e.g. 75 → "1:15"
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function NewEntry() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [text, setText] = useState("");

  // expo-audio hook - must be called at component level
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Recording state
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  // Which date this entry is for. Default = today, can be switched to yesterday
  const [targetDate, setTargetDate] = useState<string>(getTodayDate());
  const [hasEntryYesterday, setHasEntryYesterday] = useState(false);
  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  /** Check on mount whether yesterday already has an entry */
  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const y = yesterday.getFullYear();
    const m = String(yesterday.getMonth() + 1).padStart(2, "0");
    const d = String(yesterday.getDate()).padStart(2, "0");
    const yesterdayStr = `${y}-${m}-${d}`;
    setHasEntryYesterday(!!getEntryForDate(yesterdayStr));
  }, []);

  // Asks for microphone permission and starts recording
  const startRecording = async () => {
    const { granted } = await AudioModule.requestRecordingPermissionsAsync();
    if (!granted) return;

    // Must prepare before recording
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();

    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  };

const stopRecording = async () => {
  if (timerRef.current) clearInterval(timerRef.current);
  setIsProcessing(true);

  // URI is only available after stop() resolves
  await audioRecorder.stop();
  const uri = audioRecorder.uri;

  if (!uri) {
    setIsProcessing(false);
    return;
  }

  const transcribedText = await transcribeAudio(uri);

  if (!transcribedText) {
    setIsProcessing(false);
    return;
  }

  const sentiment = await analyseSentiment(transcribedText);

  insertEntry({
    entryDate: targetDate,
    mainText: transcribedText,
    sentimentLabel: sentiment?.label ?? undefined,
    sentimentConfidence: sentiment?.confidence ?? undefined,
  });

  setIsProcessing(false);
  router.dismiss();
};

  // Save text entry with sentiment analysis
  const handleSave = async () => {
    if (text.trim().length == 0) return;

    setIsProcessing(true);
    const sentiment = await analyseSentiment(text.trim());

    insertEntry({
      entryDate: targetDate,
      mainText: text.trim(),
      sentimentLabel: sentiment?.label ?? undefined,
      sentimentConfidence: sentiment?.confidence ?? undefined,
    });

    setIsProcessing(false);
    router.dismiss();
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.closeButton} onPress={() => router.dismiss()}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>

      {mode == "choose" && (
        <View style={styles.centerContent}>
          {/* Show which date the entry is for when not today */}
          <Text style={styles.title}>
            {targetDate === getTodayDate() ? "New entry" : "Yesterday's entry"}
          </Text>
          <Pressable
            style={styles.optionButton}
            onPress={() => { setMode("recording"); startRecording(); }}
          >
            <Text style={styles.optionText}>Start recording</Text>
          </Pressable>
          <Pressable
            style={[styles.optionButton, styles.secondaryOption]}
            onPress={() => setMode("text")}
          >
            <Text style={styles.optionText}>Write instead</Text>
          </Pressable>

          {/* Toggle between today and yesterday - shown at the bottom of the screen */}
          {!hasEntryYesterday && (
          <Pressable
            style={styles.yesterdayButton}
            onPress={() => {
              if (targetDate === getTodayDate()) {
                // Switch to yesterday
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const y = yesterday.getFullYear();
                const m = String(yesterday.getMonth() + 1).padStart(2, "0");
                const d = String(yesterday.getDate()).padStart(2, "0");
                setTargetDate(`${y}-${m}-${d}`);
              } else {
                // Switch back to today
                setTargetDate(getTodayDate());
              }
            }}
          >
            <Text style={styles.yesterdayText}>
              {targetDate === getTodayDate()
                ? "Adding for yesterday instead?"
                : "← Back to today's entry"}
            </Text>
          </Pressable>
          )}
        </View>
      )}

      {mode == "recording" && (
        <View style={styles.centerContent}>
          {isProcessing ? (
            <>
              <View style={[styles.recordCircle, styles.recordCircleIdle]} />
              <Text style={styles.timerText}>Processing…</Text>
              <Text style={styles.hintText}>Transcribing and analysing</Text>
            </>
          ) : (
            <>
              <Pressable onPress={stopRecording}>
                <View style={styles.recordCircle} />
              </Pressable>
              <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
              <Text style={styles.hintText}>Tap to stop</Text>
            </>
          )}
        </View>
      )}

      {mode == "text" && (
        <View style={styles.centerContent}>
          <Text style={styles.title}>Write your entry</Text>
          <TextInput
            style={styles.textInput}
            multiline
            placeholder="What's on your mind?"
            placeholderTextColor={colors.textSecondary}
            value={text}
            onChangeText={setText}
            editable={!isProcessing}
          />
          <Text style={styles.hintText}>
            {text.trim().split(/\s+/).filter(Boolean).length} / 500 words
          </Text>
          <Pressable
            style={[styles.saveButton, isProcessing && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={isProcessing}
          >
            <Text style={styles.saveText}>
              {isProcessing ? "Saving…" : "Save entry"}
            </Text>
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
  recordCircleIdle: {
    backgroundColor: colors.surface,
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

  yesterdayButton: {
    position: "absolute",
    bottom: 48,
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  yesterdayText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.accent,
    textDecorationLine: "underline",
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