import { Redirect, router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { ukmApi } from "@/core/api";
import { useDashboard, useInvalidateDashboard, useSignOut } from "@/core/hooks";
import { useAppStore } from "@/core/store";
import { useTheme } from "@/core/theme";
import { AppTextInput, FieldLabel, Pill, PrimaryButton, Screen, SectionCard, SectionTitle } from "@/ui/primitives";

export default function SettingsScreen() {
  const sessionUser = useAppStore((state) => state.sessionUser);
  const localTheme = useAppStore((state) => state.themePreference);
  const setThemePreference = useAppStore((state) => state.setThemePreference);
  const backendMode = useAppStore((state) => state.backendMode);
  const { data: dashboard } = useDashboard();
  const invalidateDashboard = useInvalidateDashboard();
  const signOut = useSignOut();
  const { palette } = useTheme();
  const [hiddenWord, setHiddenWord] = useState("");

  if (!sessionUser) {
    return <Redirect href="/(auth)/login" />;
  }

  const user = sessionUser;

  if (!dashboard) {
    return (
      <Screen className="items-center justify-center">
        <Text className="font-body" style={{ color: palette.textMuted }}>
          Loading settings…
        </Text>
      </Screen>
    );
  }

  async function saveTheme(next: "light" | "dark" | "system") {
    setThemePreference(next);
    await ukmApi.setThemePreference(user, next);
    await invalidateDashboard();
  }

  async function addWord() {
    if (!hiddenWord.trim()) {
      return;
    }

    await ukmApi.addHiddenWord(user, hiddenWord);
    setHiddenWord("");
    await invalidateDashboard();
  }

  return (
    <Screen padded={false}>
      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 120 }}>
        <SectionCard>
          <Text className="font-display text-[28px] leading-[32px]" style={{ color: palette.text }}>
            Settings
          </Text>
          <Text className="mt-2 font-body text-sm leading-6" style={{ color: palette.textMuted }}>
            Keep launch-mode settings simple: appearance, privacy, and the inbox controls that materially affect trust.
          </Text>
        </SectionCard>

        <View className="mt-5 gap-5">
          <SectionCard>
            <SectionTitle title="Appearance" hint="Light, dark, or follow the system." />
            <View className="flex-row flex-wrap">
              <Pill active={localTheme === "light"} label="Light" onPress={() => saveTheme("light")} />
              <Pill active={localTheme === "dark"} label="Dark" onPress={() => saveTheme("dark")} />
              <Pill active={localTheme === "system"} label="System" onPress={() => saveTheme("system")} />
            </View>
          </SectionCard>

          <SectionCard>
            <SectionTitle title="Hidden words" hint="Filtered replies stay out of your main inbox." />
            <View>
              <FieldLabel>Add a hidden word</FieldLabel>
              <AppTextInput onChangeText={setHiddenWord} placeholder="spammy phrase" value={hiddenWord} />
              <View className="mt-3">
                <PrimaryButton label="Add word" onPress={addWord} />
              </View>
            </View>
            <View className="mt-4 flex-row flex-wrap">
              {dashboard.hiddenWords.length === 0 ? (
                <Text className="font-body text-sm" style={{ color: palette.textMuted }}>
                  No hidden words yet.
                </Text>
              ) : (
                dashboard.hiddenWords.map((word) => (
                  <Pill key={word} label={word} onPress={() => ukmApi.removeHiddenWord(user, word).then(invalidateDashboard)} />
                ))
              )}
            </View>
          </SectionCard>

          <SectionCard>
            <SectionTitle title="Launch diagnostics" hint="Useful while the product is still proving the core loop." />
            <Text className="font-body text-sm" style={{ color: palette.textMuted }}>
              Backend mode: {backendMode}
            </Text>
            <Text className="mt-2 font-body text-sm" style={{ color: palette.textMuted }}>
              Launch mode: {dashboard.flags.launchMode ? "enabled" : "disabled"}
            </Text>
            <Text className="mt-2 font-body text-sm" style={{ color: palette.textMuted }}>
              Signed in as: {dashboard.profile.email}
            </Text>
          </SectionCard>

          <PrimaryButton
            label={signOut.isPending ? "Signing out…" : "Sign out"}
            onPress={() => signOut.mutateAsync().then(() => router.replace("/(auth)/login"))}
            tone="ghost"
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
