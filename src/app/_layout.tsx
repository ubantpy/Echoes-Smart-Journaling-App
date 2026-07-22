import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="new-entry" options={{ presentation: "modal" }} />
      <Stack.Screen name="quick-entry" options={{ presentation: "modal" }} />
    </Stack>
  );
}