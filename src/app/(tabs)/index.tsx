import { useState, useRef, useCallback } from "react";
import { Text, View, StyleSheet, Pressable, ScrollView, Dimensions } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { colors, fonts } from "../../constants/theme";
import { getRecentEntries, getEntryForDate, getStreak, getSummary } from "../../lib/db";
import { Entry, Summary } from "../../lib/types";
import { getTodayDate, getLastNDates } from "../../lib/dateUtils";
import { getLastWeekRange, getLastMonthRange, formatPeriodLabel } from "../../lib/summaryUtils";
import { generateSummariesIfNeeded } from "../../lib/generateSummaries";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const moodColourMap: Record<string, string> = {
  very_positive: colors.mood.great,
  positive: colors.mood.good,
  neutral: colors.mood.neutral,
  negative: colors.mood.low,
  very_negative: colors.mood.veryLow,
};
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

// Defines what each echo card shows - real or placeholder
type EchoCard = {
  label: string;
  title: string;
  text: string;
};

// Builds a display card from a real summary or returns a placeholder
function buildEchoCard(
  periodType: "weekly" | "monthly",
  start: string,
  summary: Summary | null
): EchoCard {
  const label = formatPeriodLabel(periodType, start);
  if (summary) {
    return { label, title: "Your echo", text: summary.summaryText };
  }
  // Placeholder - shown when not enough entries exist yet
  const periodWord = periodType == "weekly" ? "week" : "month";
  return {
    label,
    title: "No echo yet",
    text: `You haven't journaled enough last ${periodWord}. Keep going and you'll start seeing your echoes here.`,
  };
}

// Number of lines shown when the card is collapsed
const COLLAPSED_LINES = 3;

function SummaryCard({ cards }: { cards: EchoCard[] }) {
  const [index, setIndex] = useState(0);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const PEEK = 4;
  const GAP = 12;
  const CARD_WIDTH = SCREEN_WIDTH - 48 - PEEK * 2;
  const SNAP_INTERVAL = CARD_WIDTH + GAP;

  const onMomentumScrollEnd = (e: any) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / SNAP_INTERVAL);
    setIndex(newIndex);
  };

  // Toggle expanded state for a card, collapse if already expanded
  const handleCardPress = (i: number) => {
    setExpandedIndex(expandedIndex == i ? null : i);
  };

  return (
    <View style={{ marginHorizontal: -24 }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 24 + PEEK }}
        onMomentumScrollEnd={onMomentumScrollEnd}
      >
        {cards.map((item, i) => {
          const isExpanded = expandedIndex == i;
          return (
            <Pressable
              key={i}
              style={[styles.summaryCard, { width: CARD_WIDTH, marginRight: GAP }]}
              onPress={() => handleCardPress(i)}
            >
              <View style={styles.summaryHeaderRow}>
                <Text style={styles.summaryLabel}>{item.label}</Text>
                <View style={styles.dotsRow}>
                  {cards.map((_, d) => (
                    <View key={d} style={[styles.dot, d == index && styles.dotActive]} />
                  ))}
                </View>
              </View>
              <Text style={styles.summaryTitle}>{item.title}</Text>
              {/* Show limited lines when collapsed, full text when expanded */}
              <Text
                style={styles.summaryText}
                numberOfLines={isExpanded ? undefined : COLLAPSED_LINES}
              >
                {item.text}
              </Text>
              {/* Only show the toggle hint when the card has a real echo */}
              {item.title != "No echo yet" && (
                <Text style={styles.expandHint}>
                  {isExpanded ? "Show less" : "Read more"}
                </Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function Home() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [hasEntryToday, setHasEntryToday] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [echoCards, setEchoCards] = useState<EchoCard[]>([]);

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
      mood:
        entry && entry.sentimentLabel
          ? moodColourMap[entry.sentimentLabel]
          : colors.surface,
    };
  });

  return (
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
          <Text style={styles.quickEntryText}>Quick entry</Text>
        </AnimatedPressable>
      </Animated.View>

      <Animated.View
        style={styles.streakRow}
        entering={FadeInDown.duration(400).delay(200)}
      >
        <Text style={styles.streakText}>🔥 {streakCount} day streak</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(260)}>
        <Text style={styles.sectionLabel}>Looking back</Text>
        <SummaryCard cards={echoCards} />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(320)}>
        <Text style={styles.sectionLabel}>Recent days</Text>
        <View style={styles.stripRow}>
          {recentDays.map((item, i) => (
            <View key={i} style={styles.stripItem}>
              <View style={[styles.blob, { backgroundColor: item.mood }]} />
              <Text style={styles.stripLabel}>{item.day}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </ScrollView>
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
  },
  date: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  newEntryButton: {
    backgroundColor: colors.accent,
    borderRadius: 24,
    paddingVertical: 20,
    alignItems: "center",
    marginTop: 32,
  },
  newEntryButtonDone: {
    backgroundColor: colors.accent,
  },
  newEntryText: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.background,
  },
  quickEntryButton: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  quickEntryText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.textPrimary,
  },
  streakRow: {
    marginTop: 24,
    alignItems: "center",
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
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
  },
  summaryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.accent,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textSecondary,
    opacity: 0.4,
  },
  dotActive: {
    backgroundColor: colors.accent,
    opacity: 1,
  },
  summaryTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.textPrimary,
    marginTop: 10,
  },
  summaryText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  expandHint: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.accent,
    marginTop: 8,
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
    borderRadius: 12,
  },
  stripLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 6,
  },
});