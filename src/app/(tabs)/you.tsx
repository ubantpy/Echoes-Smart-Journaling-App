import { Text, View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { colors, fonts } from "../../constants/theme";

const moodCounts = [
  { mood: "great", label: "Great", count: 9, color: colors.mood.great },
  { mood: "good", label: "Good", count: 12, color: colors.mood.good },
  { mood: "neutral", label: "Neutral", count: 6, color: colors.mood.neutral },
  { mood: "low", label: "Low", count: 4, color: colors.mood.low },
  { mood: "veryLow", label: "Very low", count: 2, color: colors.mood.veryLow },
];

const totalEntries = moodCounts.reduce((sum, m) => sum + m.count, 0);

const stats = [
  { label: "Total entries", value: "33" },
  { label: "Current streak", value: "5 days" },
  { label: "Longest streak", value: "12 days" },
];

export default function You() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>You</Text>
        <Pressable
          style={styles.settingsButton}
          onPress={() => router.push("/settings")}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </Pressable>
      </View>

      <Animated.View entering={FadeInDown.duration(400).delay(0)}>
        <Text style={styles.sectionLabel}>Mood distribution</Text>
        <View style={styles.distributionBar}>
          {moodCounts.map((item, i) => (
            <View
              key={i}
              style={{
                flex: item.count,
                backgroundColor: item.color,
              }}
            />
          ))}
        </View>
        <View style={styles.legend}>
          {moodCounts.map((item, i) => (
            <View key={i} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendLabel}>{item.label}</Text>
              <Text style={styles.legendCount}>
                {Math.round((item.count / totalEntries) * 100)}%
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(80)}>
        <Text style={styles.sectionLabel}>Consistency</Text>
        <View style={styles.statsCard}>
          {stats.map((stat, i) => (
            <View
              key={i}
              style={[
                styles.statRow,
                i !== stats.length - 1 && styles.statRowDivider,
              ]}
            >
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    paddingTop: 64,
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
  },
  settingsButton: {
    padding: 4,
  },
  settingsIcon: {
    fontSize: 20,
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