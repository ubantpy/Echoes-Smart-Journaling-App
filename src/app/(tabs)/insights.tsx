import { useState, useCallback, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Text,
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
} from "react-native";
import { useFocusEffect } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  SharedValue,
} from "react-native-reanimated";
import { colors, fonts } from "../../constants/theme";
import { getEntriesInRange } from "../../lib/db";
import { Entry } from "../../lib/types";
import { getTodayDate, formatDateString } from "../../lib/dateUtils";
import { MONTH_NAMES,
  MONTH_NAMES_SHORT,
  MOOD_COLOURS,
  MOOD_LABELS,
  getMoodColour,
  buildMonthGrid,
  buildYearColumns,
  formatLongDate, } from "../../lib/calendarUtils";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Layout constants 
const OUTER_PADDING = 24;
const CARD_PADDING = 16;

/** Mood blob diameter in month view - derived from equal cell share of available width */
const MONTH_BLOB = Math.floor(
  (SCREEN_WIDTH - OUTER_PADDING * 2 - CARD_PADDING * 2) / 7
) - 12;

/** Total horizontal space available inside the calendar card */
const AVAILABLE_WIDTH = SCREEN_WIDTH - OUTER_PADDING * 2 - CARD_PADDING * 2;
/** ceil(366 / 21) = 18 columns covers any year */
const NUM_YEAR_COLS = 12;
/** Gap between columns and rows */
const YEAR_GAP = 2;
/** Square cell size - computed so all 18 columns fit without horizontal scroll */
const YEAR_CELL = Math.floor((AVAILABLE_WIDTH - (NUM_YEAR_COLS - 1) * YEAR_GAP) / NUM_YEAR_COLS);
/** Full column stride including gap */
const YEAR_COL_WIDTH = YEAR_CELL + YEAR_GAP;

/** Slide-up height of the day detail bottom sheet */
const SHEET_HEIGHT = 500;

// Static data 
const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

// Helper functions 

/**
 * Returns the week-column index at which each month first appears in the year grid.
 * Used to position the month name labels above the contribution columns.
 */
function getMonthLabelPositions(
  weeks: (string | null)[][]
): { label: string; weekIndex: number }[] {
  const positions: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;

  weeks.forEach((week, weekIndex) => {
    const firstDate = week.find((d) => d != null);
    if (!firstDate) return;
    const month = new Date(firstDate + "T00:00:00").getMonth();
    if (month != lastMonth) {
      positions.push({ label: MONTH_NAMES_SHORT[month], weekIndex });
      lastMonth = month;
    }
  });

  return positions;
}

// DayDetailSheet 
interface DaySheetProps {
  entry: Entry;
  translateY: SharedValue<number>;
  onClose: () => void;
}

/**
 * Bottom sheet that slides up from the bottom to show a day's full entry detail.
 * Tap the handle bar or the backdrop (rendered in the parent) to dismiss.
 * Swipe-to-dismiss can be wired in later via react-native-gesture-handler.
 */
function DayDetailSheet({ entry, translateY, onClose }: DaySheetProps) {
    const insets = useSafeAreaInsets();
    const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const colour = getMoodColour(entry);
  const moodLabel = entry.sentimentLabel ? MOOD_LABELS[entry.sentimentLabel] : null;

  return (
    <Animated.View style={[styles.sheet, sheetStyle]}>
      {/* Handle bar - tapping it closes the sheet */}
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
            Confidence low - sentiment may be inaccurate
          </Text>
        )}

        {/* Main journal entry text */}
        <Text style={styles.sheetEntryText}>{entry.mainText}</Text>

        {/* Quick notes - always shown, displays empty state when none exist */}
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

// MonthCalendar
interface MonthCalendarProps {
  year: number;
  month: number; // 0-indexed (0 = January)
  entryMap: Map<string, Entry>;
  todayStr: string;
  onPrev: () => void;
  onNext: () => void;
  canGoNext: boolean;
  onDayPress: (entry: Entry) => void;
}

