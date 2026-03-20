import "../global.css";

import { Stack } from "expo-router";

import { useBootstrapSession } from "@/core/hooks";
import { AppProviders } from "@/providers/AppProviders";

export default function RootLayout() {
  useBootstrapSession();

  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="u/[username]" />
      </Stack>
    </AppProviders>
  );
}
