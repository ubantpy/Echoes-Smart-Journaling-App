import { Text, View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { colors, fonts } from "../../constants/theme";

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

export default function Home() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Good evening</Text>
      <Text style={styles.date}>Tuesday, 22 July</Text>

      <Pressable style={styles.newEntryButton} onPress={() => router.push("/new-entry")}>
        <Text style={styles.newEntryText}>Daily entry</Text>
      </Pressable>

      <Pressable style={styles.quickEntryButton} onPress={() => router.push("/quick-entry")}>
        <Text style={styles.quickEntryText}>Quick entry</Text>
      </Pressable>

      <View style={styles.streakRow}>
        <Text style={styles.streakText}>🔥 {streakCount} day streak</Text>
      </View>

      <Text style={styles.sectionLabel}>Recent days</Text>
      <View style={styles.stripRow}>
        {recentDays.map((item, index) => (
          <View key={index} style={styles.stripItem}>
            <View style={[styles.blob, { backgroundColor: item.mood }]} />
            <Text style={styles.stripLabel}>{item.day}</Text>
          </View>
        ))}
      </View>
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