/** Monthly grid calendar with mood-coloured blobs and month navigation arrows */
function MonthCalendar({
  year,
  month,
  entryMap,
  todayStr,
  onPrev,
  onNext,
  canGoNext,
  onDayPress,
}: MonthCalendarProps) {
  // Recompute only when year/month changes
  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  return (
    <View>
      {/* Navigation row: prev arrow, month+year label, next arrow */}
      <View style={styles.monthNavRow}>
        <Pressable onPress={onPrev} hitSlop={12} style={styles.navArrow}>
          <Text style={styles.navArrowText}>{'<'}</Text>
        </Pressable>
        <Text style={styles.monthTitle}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <Pressable
          onPress={onNext}
          hitSlop={12}
          style={styles.navArrow}
          disabled={!canGoNext}
        >
          <Text style={[styles.navArrowText, !canGoNext && styles.navArrowDisabled]}>
            {'>'}
          </Text>
        </Pressable>
      </View>

      {/* M T W T F S S column headers */}
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((lbl, i) => (
          <Text key={i} style={styles.weekdayLabel}>{lbl}</Text>
        ))}
      </View>

      {/* Day cells rendered row-by-row - avoids flexWrap alignment bugs */}
      <View style={styles.monthGrid}>
        {Array.from({ length: Math.ceil(cells.length / 7) }, (_, rowIndex) => {
          const rowCells = cells.slice(rowIndex * 7, rowIndex * 7 + 7);
          return (
            <View key={rowIndex} style={styles.monthRow}>
              {rowCells.map((dateStr, colIndex) => {
                if (!dateStr) return <View key={colIndex} style={styles.monthCell} />;

                const entry = entryMap.get(dateStr);
                const colour = getMoodColour(entry);
                const isToday = dateStr == todayStr;
                const isFuture = dateStr > todayStr;

                return (
                  <Pressable
                    key={colIndex}
                    style={styles.monthCell}
                    onPress={() => entry && onDayPress(entry)}
                    disabled={!entry || isFuture}
                  >
                    <View
                      style={[
                        styles.monthBlob,
                        colour
                          ? { backgroundColor: colour }
                          : isToday
                          ? { borderWidth: 2, borderColor: colors.accent }
                          : { borderWidth: 1, borderColor: "#2e3530" },
                        isFuture && styles.dimmed,
                      ]}
                    />
                    <Text
                      style={[
                        styles.dayNumber,
                        isToday && { color: colors.accent },
                        isFuture && styles.dimmedText,
                      ]}
                    >
                      {new Date(dateStr + "T00:00:00").getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// YearCalendar 

interface YearCalendarProps {
  year: number;
  entryMap: Map<string, Entry>;
  todayStr: string;
  onDayPress: (entry: Entry) => void;
}

/** Full-year contribution grid */
function YearCalendar({ year, entryMap, todayStr, onDayPress }: YearCalendarProps) {
  // Recompute only when year changes
  const weeks = useMemo(() => buildYearColumns(year), [year]);
  const monthLabels = useMemo(() => getMonthLabelPositions(weeks), [weeks]);

  return (
    <View>
      {/* Month name labels row - sits above the grid, labels placed by week-column index */}
      <View style={styles.yearMonthLabelRow}>
        {monthLabels.map(({ label, weekIndex }) => (
          <Text
            key={label}
            style={[styles.yearMonthLabel, { left: weekIndex * YEAR_COL_WIDTH }]}
          >
            {label}
          </Text>
        ))}
      </View>

      {/* Week columns rendered below the label row - no overlap */}
      <View style={styles.yearGrid}>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.yearColumn}>
            {week.map((dateStr, di) => {
              if (!dateStr) return <View key={di} style={styles.yearDotWrap} />;

              const entry = entryMap.get(dateStr);
              const colour = getMoodColour(entry);
              const isToday = dateStr == todayStr;
              const isFuture = dateStr > todayStr;

              return (
                <Pressable
                  key={di}
                  style={styles.yearDotWrap}
                  onPress={() => entry && onDayPress(entry)}
                  disabled={!entry || isFuture}
                >
                  <View
                    style={[
                      styles.yearDot,
                      colour
                        ? { backgroundColor: colour }
                        : isToday
                        ? { borderWidth: 1.5, borderColor: colors.accent }
                        : isFuture
                        ? { borderWidth: 1, borderColor: "#232826" }
                        : { borderWidth: 1, borderColor: "#2e3530" },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

// Insights screen 

/** Insights screen - calendar view, patterns, and Echoes summaries */
export default function Insights() {
  const todayStr = getTodayDate();
  const todayDate = new Date(todayStr + "T00:00:00");
  const currentYear = todayDate.getFullYear();
  const currentMonthIndex = todayDate.getMonth();

  // Which calendar layout is active
  const [view, setView] = useState<"month" | "year">("month");

  // Which month is displayed in month view
  const [calYear, setCalYear] = useState(currentYear);
  const [calMonth, setCalMonth] = useState(currentMonthIndex);

  // All entries loaded for the visible date range
  const [entries, setEntries] = useState<Entry[]>([]);

  // Bottom sheet state
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetY = useSharedValue(SHEET_HEIGHT);

  /** O(1) lookup map from YYYY-MM-DD → Entry, rebuilt only when entries change */
  const entryMap = useMemo(
    () => new Map(entries.map((e) => [e.entryDate, e])),
    [entries]
  );

  /** Reload entry data whenever the screen gains focus */
  useFocusEffect(
    useCallback(() => {
      // Load two years back so navigating to the previous year still shows real data
      const rangeStart = `${currentYear - 1}-01-01`;
      setEntries(getEntriesInRange(rangeStart, todayStr));
    }, [])
  );

  /** Slides the sheet up and pins the tapped entry to show */
  const openSheet = useCallback((entry: Entry) => {
    setSelectedEntry(entry);
    setSheetOpen(true);
    sheetY.value = withTiming(0, { duration: 300 });
  }, []);

  /** Slides the sheet back down and clears the selected entry after animation ends */
  const closeSheet = useCallback(() => {
    sheetY.value = withTiming(SHEET_HEIGHT, { duration: 260 }, () => {
      runOnJS(setSheetOpen)(false);
      runOnJS(setSelectedEntry)(null);
    });
  }, []);

  /** Navigate back one calendar month */
  const goToPrevMonth = useCallback(() => {
    if (calMonth == 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  }, [calMonth]);

  /** Navigate forward one calendar month - no-op when already on current month */
  const goToNextMonth = useCallback(() => {
    if (calMonth == 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  }, [calMonth]);

  /** Navigate back one year in year view */
  const goToPrevYear = useCallback(() => {
    setCalYear((y) => y - 1);
  }, []);

  /** Navigate forward one year - no-op when already on current year */
  const goToNextYear = useCallback(() => {
    setCalYear((y) => Math.min(y + 1, currentYear));
  }, [currentYear]);

  // Disallow navigating forward beyond the current month
  const canGoNext =
    calYear < currentYear ||
    (calYear == currentYear && calMonth < currentMonthIndex);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Insights</Text>

        {/* Calendar card - toggle and calendar are one unified block */}
        <View style={styles.calendarCard}>
          <View style={styles.cardHighlight} />
          <View style={styles.pillHeader}>
            <View style={styles.pillRow}>
              <Pressable
                style={[styles.pill, view == "month" && styles.pillActive]}
                onPress={() => setView("month")}
              >
                <Text style={[styles.pillText, view == "month" && styles.pillTextActive]}>
                  Month
                </Text>
              </Pressable>
              <Pressable
                style={[styles.pill, view == "year" && styles.pillActive]}
                onPress={() => setView("year")}
              >
                <Text style={[styles.pillText, view == "year" && styles.pillTextActive]}>
                  Year
                </Text>
              </Pressable>
            </View>
            {/* Year navigation - only visible in year view */}
            {view == "year" && (
              <View style={styles.yearNavRow}>
                <Pressable onPress={goToPrevYear} hitSlop={12} style={styles.navArrow}>
                  <Text style={styles.navArrowText}>{'<'}</Text>
                </Pressable>
                <Text style={styles.yearNumber}>{calYear}</Text>
                <Pressable
                  onPress={goToNextYear}
                  hitSlop={12}
                  style={styles.navArrow}
                  disabled={calYear >= currentYear}
                >
                  <Text style={[styles.navArrowText, calYear >= currentYear && styles.navArrowDisabled]}>
                    {'>'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
          {view == "month" ? (
            <MonthCalendar
              year={calYear}
              month={calMonth}
              entryMap={entryMap}
              todayStr={todayStr}
              onPrev={goToPrevMonth}
              onNext={goToNextMonth}
              canGoNext={canGoNext}
              onDayPress={openSheet}
            />
          ) : (
            <YearCalendar
              year={calYear}
              entryMap={entryMap}
              todayStr={todayStr}
              onDayPress={openSheet}
            />
          )}
        </View>

        {/* Patterns and Echoes sections added in subsequent steps */}
      </ScrollView>

      {/* Semi-transparent backdrop - tapping it closes the sheet */}
      {sheetOpen && (
        <Pressable style={styles.backdrop} onPress={closeSheet} />
      )}

      {/* Day detail sheet - only mounted when an entry is selected */}
      {selectedEntry && (
        <DayDetailSheet
          entry={selectedEntry}
          translateY={sheetY}
          onClose={closeSheet}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: OUTER_PADDING,
    paddingTop: 64,
    paddingBottom: 48,
  },
  screenTitle: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 20,
  },

  // Pill toggle 
  pillRow: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: "#2e3530",
    alignSelf: "flex-start",
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pillActive: {
    backgroundColor: colors.accent,
  },
  pillText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.background,
  },

  // Calendar card 
  calendarCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: CARD_PADDING,
    borderWidth: 1,
    borderColor: "#2e3530",
    overflow: "hidden",
  },
  cardHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
  },

  // Month view 
  monthNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  navArrow: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  navArrowText: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.textPrimary,
    lineHeight: 28,
  },
  navArrowDisabled: {
    color: colors.textSecondary,
    opacity: 0.35,
  },
  monthTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  monthGrid: {
    // rows rendered via monthRow
  },
  monthRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  monthCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  monthBlob: {
    width: MONTH_BLOB,
    height: MONTH_BLOB,
    borderRadius: Math.round(MONTH_BLOB / 3),
  },
  dayNumber: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 3,
  },
  dimmed: {
    opacity: 0.2,
  },
  dimmedText: {
    opacity: 0.3,
  },

  // Year view 
  yearMonthLabelRow: {
    height: 16,
    marginBottom: 4,
    position: "relative",
  },
  yearMonthLabel: {
    position: "absolute",
    fontFamily: fonts.regular,
    fontSize: 8,
    color: colors.textSecondary,
    top: 0,
  },
  yearGrid: {
    flexDirection: "row",
  },
  yearColumn: {
    flexDirection: "column",
    marginRight: YEAR_GAP,
  },
  yearDotWrap: {
    width: YEAR_CELL,
    height: YEAR_CELL,
    marginBottom: YEAR_GAP,
  },
  yearDot: {
    width: YEAR_CELL,
    height: YEAR_CELL,
    borderRadius: 2,
  },
  pillHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  yearNumber: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.textPrimary,
    letterSpacing: -1,
    opacity: 0.9,
  },
  yearNavRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  // Bottom sheet 
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
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