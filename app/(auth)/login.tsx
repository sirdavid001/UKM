import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { ukmApi } from "@/core/api";
import { useAppStore } from "@/core/store";
import { useTheme } from "@/core/theme";
import { AppTextInput, FieldLabel, GradientHero, PrimaryButton, Screen, SectionCard } from "@/ui/primitives";

export default function LoginScreen() {
  const sessionUser = useAppStore((state) => state.sessionUser);
  const pendingEmail = useAppStore((state) => state.pendingEmail);
  const setPendingEmail = useAppStore((state) => state.setPendingEmail);
  const setSessionUser = useAppStore((state) => state.setSessionUser);
  const backendMode = useAppStore((state) => state.backendMode);
  const { palette } = useTheme();
  const [email, setEmail] = useState(pendingEmail ?? "");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sessionUser) {
    return <Redirect href="/" />;
  }

  async function requestCode() {
    try {
      setBusy(true);
      setError(null);
      const response = await ukmApi.requestOtp(email.trim().toLowerCase());
      setPendingEmail(email.trim().toLowerCase());
      setDemoCode(response.mode === "mock" ? response.demoCode : null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not send the code.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (!pendingEmail) {
      return;
    }

    try {
      setBusy(true);
      setError(null);
      const session = await ukmApi.verifyOtp(pendingEmail, code.trim());
      setSessionUser(session);
      setPendingEmail(null);
      router.replace("/");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "That code did not work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <GradientHero
        eyebrow="UKM / Launch"
        title="Anonymous prompts, not anonymous clutter."
        body="Ship your inbox, share your prompt, and bring people back with one clean loop."
      />
      <View className="mt-6">
        <SectionCard>
          <Text className="font-display text-2xl" style={{ color: palette.text }}>
            Sign in
          </Text>
          <Text className="mt-2 font-body text-sm leading-6" style={{ color: palette.textMuted }}>
            Use email OTP for launch. In mock mode, the code is fixed so you can move through the full product locally.
          </Text>
          {!pendingEmail ? (
            <View className="mt-5 gap-4">
              <View>
                <FieldLabel>Email</FieldLabel>
                <AppTextInput autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} placeholder="you@example.com" value={email} />
              </View>
              <PrimaryButton disabled={busy || !email.includes("@")} label={busy ? "Sending…" : "Send code"} onPress={requestCode} />
            </View>
          ) : (
            <View className="mt-5 gap-4">
              <View>
                <FieldLabel>6-digit code</FieldLabel>
                <AppTextInput keyboardType="number-pad" onChangeText={setCode} placeholder="000000" value={code} />
              </View>
              {demoCode ? (
                <View className="rounded-2xl px-4 py-3" style={{ backgroundColor: palette.cardMuted }}>
                  <Text className="font-body text-sm" style={{ color: palette.text }}>
                    Demo mode code: {demoCode}
                  </Text>
                </View>
              ) : null}
              <PrimaryButton disabled={busy || code.trim().length < 6} label={busy ? "Verifying…" : "Verify code"} onPress={verifyCode} />
              <PrimaryButton
                label="Use a different email"
                onPress={() => {
                  setPendingEmail(null);
                  setCode("");
                }}
                tone="ghost"
              />
            </View>
          )}
          {error ? (
            <Text className="mt-4 font-body text-sm" style={{ color: palette.danger }}>
              {error}
            </Text>
          ) : null}
          <Text className="mt-4 font-body text-xs uppercase tracking-[1.4px]" style={{ color: palette.textMuted }}>
            Backend: {backendMode === "supabase" ? "Supabase live mode" : "Local mock mode"}
          </Text>
        </SectionCard>
      </View>
    </Screen>
  );
}
