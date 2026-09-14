import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, View, StyleSheet, Pressable, ScrollView, Alert } from "react-native";
import Animated, {
  useAnimatedStyle,
  SharedValue,
} from "react-native-reanimated";
import { colors, fonts } from "../constants/theme";
import { Entry } from "../lib/types";
import { getMoodColour, formatLongDate, MOOD_COLOURS, MOOD_LABELS } from "../lib/calendarUtils";
import { useState } from "react";
import { SentimentLabel } from "../lib/types";
import { updateEntrySentiment, deleteEntry } from "../lib/db";

const SHEET_HEIGHT = 500;
export { SHEET_HEIGHT };

interface DayDetailSheetProps {
  entry: Entry;
  translateY: SharedValue<number>;
  onClose: () => void;
  /** Called after the user manually overrides the mood so the parent can refresh */
  onMoodChange?: (entryDate: string, label: SentimentLabel) => void;
  onDelete?: (entryDate: string) => void;
}

/**
 * Bottom sheet that slides up from the bottom to show a day's full entry detail.
 * Tap the handle bar or the backdrop to dismiss.
 */
export function DayDetailSheet({ entry, translateY, onClose, onMoodChange, onDelete }: DayDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Local override so the sheet updates immediately without needing a full reload
  const [overrideLabel, setOverrideLabel] = useState<SentimentLabel | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const activeLabel = overrideLabel ?? entry.sentimentLabel;
  const colour = activeLabel ? MOOD_COLOURS[activeLabel] : null;
  const moodLabel = activeLabel ? MOOD_LABELS[activeLabel] : null;

  /** Saves the manually selected mood to SQLite and updates local state */
  const handleMoodSelect = (label: SentimentLabel) => {
    updateEntrySentiment(entry.entryDate, label);
    setOverrideLabel(label);
    setPickerOpen(false);
    onMoodChange?.(entry.entryDate, label);
  };

  /**Delete an entry */
  const handleDelete = () => {
    Alert.alert(
      "Delete entry",
      "This entry will be permanently deleted. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteEntry(entry.entryDate);
            onClose();
            onDelete?.(entry.entryDate);
          },
        },
      ]
    );
  };

  return (
    <Animated.View style={[styles.sheet, sheetStyle]}>
      {/* Handle bar - tapping closes the sheet */}
      <Pressable style={styles.sheetHandle} onPress={onClose}>
        <View style={styles.handleBar} />
      </Pressable>

      <ScrollView
        style={styles.sheetScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.sheetScrollContent,
          { paddingBottom: 32 + insets.bottom },
        ]}
      >
        {/* Date heading and mood badge - badge is tappable to open mood picker */}
        <View style={styles.sheetHeaderRow}>
          <Text style={styles.sheetDate}>{formatLongDate(entry.entryDate)}</Text>
          {moodLabel && colour && (
            <Pressable
            style={[styles.moodBadge, { backgroundColor: colour }]}
            onPress={() => (entry.lowConfidence && !overrideLabel) || overrideLabel ? setPickerOpen((o) => !o) : null}
            disabled={!entry.lowConfidence && !overrideLabel}
          >
            <Text style={styles.moodBadgeText}>
              {moodLabel}{(entry.lowConfidence || overrideLabel) ? " ✎" : ""}
            </Text>
          </Pressable>
          )}
        </View>

        {/* Mood picker - inline row of 5 options, shown when badge is tapped */}
        {pickerOpen && (entry.lowConfidence || overrideLabel) && (
          <View style={styles.moodPicker}>
            {(["very_positive", "positive", "neutral", "negative", "very_negative"] as SentimentLabel[]).map((label) => (
              <Pressable
                key={label}
                style={[
                  styles.moodPickerOption,
                  { backgroundColor: MOOD_COLOURS[label] },
                  activeLabel === label && styles.moodPickerOptionActive,
                ]}
                onPress={() => handleMoodSelect(label)}
              >
                <Text style={styles.moodPickerText}>{MOOD_LABELS[label]}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Low confidence note - updated to mention the user can edit */}
        {entry.lowConfidence && (
          <Text style={styles.lowConfidenceNote}>
            Confidence low - tap the mood badge to correct it
          </Text>
        )}

        {/* Main journal entry text */}
        <Text style={styles.sheetEntryText}>{entry.mainText}</Text>

        {/* Quick notes - always shown; displays empty state when none exist */}
        <View style={styles.quickSection}>
          <Text style={styles.quickSectionLabel}>
            Quick notes · {entry.additionalEntries.length}
          </Text>
          {entry.additionalEntries.length > 0 ? (
            entry.additionalEntries.map((note, i) => (
              <View key={i} style={styles.quickNoteRow}>
                <Text style={styles.quickNoteIndex}>{i + 1}</Text>
                <Text style={styles.quickNoteText}>{note}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.quickNoteEmpty}>No quick notes for this day.</Text>
          )}
        </View>
        <Pressable style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Delete entry</Text>
        </Pressable>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "#2e3530",
    overflow: "hidden",
  },
  sheetHandle: {
    alignItems: "center",
    paddingVertical: 14,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3e4440",
  },
  sheetScroll: {
    flex: 1,
  },
  sheetScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 64,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetDate: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.textPrimary,
    flex: 1,
    marginRight: 12,
  },
  moodBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  moodBadgeText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.background,
  },
  lowConfidenceNote: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginBottom: 12,
  },
  sheetEntryText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 23,
    marginBottom: 20,
  },
  quickSection: {
    borderTopWidth: 1,
    borderTopColor: "#2e3530",
    paddingTop: 16,
  },
  quickSectionLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  quickNoteRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  quickNoteIndex: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.accent,
    width: 16,
  },
  quickNoteText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 21,
    flex: 1,
  },
  quickNoteEmpty: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  moodPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  moodPickerOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    opacity: 0.75,
  },
  moodPickerOptionActive: {
    opacity: 1,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  moodPickerText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.background,
  },
  deleteButton: {
    marginTop: 24,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#3e1515",
    backgroundColor: "#1a0a0a",
  },
  deleteButtonText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: "#e05555",
  },
});