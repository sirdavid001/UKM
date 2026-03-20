import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { ukmApi } from "@/core/api";
import { useDashboard, useInvalidateDashboard } from "@/core/hooks";
import { getPostAuthRoute } from "@/core/routing";
import { useAppStore } from "@/core/store";
import { useTheme } from "@/core/theme";
import { AppTextInput, FieldLabel, GradientHero, PrimaryButton, Screen, SectionCard } from "@/ui/primitives";

export default function UsernameScreen() {
  const sessionUser = useAppStore((state) => state.sessionUser);
  const invalidateDashboard = useInvalidateDashboard();
  const { data: dashboard } = useDashboard();
  const { palette } = useTheme();
  const [username, setUsername] = useState(dashboard?.profile.username ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!sessionUser) {
    return <Redirect href="/(auth)/login" />;
  }

  if (dashboard?.profile) {
    if (!dashboard.profile.dob) {
      return <Redirect href="/(onboarding)/age" />;
    }

    if (!dashboard.profile.displayName && !dashboard.profile.avatarUrl) {
      return <Redirect href="/(onboarding)/profile" />;
    }

    if (dashboard.profile.username) {
      return <Redirect href={getPostAuthRoute(dashboard.profile)} />;
    }
  }

  const user = sessionUser;

  async function claim() {
    try {
      setBusy(true);
      setError(null);
      await ukmApi.claimUsername(user, username);
      await invalidateDashboard();
      router.replace("/(tabs)/share");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not claim that username.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <GradientHero
        eyebrow="Step 3"
        title="Pick the link people will actually tap."
        body="Short wins. The share link is your product loop, so make it recognizable and easy to pass around."
      />
      <View className="mt-6">
        <SectionCard>
          <FieldLabel>Username</FieldLabel>
          <AppTextInput autoCapitalize="none" onChangeText={setUsername} placeholder="@ukm" value={username} />
          <Text className="mt-3 font-body text-sm" style={{ color: palette.textMuted }}>
            Only letters, numbers, and underscores.
          </Text>
          {error ? (
            <Text className="mt-4 font-body text-sm" style={{ color: palette.danger }}>
              {error}
            </Text>
          ) : null}
          <View className="mt-5">
            <PrimaryButton disabled={busy || username.trim().length < 3} label={busy ? "Claiming…" : "Claim username"} onPress={claim} />
          </View>
        </SectionCard>
      </View>
    </Screen>
  );
}
