import { useState, useRef } from "react";
import { Text, View, StyleSheet, Pressable, ScrollView, Dimensions } from "react-native";
import { colors, fonts } from "../constants/theme";
import { Summary } from "../lib/types";
import { formatPeriodLabel } from "../lib/summaryUtils";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/** Number of lines shown when a card is collapsed */
const COLLAPSED_LINES = 3;

/** Defines what each echo card shows — real summary or placeholder */
export type EchoCard = {
  label: string;
  title: string;
  text: string;
};

/**
 * Builds a display card from a real summary or returns a placeholder.
 * Pass end for weekly cards to show the full date range in the label.
 */
export function buildEchoCard(
  periodType: "weekly" | "monthly",
  start: string,
  summary: Summary | null,
  end?: string
): EchoCard {
  const label = formatPeriodLabel(periodType, start, end);
  if (summary) {
    return { label, title: "Your echo", text: summary.summaryText };
  }
  const periodWord = periodType == "weekly" ? "week" : "month";
  return {
    label,
    title: "No echo yet",
    text: `You haven't journaled enough that ${periodWord}. Keep going and you'll start seeing your echoes here.`,
  };
}

/** Horizontal scrolling carousel of echo cards with expand/collapse */
export function SummaryCard({ cards }: { cards: EchoCard[] }) {
  const [index, setIndex] = useState(0);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const PEEK = 4;
  const GAP = 12;
  const CARD_WIDTH = SCREEN_WIDTH - 48 - PEEK * 2;
  const SNAP_INTERVAL = CARD_WIDTH + GAP;

  /** Update active dot when scroll settles */
  const onMomentumScrollEnd = (e: any) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / SNAP_INTERVAL);
    setIndex(newIndex);
  };

  /** Toggle expanded state for a card, collapse if already expanded */
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
              <View style={styles.cardHighlight} />
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

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
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
    width: 5,
    height: 5,
    opacity: 0.35,
    borderRadius: 3,
    backgroundColor: colors.textSecondary,
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
    lineHeight: 21,
  },
  expandHint: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.accent,
    marginTop: 8,
  },
});