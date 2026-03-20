import { Redirect, router } from "expo-router";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";

import { ukmApi } from "@/core/api";
import { useDashboard, useInvalidateDashboard } from "@/core/hooks";
import { getPostAuthRoute } from "@/core/routing";
import { useAppStore } from "@/core/store";
import { useTheme } from "@/core/theme";
import { AppTextInput, FieldLabel, GradientHero, PrimaryButton, Screen, SectionCard } from "@/ui/primitives";

export default function ProfileScreen() {
  const sessionUser = useAppStore((state) => state.sessionUser);
  const invalidateDashboard = useInvalidateDashboard();
  const { data: dashboard } = useDashboard();
  const { palette } = useTheme();
  const fallbackName = useMemo(() => sessionUser?.email.split("@")[0].replace(/[._-]/g, " ") ?? "UKM User", [sessionUser?.email]);
  const [displayName, setDisplayName] = useState(dashboard?.profile.displayName ?? fallbackName);
  const [avatarUrl, setAvatarUrl] = useState(dashboard?.profile.avatarUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!sessionUser) {
    return <Redirect href="/(auth)/login" />;
  }

  if (dashboard?.profile) {
    if (!dashboard.profile.dob) {
      return <Redirect href="/(onboarding)/age" />;
    }

    if (dashboard.profile.displayName || dashboard.profile.avatarUrl) {
      return <Redirect href={getPostAuthRoute(dashboard.profile)} />;
    }
  }

  const user = sessionUser;

  async function saveProfile() {
    try {
      setBusy(true);
      setError(null);
      await ukmApi.saveProfile(user, {
        displayName: displayName.trim() || fallbackName,
        avatarUrl: avatarUrl.trim(),
        dob: dashboard?.profile.dob,
      });
      await invalidateDashboard();
      router.replace("/");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not save your profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <GradientHero
        eyebrow="Step 2"
        title="Make the profile feel human."
        body="Keep this light. A name and optional avatar are enough for launch. The goal is to make the public page feel like a real person, fast."
      />
      <View className="mt-6">
        <SectionCard>
          <View className="gap-4">
            <View>
              <FieldLabel>Display name</FieldLabel>
              <AppTextInput onChangeText={setDisplayName} placeholder="David" value={displayName} />
            </View>
            <View>
              <FieldLabel>Avatar URL (optional)</FieldLabel>
              <AppTextInput autoCapitalize="none" onChangeText={setAvatarUrl} placeholder="https://…" value={avatarUrl} />
            </View>
          </View>
          {error ? (
            <Text className="mt-4 font-body text-sm" style={{ color: palette.danger }}>
              {error}
            </Text>
          ) : null}
          <View className="mt-5">
            <PrimaryButton disabled={busy} label={busy ? "Saving…" : "Continue"} onPress={saveProfile} />
          </View>
        </SectionCard>
      </View>
    </Screen>
  );
}
