import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_NAME = "settings_name";
const KEY_DAY_BOUNDARY = "settings_day_boundary";

/** Returns the user's display name, or null if not set */
export async function getName(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_NAME);
}

/** Saves the user's display name */
export async function saveName(name: string): Promise<void> {
  await AsyncStorage.setItem(KEY_NAME, name.trim());
}

/** Returns the day boundary hour (default 3) */
export async function getDayBoundary(): Promise<number> {
  const val = await AsyncStorage.getItem(KEY_DAY_BOUNDARY);
  return val ? parseInt(val) : 3;
}

/** Saves the day boundary hour */
export async function saveDayBoundary(hour: number): Promise<void> {
  await AsyncStorage.setItem(KEY_DAY_BOUNDARY, String(hour));
}