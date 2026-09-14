import { useState, useEffect, useRef } from "react";
import { Text, View, StyleSheet, Pressable, TextInput } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAudioRecorder, AudioModule, RecordingPresets } from "expo-audio";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withDelay,
} from "react-native-reanimated";
import { colors, fonts } from "../constants/theme";
import { insertEntry, getEntryForDate } from "@/lib/db";
import { analyseSentiment } from "@/lib/sentiment";
import { transcribeAudio, type TranscribeResult } from "@/lib/transcribe";
import { getTodayDate } from "@/lib/dateUtils";
import { isConnected } from "@/lib/connectivity";
import { OfflineBanner } from "@/components/OfflineBanner";

type Mode = "choose" | "recording" | "text";

/** Size of the recording squircle in px */
const SQUIRCLE = 140;

/** Converts total seconds into m:ss display string e.g. 75 -> "1:15" */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Three rings that expand and fade outward from the recording squircle,
 * giving a visual pulse indicating active recording. */
function PulsingRings() {
  const s1 = useSharedValue(1);
  const s2 = useSharedValue(1);
  const s3 = useSharedValue(1);
  const o1 = useSharedValue(0.55);
  const o2 = useSharedValue(0.55);
  const o3 = useSharedValue(0.55);

  useEffect(() => {
    const dur = 2000;
    // Ring 1 - starts immediately
    s1.value = withRepeat(withTiming(1.7, { duration: dur }), -1, false);
    o1.value = withRepeat(withTiming(0, { duration: dur }), -1, false);
    // Ring 2 - staggered 650ms
    s2.value = withDelay(650, withRepeat(withTiming(1.7, { duration: dur }), -1, false));
    o2.value = withDelay(650, withRepeat(withTiming(0, { duration: dur }), -1, false));
    // Ring 3 - staggered 1300ms
    s3.value = withDelay(1300, withRepeat(withTiming(1.7, { duration: dur }), -1, false));
    o3.value = withDelay(1300, withRepeat(withTiming(0, { duration: dur }), -1, false));
  }, []);

  const r1 = useAnimatedStyle(() => ({ transform: [{ scale: s1.value }], opacity: o1.value }));
  const r2 = useAnimatedStyle(() => ({ transform: [{ scale: s2.value }], opacity: o2.value }));
  const r3 = useAnimatedStyle(() => ({ transform: [{ scale: s3.value }], opacity: o3.value }));

  return (
    <>
      <Animated.View style={[styles.ring, r3]} />
      <Animated.View style={[styles.ring, r2]} />
      <Animated.View style={[styles.ring, r1]} />
    </>
  );
}

