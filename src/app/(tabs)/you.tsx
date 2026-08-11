import { useState, useCallback } from "react";
import { Text, View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { colors, fonts } from "../../constants/theme";
import { getStreak, getLongestStreak, getTotalEntries, getMoodDistribution } from "../../lib/db";
import { MaterialIcons } from "@expo/vector-icons";

/**Maps sentiment labels to display config - order determines bar segment order*/
const MOOD_CONFIG = [
  { key: "very_positive", label: "Great", color: colors.mood.great},
  { key: "positive", label: "Good", color: colors.mood.good},
  { key: "neutral", label: "Neutral",  color: colors.mood.neutral},
  { key: "negative", label: "Low", color: colors.mood.low},
  { key: "very_negative", label: "Very low", color: colors.mood.veryLow},
];

export default function You() {
  const router = useRouter();
  const [distribution, setDistribution] = useState<Record<string, number>>({});
  const [totalEntries, setTotalEntries] = useState(0);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);

  // Refetch all stats whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setDistribution(getMoodDistribution());
      setTotalEntries(getTotalEntries());
      setStreak(getStreak());
      setLongestStreak(getLongestStreak());
    }, [])
  );

  // Use only entries that have a sentiment label for percentage calculations
  const totalWithMood = MOOD_CONFIG.reduce((sum, m) => sum + (distribution[m.key] ?? 0), 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>You</Text>
        <Pressable
          style={styles.settingsButton}
          onPress={() => router.push("/settings")}
        >
          <MaterialIcons name="settings" color={colors.textSecondary} style={styles.settingsIcon}/>
        </Pressable>
      </View>

      <Animated.View entering={FadeInDown.duration(400).delay(0)}>
        <Text style={styles.sectionLabel}>Mood distribution</Text>
        <View style={styles.distributionBar}>
          {MOOD_CONFIG.map((item) => {
            const count = distribution[item.key] ?? 0;
            // Skip segments with no entries so the bar stays clean
            if (count == 0) return null;
            return (
              <View key={item.key} style={{ flex: count, backgroundColor: item.color }} />
            );
          })}
        </View>
        <View style={styles.legend}>
          {MOOD_CONFIG.map((item) => {
            const count = distribution[item.key] ?? 0;
            const pct = totalWithMood > 0
              ? Math.round((count / totalWithMood) * 100)
              : 0;
            return (
              <View key={item.key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendLabel}>{item.label}</Text>
                <Text style={styles.legendCount}>{pct}%</Text>
              </View>
            );
          })}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(80)}>
        <Text style={styles.sectionLabel}>Consistency</Text>
        <View style={[styles.statsCard, { position: "relative" }]}>
          <View style={styles.cardHighlight} />
          {[
            { label: "Total entries", value: String(totalEntries)},
            { label: "Current streak", value: `${streak} days`},
            { label: "Longest streak", value: `${longestStreak} days`},
          ].map((stat, i, arr) => (
            <View
              key={i}
              style={[styles.statRow, i !== arr.length - 1 && styles.statRowDivider]}
            >
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  settingsButton: {
    padding: 4,
  },
  settingsIcon: {
    fontSize: 28,
  },
  sectionLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 32,
    marginBottom: 12,
  },
  distributionBar: {
    flexDirection: "row",
    height: 14,
    borderRadius: 7,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2e3530",
  },
  legend: {
    marginTop: 16,
    gap: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 4,
    marginRight: 10,
  },
  legendLabel: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
  },
  legendCount: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 20,
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
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  statRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  statLabel: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  statValue: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.textPrimary,
  },
});