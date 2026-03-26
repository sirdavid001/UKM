import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";

import { getOrCreateSenderSession } from "@/core/sender-session";
import { usePublicProfile } from "@/core/hooks";
import { useTheme } from "@/core/theme";
import { ukmApi } from "@/core/api";
import type { CopyVariantKey, LinkChannel } from "@/core/types";
import { AppTextInput, FieldLabel, GradientHero, Pill, PrimaryButton, Screen, SectionCard } from "@/ui/primitives";

export default function PublicProfileScreen() {
  const params = useLocalSearchParams<{ username: string; v?: string; ch?: string }>();
  const username = Array.isArray(params.username) ? params.username[0] : params.username;
  const rawVariant = Array.isArray(params.v) ? params.v[0] : params.v;
  const rawChannel = Array.isArray(params.ch) ? params.ch[0] : params.ch;
  const { data: profile, error, isLoading } = usePublicProfile(username ?? "");
  const { palette } = useTheme();
  const [senderSessionId, setSenderSessionId] = useState<string | null>(null);
  const [senderConfidence, setSenderConfidence] = useState<"high" | "low">("high");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const trackedView = useRef(false);
  const variant = useMemo<CopyVariantKey>(() => (rawVariant === "b" ? "b" : "a"), [rawVariant]);
  const channel = useMemo<LinkChannel>(() => {
    const allowed: LinkChannel[] = ["whatsapp", "instagram_story", "generic", "copy", "app", "unknown"];
    return allowed.includes((rawChannel as LinkChannel) ?? "unknown") ? ((rawChannel as LinkChannel) ?? "unknown") : "unknown";
  }, [rawChannel]);

  useEffect(() => {
    let cancelled = false;
    void getOrCreateSenderSession().then((result) => {
      if (!cancelled) {
        setSenderSessionId(result.senderSessionId);
        setSenderConfidence(result.senderConfidence);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!username) {
    router.replace("/");
    return null;
  }

  if (isLoading || !senderSessionId) {
    return (
      <Screen className="items-center justify-center">
        <Text className="font-body" style={{ color: palette.textMuted }}>
          Loading public page…
        </Text>
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen>
        <SectionCard>
          <Text className="font-display text-2xl" style={{ color: palette.text }}>
            {error ? "UKM is not configured yet." : "That prompt link is gone."}
          </Text>
          <Text className="mt-2 font-body text-sm leading-6" style={{ color: palette.textMuted }}>
            {error instanceof Error ? error.message : "The username could not be found. Ask them for a fresh UKM link."}
          </Text>
        </SectionCard>
      </Screen>
    );
  }

  const currentProfile = profile;
  const currentSessionId = senderSessionId;

  useEffect(() => {
    if (trackedView.current) {
      return;
    }

    trackedView.current = true;
    void ukmApi.trackPublicEvent(currentProfile.username, "view", variant, channel);
  }, [channel, currentProfile.username, variant]);

  async function submit() {
    try {
      setBusy(true);
      setFeedback(null);
      const result = await ukmApi.submitAnonymousMessage({
        username: currentProfile.username,
        promptId: currentProfile.activePrompt.id,
        content: message.trim(),
        senderSessionId: currentSessionId,
        senderConfidence,
        copyVariantKey: variant,
        channel,
      });

      if (!result.accepted) {
        setFeedback(result.message ?? "Try again in a moment.");
        return;
      }

      setSuccess(true);
      setMessage("");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not send the message.");
    } finally {
      setBusy(false);
    }
  }

  async function openApp() {
    await ukmApi.trackPublicEvent(currentProfile.username, "open_app", variant, channel);
    const deepLink = `ukm://u/${currentProfile.username}`;
    const canOpen = await Linking.canOpenURL(deepLink);

    if (canOpen) {
      await Linking.openURL(deepLink);
      return;
    }

    router.replace("/");
  }

  return (
    <Screen padded={false}>
      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 120 }}>
        <GradientHero
          eyebrow={`@${currentProfile.username}`}
          title={currentProfile.activePrompt.title}
          body={currentProfile.organicSubmissions7d > 0 ? "People are answering this." : "Be the first to reply."}
        />
        <View className="mt-5 gap-5">
          <SectionCard>
            <View className="flex-row items-center">
              <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: palette.cardMuted }}>
                <Text className="font-display text-xl" style={{ color: palette.text }}>
                  {(currentProfile.displayName ?? currentProfile.username).slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View className="ml-4 flex-1">
                <Text className="font-display text-2xl" style={{ color: palette.text }}>
                  {currentProfile.displayName ?? `@${currentProfile.username}`}
                </Text>
                <Text className="mt-1 font-body text-sm" style={{ color: palette.textMuted }}>
                  @{currentProfile.username}
                </Text>
              </View>
            </View>
            <Text className="mt-4 font-body text-sm leading-6" style={{ color: palette.textMuted }}>
              Reply anonymously to the prompt below. No account, no name, just one honest answer.
            </Text>
          </SectionCard>

          <SectionCard>
            <Text className="font-body text-xs uppercase tracking-[2px]" style={{ color: palette.textMuted }}>
              Suggested replies
            </Text>
            <View className="mt-4 flex-row flex-wrap">
              {currentProfile.activePrompt.suggestedReplies.map((reply) => (
                <Pill key={reply} label={reply} onPress={() => setMessage(reply)} />
              ))}
            </View>
            <View className="mt-5">
              <FieldLabel>Your anonymous reply</FieldLabel>
              <AppTextInput multiline numberOfLines={5} onChangeText={setMessage} placeholder="Type something honest…" value={message} />
            </View>
            {feedback ? (
              <Text className="mt-4 font-body text-sm" style={{ color: palette.warning }}>
                {feedback}
              </Text>
            ) : null}
            <View className="mt-5">
              <PrimaryButton disabled={busy || message.trim().length < 3} label={busy ? "Sending…" : "Send anonymously"} onPress={submit} />
            </View>
          </SectionCard>

          {success ? (
            <SectionCard>
              <Text className="font-display text-2xl" style={{ color: palette.text }}>
                Sent.
              </Text>
              <Text className="mt-2 font-body text-sm leading-6" style={{ color: palette.textMuted }}>
                Your reply is on the way. If you want to keep the loop alive, send another while you’re here.
              </Text>
              <View className="mt-4">
                <PrimaryButton label="Send another" onPress={() => setSuccess(false)} tone="ghost" />
              </View>
            </SectionCard>
          ) : null}

          <Pressable onPress={openApp}>
            <Text className="text-center font-body text-sm" style={{ color: palette.textMuted }}>
              Open UKM
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}
