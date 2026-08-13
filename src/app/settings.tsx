import { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { colors, fonts } from "../constants/theme";
import { getName, saveName, getDayBoundary, saveDayBoundary } from "../lib/settings";
import { deleteAllEntries, deleteAllSummaries } from "../lib/db";

/** Available day boundary options shown in the picker */
const BOUNDARY_OPTIONS = [1, 2, 3, 4];

/** Single labelled row inside a settings group card */
function SettingsRow({
  label,
  hint,
  children,
  last,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint && <Text style={styles.rowHint}>{hint}</Text>}
      </View>
      <View style={styles.rowRight}>{children}</View>
    </View>
  );
}

/** Card container grouping related settings rows */
function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupCard}>
        <View style={styles.cardHighlight} />
        {children}
      </View>
    </View>
  );
}

export default function Settings() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [boundary, setBoundary] = useState(3);
  const [nameSaved, setNameSaved] = useState(false);

  /** Load saved preferences on mount */
  useEffect(() => {
    getName().then((n) => setName(n ?? ""));
    getDayBoundary().then(setBoundary);
  }, []);

  /** Save name to AsyncStorage and show brief confirmation */
  const handleSaveName = useCallback(async () => {
    await saveName(name);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  }, [name]);

  /** Save boundary selection immediately on tap */
  const handleBoundarySelect = useCallback(async (hour: number) => {
    setBoundary(hour);
    await saveDayBoundary(hour);
    // Apply immediately so the rest of the session uses the new value
    const { setDayCutoffHour } = await import("../lib/dateUtils");
    setDayCutoffHour(hour);
  }, []);

  /** Confirm then delete all entries */
  const handleDeleteEntries = useCallback(() => {
    Alert.alert(
      "Delete all entries?",
      "This permanently removes every journal entry you've written. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteAllEntries();
            Alert.alert("Done", "All entries have been deleted.");
          },
        },
      ]
    );
  }, []);

  /** Confirm then delete all summaries */
  const handleDeleteSummaries = useCallback(() => {
    Alert.alert(
      "Delete all echoes?",
      "This removes all weekly and monthly echoes. New ones will regenerate as you journal.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteAllSummaries();
            Alert.alert("Done", "All echoes have been deleted.");
          },
        },
      ]
    );
  }, []);

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.topTitle}>Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/*  Journal  */}
        <SettingsGroup title="Journal">
          <SettingsRow
            label="Your name"
            hint="Used in your home screen greeting"
          >
            <View style={styles.nameInputRow}>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Joy"
                placeholderTextColor={colors.textSecondary}
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
              />
              <Pressable
                style={[styles.saveNameButton, nameSaved && styles.saveNameButtonDone]}
                onPress={handleSaveName}
              >
                <Text style={styles.saveNameText}>{nameSaved ? "✓" : "Save"}</Text>
              </Pressable>
            </View>
          </SettingsRow>

          <SettingsRow
            label="Day boundary"
            hint="Entries before this hour count as the previous day"
            last
          >
            <View style={styles.boundaryPicker}>
              {BOUNDARY_OPTIONS.map((hour) => (
                <Pressable
                  key={hour}
                  style={[
                    styles.boundaryOption,
                    boundary == hour && styles.boundaryOptionActive,
                  ]}
                  onPress={() => handleBoundarySelect(hour)}
                >
                  <Text
                    style={[
                      styles.boundaryOptionText,
                      boundary == hour && styles.boundaryOptionTextActive,
                    ]}
                  >
                    {hour}am
                  </Text>
                </Pressable>
              ))}
            </View>
          </SettingsRow>
        </SettingsGroup>

        {/*  Data  */}
        <SettingsGroup title="Data">
          <SettingsRow label="Delete all entries" hint="Permanently removes all journal entries">
            <Pressable style={styles.destructiveButton} onPress={handleDeleteEntries}>
              <Text style={styles.destructiveText}>Delete</Text>
            </Pressable>
          </SettingsRow>
          <SettingsRow label="Delete all echoes" hint="Removes weekly and monthly summaries" last>
            <Pressable style={styles.destructiveButton} onPress={handleDeleteSummaries}>
              <Text style={styles.destructiveText}>Delete</Text>
            </Pressable>
          </SettingsRow>
        </SettingsGroup>

        {/* About */}
        <SettingsGroup title="About">
          <SettingsRow label="Version" last>
            <Text style={styles.valueText}>1.0.0</Text>
          </SettingsRow>
        </SettingsGroup>

        {/* Website link sits outside the card - feels more like a footer */}
        <Pressable
          style={styles.websiteLink}
          onPress={() => {
            const { Linking } = require("react-native");
            Linking.openURL("https://antonigruba.work");
          }}
        >
          <Text style={styles.websiteLinkText}>antonigruba.work ↗</Text>
        </Pressable>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Top bar 
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#2e3530",
  },
  backText: {
    fontFamily: fonts.medium,
    fontSize: 22,
    color: colors.textSecondary,
    lineHeight: 26,
  },
  topTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.textPrimary,
  },

  // Scroll
  scroll: { flex: 1 },
  content: {
    padding: 24,
    paddingBottom: 48,
  },

  // Group
  group: {
    marginBottom: 28,
  },
  groupTitle: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2e3530",
    overflow: "hidden",
    position: "relative",
  },
  cardHighlight: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    zIndex: 1,
  },

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#2e3530",
  },
  rowLeft: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.textPrimary,
  },
  rowHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rowRight: {
    alignItems: "flex-end",
  },

  // Name input
  nameInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nameInput: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2e3530",
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 90,
    textAlign: "right",
  },
  saveNameButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveNameButtonDone: {
    backgroundColor: colors.mood.good,
  },
  saveNameText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.background,
  },

  // Boundary picker
  boundaryPicker: {
    flexDirection: "row",
    gap: 6,
  },
  boundaryOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: "#2e3530",
  },
  boundaryOptionActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  boundaryOptionText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  boundaryOptionTextActive: {
    color: colors.background,
  },

  // Destructive button
  destructiveButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.mood.veryLow,
  },
  destructiveText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.mood.veryLow,
  },

  // Value text (version)
  valueText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Website link
  websiteLink: {
    alignItems: "center",
    paddingVertical: 12,
  },
  websiteLinkText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.accent,
    textDecorationLine: "underline",
  },
});