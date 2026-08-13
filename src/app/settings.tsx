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
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { colors, fonts } from "../constants/theme";
import { getName, saveName, getDayBoundary, saveDayBoundary } from "../lib/settings";
import { deleteAllEntries, deleteAllSummaries, exportData, importData } from "../lib/db";

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

  /** Generates a JSON file and opens the native save/share dialog */
  const handleExport = useCallback(async () => {
    try {
      const dataString = await exportData();
      const fileUri = FileSystem.documentDirectory + "echoes_backup.json";
      
      await FileSystem.writeAsStringAsync(fileUri, dataString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: "Save Echoes Backup",
        });
      } else {
        Alert.alert("Error", "File sharing is not available on this device.");
      }
    } catch (e) {
      Alert.alert("Export Failed", "Something went wrong while exporting your data.");
    }
  }, []);

  /** Open a file picker -> read the JSON file -> import it */
  const handleImport = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/plain", "*/*"], 
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const fileUri = result.assets[0].uri;
      const fileContents = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const success = importData(fileContents);
      if(success){
        Alert.alert("Success!", "Your data has been imported.", [
          { text: "OK", onPress: () => router.replace("/") }
        ]);
      }
      else {
        Alert.alert("Invalid Data", "The selected file doesn't look like a valid Echoes backup.");
      }
    } catch (e) {
      Alert.alert("Import Failed", "Could not read the selected file.");
    }
  }, []);

  /** Confirm then delete all entries */
  const handleDeleteEntries = useCallback(() => {
    Alert.alert(
      "Delete all entries?",
      "This permanently REMOVES every journal entry you've written. This cannot be undone.",
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
      "This pernamently REMOVES all weekly and monthly echoes. New ones will regenerate as you journal.",
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

        {/* Backup */}
        <SettingsGroup title="Backup">
          <SettingsRow label="Export backup file" hint="Save your entries as a .json file">
            <Pressable style={styles.actionButton} onPress={handleExport}>
              <Text style={styles.actionButtonText}>Export</Text>
            </Pressable>
          </SettingsRow>
          <SettingsRow label="Import backup file" hint="Restore from a saved .json file" last>
            <Pressable style={styles.actionButton} onPress={handleImport}>
              <Text style={styles.actionButtonText}>Import</Text>
            </Pressable>
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
  
  // Action button
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#2e3530",
  },
  actionButtonText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textPrimary,
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