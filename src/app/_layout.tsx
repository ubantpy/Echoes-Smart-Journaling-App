import { Stack } from "expo-router";
import { useEffect } from "react";
import { initDatabase } from "../lib/db";
import {
  useFonts,
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_700Bold,
} from "@expo-google-fonts/quicksand";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { colors } from "../constants/theme";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_700Bold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  useEffect(() => {
    initDatabase();
  }, []);
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
        <Stack.Screen name="new-entry" options={{ presentation: "modal", headerShown: false }} />
        <Stack.Screen name="quick-entry" options={{ presentation: "modal", headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}