export default function NewEntry() {
  const router = useRouter();
  const { yesterday } = useLocalSearchParams<{ yesterday?: string }>();
  const forcedYesterday = yesterday == "true";
  const [mode, setMode] = useState<Mode>("choose");
  const [text, setText] = useState("");

  // expo-audio hook - must be called at component level
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Recording state
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Automatically stop recording at 3 minutes (180 sec)
  useEffect(() => {
    if (elapsed >= 180){
      stopRecording();
    }
  }, [elapsed]);

  // Processing and connectivity state
  const [isProcessing, setIsProcessing] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Which date this entry is for - defaults to today, can switch to yesterday
  const [targetDate, setTargetDate] = useState<string>(() => {
    if (yesterday === "true") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      return `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
    }
    return getTodayDate();
  });
  const [hasEntryYesterday, setHasEntryYesterday] = useState(false);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  /** Check on mount whether yesterday already has an entry */
  useEffect(() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const str = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
    setHasEntryYesterday(!!getEntryForDate(str));
  }, []);

  /** Asks for microphone permission and starts recording */
  const startRecording = async () => {
    const { granted } = await AudioModule.requestRecordingPermissionsAsync();
    if (!granted) return;
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
  };

  /** Stops recording, transcribes, analyses sentiment, saves entry */
  const stopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsProcessing(true);
    await audioRecorder.stop();
    const uri = audioRecorder.uri;
    if (!uri) { setIsProcessing(false); return; }

    const online = await isConnected();
    if (!online) {
      setIsProcessing(false);
      setBannerMessage("No internet - couldn't transcribe. Try again when connected.");
      return;
    }

    const result = await transcribeAudio(uri);

    if (!result.success) {
      setIsProcessing(false);
      setBannerMessage(
        result.reason === "timeout"
          ? "Transcription timed out - please try again."
          : "Transcription failed - please try again."
      );
      return;
    }

    const sentiment = await analyseSentiment(result.text);
    if (!sentiment) setBannerMessage("Entry saved - mood analysis unavailable right now.");

    insertEntry({
      entryDate: targetDate,
      mainText: result.text,
      sentimentLabel: sentiment?.label ?? undefined,
      sentimentConfidence: sentiment?.confidence ?? undefined,
    });

    setIsProcessing(false);
    router.dismiss();
  };

  /** Cancels the recording without transcribing or saving */
  const cancelRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    try {
      // Stop the mic
      await audioRecorder.stop();
    }
    catch (e) {
      // Catch in case the recorder was already stopped somehow
    }
    
    setElapsed(0);
    // Send user back to the start
    setMode("choose");
  };

  /** Saves a text entry - sentiment is optional, entry saves regardless */
  const handleSave = async () => {
    if (text.trim().length == 0) return;
    setIsProcessing(true);

    const online = await isConnected();
    let sentiment = null;

    if (online) {
      sentiment = await analyseSentiment(text.trim());
    } else {
      setBannerMessage("Entry saved - mood analysis unavailable offline.");
    }

    insertEntry({
      entryDate: targetDate,
      mainText: text.trim(),
      sentimentLabel: sentiment?.label ?? undefined,
      sentimentConfidence: sentiment?.confidence ?? undefined,
    });

    setIsProcessing(false);
    router.dismiss();
  };

  /** Toggles target date between today and yesterday */
  const toggleYesterday = () => {
    if (targetDate == getTodayDate()) {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      setTargetDate(`${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`);
    } else {
      setTargetDate(getTodayDate());
    }
  };

  return (
    <View style={styles.container}>
      {bannerMessage && (
        <OfflineBanner message={bannerMessage} onDismiss={() => setBannerMessage(null)} />
      )}

      {/* Top bar - date label and close button */}
      <View style={styles.topBar}>
        <Text style={styles.topLabel}>
          {targetDate == getTodayDate() ? "Today" : "Yesterday"}
        </Text>
        <Pressable onPress={() => router.dismiss()} hitSlop={12}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      {/* Choose mode */}
      {mode == "choose" && (
        <View style={styles.centerContent}>
          <Text style={styles.title}>
            {targetDate == getTodayDate() ? "New entry" : "Yesterday's entry"}
          </Text>
          <Text style={styles.subtitle}>Speak or write - your words, your way</Text>

          {/* Primary + secondary buttons grouped in one card */}
          <View style={styles.buttonGroup}>
            <View style={styles.cardHighlight} />
            <Pressable
              style={styles.primaryButton}
              onPress={() => { setMode("recording"); startRecording(); }}
            >
              <View style={styles.buttonHighlight} />
              <Text style={styles.primaryButtonText}>Start recording</Text>
            </Pressable>
            <View style={styles.groupDivider} />
            <Pressable style={styles.secondaryButton} onPress={() => setMode("text")}>
              <Text style={styles.secondaryButtonText}>Write instead</Text>
            </Pressable>
          </View>

          {!hasEntryYesterday && !forcedYesterday && (
            <Pressable style={styles.yesterdayButton} onPress={toggleYesterday}>
              <Text style={styles.yesterdayText}>
                {targetDate == getTodayDate()
                  ? "Adding for yesterday instead?"
                  : "← Back to today's entry"}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Recording mode  */}
      {mode == "recording" && (
        <View style={styles.centerContent}>
          {isProcessing ? (
            <View style={styles.recordingWrapper}>
              <View style={[styles.recordCircle, styles.recordCircleIdle]} />
              <Text style={styles.timerText}>Processing…</Text>
              <Text style={styles.hintText}>Transcribing and analysing</Text>
            </View>
          ) : (
            <View style={styles.recordingWrapper}>
              <Pressable onPress={stopRecording} style={styles.recordingOuter}>
                <PulsingRings />
                <View style={styles.recordCircle} />
              </Pressable>
              <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
              
              {/* Show countdown in the last 60 seconds, otherwise show hint */}
              {elapsed >= 120 ? (
                // Visual nudge for last 1min
                <Text style={styles.warningText}>
                  {180 - elapsed} seconds left
                </Text>
              ) : (
                <Text style={styles.hintText}>Tap circle to finish & save</Text>
              )}
              
              {/* Cancel recording button */}
              <Pressable style={styles.cancelButton} onPress={cancelRecording}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* Text mode */}
      {mode == "text" && (() => {
        const currentWords = text.trim().split(/\s+/).filter(Boolean).length;
        const isOverLimit = currentWords > 500;

        return (
          <View style={styles.textContent}>
            <Text style={styles.title}>Write your entry</Text>

            {/* Input wrapped in a card for border + highlight texture */}
            <View style={styles.inputCard}>
              <View style={styles.inputHighlight} />
              <TextInput
                style={styles.textInput}
                multiline
                placeholder="What's on your mind?"
                placeholderTextColor={colors.textSecondary}
                value={text}
                onChangeText={setText}
                editable={!isProcessing}
                autoFocus
              />
            </View>

            <Text style={[styles.wordCount, isOverLimit && { color: colors.mood.veryLow }]}>
              {currentWords} / 500 words
            </Text>

            <Pressable
              style={[
                styles.primaryButtonFull, 
                (isProcessing || isOverLimit || currentWords < 5) && { opacity: 0.6 }
              ]}
              onPress={handleSave}
              disabled={isProcessing || isOverLimit || currentWords == 0}
            >
              <View style={styles.buttonHighlight} />
              <Text style={styles.primaryButtonText}>
                {isProcessing ? "Saving…" : isOverLimit ? "Word limit reached" : "Save entry"}
              </Text>
            </Pressable>
          </View>
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Top bar
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

  // Choose mode
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 36,
    textAlign: "center",
  },

  // Primary + secondary grouped into one surface card
  buttonGroup: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2e3530",
    overflow: "hidden",
    position: "relative",
  },
  cardHighlight: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    zIndex: 1,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    margin: 12,
    marginBottom: 0,
    overflow: "hidden",
    position: "relative",
  },
  buttonHighlight: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  primaryButtonText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.background,
  },
  groupDivider: {
    height: 1,
    backgroundColor: "#2e3530",
    marginTop: 12,
  },
  secondaryButton: {
    paddingVertical: 18,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.textPrimary,
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

  // Recording mode
  recordingWrapper: {
    alignItems: "center",
  },
  // Pressable area larger than squircle so expanding rings don't swallow taps
  recordingOuter: {
    width: SQUIRCLE * 1.8,
    height: SQUIRCLE * 1.8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  ring: {
    position: "absolute",
    width: SQUIRCLE,
    height: SQUIRCLE,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  recordCircle: {
    width: SQUIRCLE,
    height: SQUIRCLE,
    borderRadius: 40,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  recordCircleIdle: {
    backgroundColor: colors.surface,
    borderColor: "#2e3530",
  },
  timerText: {
    fontFamily: fonts.bold,
    fontSize: 32,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  hintText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  warningText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.accent,
  },
  cancelButton: {
    marginTop: 32,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2e3530",
  },
  cancelButtonText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Text mode
  textContent: {
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
    marginBottom: 10,
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
    minHeight: 220,
    padding: 16,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textPrimary,
    textAlignVertical: "top",
  },
  wordCount: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "right",
    marginBottom: 20,
  },
  primaryButtonFull: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    width: "100%",
    overflow: "hidden",
    position: "relative",
  },
});