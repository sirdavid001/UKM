import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { ukmApi } from "@/core/api";
import { useDashboard, useInvalidateDashboard } from "@/core/hooks";
import { useAppStore } from "@/core/store";
import { useTheme } from "@/core/theme";
import { AppTextInput, FieldLabel, GradientHero, PrimaryButton, Screen, SectionCard } from "@/ui/primitives";

export default function AgeScreen() {
  const sessionUser = useAppStore((state) => state.sessionUser);
  const invalidateDashboard = useInvalidateDashboard();
  const { data: dashboard } = useDashboard();
  const { palette } = useTheme();
  const [dob, setDob] = useState(dashboard?.profile.dob ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!sessionUser) {
    return <Redirect href="/(auth)/login" />;
  }

  const user = sessionUser;

  async function continueFlow() {
    try {
      setBusy(true);
      setError(null);
      await ukmApi.saveAgeGate(user, dob);
      await invalidateDashboard();
      router.replace("/");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not save your age gate.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <GradientHero
        eyebrow="Step 1"
        title="Confirm you’re 18 or older."
        body="UKM launch is hard-gated for adults only. Enter your birthday in ISO format so the backend rules stay simple."
      />
      <View className="mt-6">
        <SectionCard>
          <FieldLabel>Date of birth</FieldLabel>
          <AppTextInput onChangeText={setDob} placeholder="2001-04-17" value={dob} />
          <Text className="mt-3 font-body text-sm" style={{ color: palette.textMuted }}>
            Format: YYYY-MM-DD
          </Text>
          {error ? (
            <Text className="mt-4 font-body text-sm" style={{ color: palette.danger }}>
              {error}
            </Text>
          ) : null}
          <View className="mt-5">
            <PrimaryButton disabled={busy || dob.length < 10} label={busy ? "Saving…" : "Continue"} onPress={continueFlow} />
          </View>
        </SectionCard>
      </View>
    </Screen>
  );
}
