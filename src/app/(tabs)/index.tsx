import { useState, useRef, useCallback, useEffect  } from "react";
import { Text, View, StyleSheet, Pressable, ScrollView, Dimensions } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  runOnJS,
} from "react-native-reanimated";
import { colors, fonts } from "../../constants/theme";
import { getRecentEntries, getEntryForDate, getStreak, getSummary } from "../../lib/db";
import { Entry, Summary } from "../../lib/types";
import { getTodayDate, getLastNDates } from "../../lib/dateUtils";
import { getLastWeekRange, getLastMonthRange, formatPeriodLabel } from "../../lib/summaryUtils";
import { SummaryCard, EchoCard, buildEchoCard } from "../../components/SummaryCard";
import { generateSummariesIfNeeded } from "../../lib/generateSummaries";
import { DayDetailSheet, SHEET_HEIGHT } from "../../components/DayDetailSheet";
import { MaterialIcons } from "@expo/vector-icons";
import { moodColourMap, moodIconMap } from "../../lib/sentiment";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**Take date YYYY-MM-DD and turn either into Today or weekday (Wed, Thu...)*/
function formatDayLabel(dateStr: string): string {
  const todayStr = getTodayDate();
  const date = new Date(dateStr + "T00:00:00");
  // Calculate how many days apart 'today' and 'date' are
  if (dateStr == todayStr) return "Today";
  return date.toLocaleDateString("en-GB", { weekday: "short" });
};

/** Returns a time-appropriate greeting*/
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour > 3 && hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**Returns today's date formatted for display, e.g. "Thursday, 7 August"*/
function getDisplayDate(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function AnimatedPressable({
  style,
  onPress,
  children,
}: {
  style: any;
  onPress?: () => void;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={style}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.98, { duration: 80 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 120 });
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export default function Home() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [hasEntryToday, setHasEntryToday] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [echoCards, setEchoCards] = useState<EchoCard[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetY = useSharedValue(SHEET_HEIGHT);

  /** Opens the day detail sheet for the tapped entry */
  const openSheet = useCallback((entry: Entry) => {
    setSelectedEntry(entry);
    setSheetOpen(true);
    sheetY.value = withTiming(0, { duration: 300 });
  }, []);

  /** Closes the day detail sheet */
  const closeSheet = useCallback(() => {
    sheetY.value = withTiming(SHEET_HEIGHT, { duration: 260 }, () => {
      runOnJS(setSheetOpen)(false);
      runOnJS(setSelectedEntry)(null);
    });
  }, []);

  useFocusEffect(
  useCallback(() => {
    // Generate echoes first, then fetch everything so the screen is always current
    generateSummariesIfNeeded().then(() => {
      // Refetch all home screen data whenever the screen comes into focus
      setEntries(getRecentEntries(7));
      setHasEntryToday(!!getEntryForDate(getTodayDate()));
      setStreakCount(getStreak());

      // Build echo cards from SQLite - always show both, real or placeholder
      const week = getLastWeekRange();
      const month = getLastMonthRange();
      setEchoCards([
        buildEchoCard("weekly", week.start, getSummary("weekly", week.start)),
        buildEchoCard("monthly", month.start, getSummary("monthly", month.start)),
      ]);
    });
  }, [])
);

  const entryMap = new Map(entries.map((e) => [e.entryDate, e]));

  const recentDays = getLastNDates(7).map((dateStr) => {
    const entry = entryMap.get(dateStr);
    return {
      day: formatDayLabel(dateStr),
      moodColor: entry && entry.sentimentLabel ? moodColourMap[entry.sentimentLabel] : null,
      moodIcon: entry && entry.sentimentLabel ? moodIconMap[entry.sentimentLabel] : null,
    };
  });

  return (
    <View style={styles.outerContainer}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View entering={FadeInDown.duration(400).delay(0)}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.date}>{getDisplayDate()}</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(80)}>
        <AnimatedPressable
          style={[styles.newEntryButton, hasEntryToday && styles.newEntryButtonDone]}
          onPress={() => {
            if (hasEntryToday) {
              alert("You've already written today's entry. Use Quick Entry to add a note.");
              return;
            }
            router.push("/new-entry");
          }}
        >
          <View style={styles.buttonHighlight} />
          <Text style={styles.newEntryText}>
            {hasEntryToday ? "Entry done ✓" : "Daily entry"}
          </Text>
        </AnimatedPressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(140)}>
        <AnimatedPressable
          style={styles.quickEntryButton}
          onPress={() => router.push("/quick-entry")}
        >
          <View style={styles.buttonHighlightSubtle} />
          <Text style={styles.quickEntryText}>Quick entry</Text>
        </AnimatedPressable>
      </Animated.View>

      <Animated.View
        style={styles.streakRow}
        entering={FadeInDown.duration(400).delay(200)}
      >
        <MaterialIcons name="local-fire-department" size={16} color={streakCount == 0 ? colors.mood.veryLow : colors.mood.great} />
        <Text style={styles.streakText}>{streakCount} day streak</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(260)}>
        <Text style={styles.sectionLabel}>Looking back</Text>
        <SummaryCard cards={echoCards} />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(320)}>
        <Text style={styles.sectionLabel}>Recent days</Text>
        <View style={styles.stripRow}>
          {recentDays.map((item, i) => {
            const entry = entryMap.get(getLastNDates(7)[i]);
            return (
              <Pressable
                key={i}
                style={styles.stripItem}
                onPress={() => entry && openSheet(entry)}
                disabled={!entry}
              >
                {item.moodIcon && item.moodColor ? (
                  <View style={[styles.blob,
                  { backgroundColor: item.moodColor, justifyContent: "center", alignItems: "center" }]}>
                    <MaterialIcons
                      name={item.moodIcon}
                      size={24}
                      color={colors.background}
                    />
                  </View>
                ) : (
                  <View
                    style={[
                      styles.blob,
                      item.day == "Today"
                        ? { backgroundColor: "transparent", borderWidth: 2, borderColor: colors.accent }
                        : styles.blobEmpty,
                    ]}
                  />
                )}
                <Text style={styles.stripLabel}>{item.day}</Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </ScrollView>

      {sheetOpen && (
        <Pressable style={styles.backdrop} onPress={closeSheet} />
      )}

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
  content: {
    padding: 24,
    paddingTop: 64,
    paddingBottom: 48,
  },
  greeting: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  date: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  newEntryButton: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: "center",
    marginTop: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  newEntryButtonDone: {
    backgroundColor: colors.accent,
    opacity: 0.85,
  },
  newEntryText: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.background,
  },
  quickEntryButton: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#2e3530",
    overflow: "hidden",
  },
  quickEntryText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.textPrimary,
  },
  buttonHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  buttonHighlightSubtle: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  streakRow: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  streakText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  sectionLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 32,
    marginBottom: 12,
  },
  stripRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stripItem: {
    alignItems: "center",
  },
  blob: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  blobEmpty: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#2e3530",
  },
  stripLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 6,
  },
  outerContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
});