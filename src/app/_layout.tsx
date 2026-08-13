import { useEffect } from "react";
import { Stack } from "expo-router";
import {
  useFonts,
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_700Bold,
} from "@expo-google-fonts/quicksand";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { colors } from "../constants/theme";
import { initDatabase } from "../lib/db";
import { getDayBoundary } from "../lib/settings";
import { setDayCutoffHour } from "../lib/dateUtils";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_700Bold,
  });

  useEffect(() => {
    initDatabase();
    // Load user's day boundary preference and apply it
    getDayBoundary().then(setDayCutoffHour);
  }, []);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="new-entry" options={{ presentation: "modal", headerShown: false }} />
        <Stack.Screen name="quick-entry" options={{ presentation: "modal", headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}