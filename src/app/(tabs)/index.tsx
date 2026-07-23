import { useState, useRef } from "react";
import { Text, View, StyleSheet, Pressable, ScrollView, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { colors, fonts } from "../../constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const recentDays = [
  { day: "Mon", mood: colors.mood.veryLow },
  { day: "Tue", mood: colors.mood.low },
  { day: "Wed", mood: colors.mood.neutral },
  { day: "Thu", mood: colors.mood.good },
  { day: "Fri", mood: colors.mood.great },
  { day: "Sat", mood: colors.mood.neutral },
  { day: "Today", mood: colors.mood.great },
];

const streakCount = 5;

const summaries = [
  {
    label: "Last week",
    title: "A steady week",
    text: "You mentioned feeling more energized midweek, especially after Wednesday's walk. Thursday and Friday carried a calmer, more reflective tone.",
  },
  {
    label: "Last month",
    title: "Finding your rhythm",
    text: "Your entries last month leaned optimistic overall, with a few quieter stretches around the second week. Recurring themes: work deadlines, evening walks, and catching up with friends.",
  },
];

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

function SummaryCard() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const PEEK = 4;
  const GAP = 12;
  const CARD_WIDTH = SCREEN_WIDTH - 48 - PEEK * 2;
  const SNAP_INTERVAL = CARD_WIDTH + GAP;

  const onMomentumScrollEnd = (e: any) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / SNAP_INTERVAL);
    setIndex(newIndex);
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
        {summaries.map((item, i) => (
          <Pressable
            key={i}
            style={[
              styles.summaryCard,
              { width: CARD_WIDTH, marginRight: GAP },
            ]}
            onPress={() => router.push("/(tabs)/insights")}
          >
            <View style={styles.summaryHeaderRow}>
              <Text style={styles.summaryLabel}>{item.label}</Text>
              <View style={styles.dotsRow}>
                {summaries.map((_, d) => (
                  <View
                    key={d}
                    style={[styles.dot, d === index && styles.dotActive]}
                  />
                ))}
              </View>
            </View>
            <Text style={styles.summaryTitle}>{item.title}</Text>
            <Text style={styles.summaryText}>{item.text}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export default function Home() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View entering={FadeInDown.duration(400).delay(0)}>
        <Text style={styles.greeting}>Good evening</Text>
        <Text style={styles.date}>Tuesday, 22 July</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(80)}>
        <AnimatedPressable
          style={styles.newEntryButton}
          onPress={() => router.push("/new-entry")}
        >
          <Text style={styles.newEntryText}>Daily entry</Text>
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
        <SummaryCard />
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