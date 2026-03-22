import "../global.css";

import { Stack, useSegments } from "expo-router";
import { Text, View } from "react-native";

import { useBootstrapSession } from "@/core/hooks";
import { useAppStore } from "@/core/store";
import { AppProviders } from "@/providers/AppProviders";

function RootNavigator() {
  useBootstrapSession();
  const hydrated = useAppStore((state) => state.hydrated);
  const authReady = useAppStore((state) => state.authReady);
  const segments = useSegments();
  const isPublicRoute = segments[0] === "u";
  const isPreviewRoute = segments[0] === "figma";
  const bypassBootstrapGate = isPublicRoute || isPreviewRoute;

  if ((!hydrated || !authReady) && !bypassBootstrapGate) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#08090d" }}>
        <View style={{ borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#141825" }}>
          <Text style={{ color: "#9ca7c2" }}>Loading UKM...</Text>
        </View>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="(onboarding)/age" />
      <Stack.Screen name="(onboarding)/profile" />
      <Stack.Screen name="(onboarding)/username" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="u/[username]" />
      <Stack.Screen name="figma/[screen]" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
