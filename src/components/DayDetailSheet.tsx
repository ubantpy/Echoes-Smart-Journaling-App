import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, View, StyleSheet, Pressable, ScrollView } from "react-native";
import Animated, {
  useAnimatedStyle,
  SharedValue,
} from "react-native-reanimated";
import { colors, fonts } from "../constants/theme";
import { Entry } from "../lib/types";
import { getMoodColour, formatLongDate, MOOD_LABELS } from "../lib/calendarUtils";

const SHEET_HEIGHT = 500;
export { SHEET_HEIGHT };

interface DayDetailSheetProps {
  entry: Entry;
  translateY: SharedValue<number>;
  onClose: () => void;
}

/**
 * Bottom sheet that slides up from the bottom to show a day's full entry detail.
 * Tap the handle bar or the backdrop to dismiss.
 */
export function DayDetailSheet({ entry, translateY, onClose }: DayDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const colour = getMoodColour(entry);
  const moodLabel = entry.sentimentLabel ? MOOD_LABELS[entry.sentimentLabel] : null;

  return (
    <Animated.View style={[styles.sheet, sheetStyle]}>
      {/* Handle bar — tapping closes the sheet */}
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
        {/* Date heading and mood badge */}
        <View style={styles.sheetHeaderRow}>
          <Text style={styles.sheetDate}>{formatLongDate(entry.entryDate)}</Text>
          {moodLabel && colour && (
            <View style={[styles.moodBadge, { backgroundColor: colour }]}>
              <Text style={styles.moodBadgeText}>{moodLabel}</Text>
            </View>
          )}
        </View>

        {/* Shown when the sentiment model was not confident */}
        {entry.lowConfidence && (
          <Text style={styles.lowConfidenceNote}>
            Confidence low — sentiment may be inaccurate
          </Text>
        )}

        {/* Main journal entry text */}
        <Text style={styles.sheetEntryText}>{entry.mainText}</Text>

        {/* Quick notes — always shown; displays empty state when none exist */}
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
});