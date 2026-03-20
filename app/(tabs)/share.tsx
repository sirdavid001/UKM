import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import { env } from "@/core/env";
import { Redirect, router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Linking, Modal, Pressable, ScrollView, Share, Text, View } from "react-native";

import { PROMPT_TEMPLATES, SHARE_CHANNELS } from "@/core/config";
import { ukmApi } from "@/core/api";
import { useDashboard, useInvalidateDashboard } from "@/core/hooks";
import { getPostAuthRoute } from "@/core/routing";
import { useAppStore } from "@/core/store";
import { useTheme } from "@/core/theme";
import type { CopyVariantKey, LinkChannel } from "@/core/types";
import { GradientHero, Pill, PrimaryButton, Screen, SectionCard, SectionTitle } from "@/ui/primitives";

export default function ShareScreen() {
  const sessionUser = useAppStore((state) => state.sessionUser);
  const invalidateDashboard = useInvalidateDashboard();
  const { data: dashboard } = useDashboard();
  const { palette } = useTheme();
  const [copyVariant, setCopyVariant] = useState<CopyVariantKey>("a");
  const [shareOpen, setShareOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const recoveryTracked = useRef(false);

  if (!sessionUser) {
    return <Redirect href="/(auth)/login" />;
  }

  const user = sessionUser;

  if (!dashboard) {
    return (
      <Screen className="items-center justify-center">
        <Text className="font-body" style={{ color: palette.textMuted }}>
          Loading share flow…
        </Text>
      </Screen>
    );
  }

  const requiredRoute = getPostAuthRoute(dashboard.profile);

  if (requiredRoute !== "/(tabs)/share") {
    return <Redirect href={requiredRoute} />;
  }

  const activePrompt = dashboard.prompts.find((prompt) => prompt.id === dashboard.profile.activePromptId) ?? PROMPT_TEMPLATES[0];
  const organicCount = dashboard.messages.filter((message) => !message.isSeeded && message.status === "visible").length;
  const shareCount = dashboard.linkEvents.filter((event) => event.eventType === "share").length;
  const boostEndsAt = dashboard.profile.onboardingBoostExpiresAt ? new Date(dashboard.profile.onboardingBoostExpiresAt).getTime() : null;
  const boostHoursLeft = boostEndsAt ? Math.max(0, Math.ceil((boostEndsAt - Date.now()) / (60 * 60 * 1000))) : 0;
  const zeroMessageRecovery =
    organicCount === 0 && shareCount === 0 && boostEndsAt && Date.now() - (boostEndsAt - 24 * 60 * 60 * 1000) > 6 * 60 * 60 * 1000;
  const recoveryPrompt = dashboard.prompts.find((prompt) => prompt.id !== activePrompt.id) ?? PROMPT_TEMPLATES[1];
  const shareCaption = activePrompt.copyVariants[copyVariant];
  const momentum = dashboard.messages.filter((message) => !message.isSeeded && message.status === "visible").length;
  const socialProof = organicCount > 0 ? "People are answering this" : "Be the first to reply";
  const baseProfileUrl = `${env.appUrl}/u/${dashboard.profile.username}`;

  function buildAttributedUrl(channel: LinkChannel) {
    const query = `v=${encodeURIComponent(copyVariant)}&ch=${encodeURIComponent(channel)}`;
    return `${baseProfileUrl}?${query}`;
  }

  const shareButtons = useMemo(
    () =>
      SHARE_CHANNELS.map((channel) => ({
        ...channel,
        onPress: () => handleShare(channel.key),
      })),
    [baseProfileUrl, copyVariant, shareCaption],
  );

  useEffect(() => {
    if (!zeroMessageRecovery || recoveryTracked.current) {
      return;
    }

    recoveryTracked.current = true;
    void ukmApi.trackOwnerLinkEvent(user.email, "recovery_view", "app", copyVariant, {
      suggestedPromptId: recoveryPrompt.id,
    });
  }, [copyVariant, recoveryPrompt.id, user.email, zeroMessageRecovery]);

  async function handleShare(channel: "whatsapp" | "instagram_story" | "generic") {
    try {
      setBusy(true);
      const shareUrl = buildAttributedUrl(channel);
      const payload = `${shareCaption}\n${shareUrl}`;

      if (channel === "whatsapp") {
        const url = `https://wa.me/?text=${encodeURIComponent(payload)}`;
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          await Share.share({ message: payload });
        }
      } else if (channel === "instagram_story") {
        await Share.share({ message: payload });
      } else {
        await Share.share({ message: payload });
      }

      await ukmApi.trackShare(user.email, channel, copyVariant);
      await invalidateDashboard();
      setShareOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    await Clipboard.setStringAsync(`${shareCaption}\n${buildAttributedUrl("copy")}`);
    await ukmApi.trackOwnerLinkEvent(user.email, "copy_link", "copy", copyVariant);
    await invalidateDashboard();
  }

  async function shareStoryPreview() {
    if (await Sharing.isAvailableAsync()) {
      await Share.share({ message: `${shareCaption}\n${buildAttributedUrl("generic")}` });
    }
  }

  return (
    <Screen padded={false}>
      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 120 }}>
        <GradientHero
          eyebrow={dashboard.flags.launchMode ? "Launch Mode On" : "Launch Mode Off"}
          title="Prompt-first sharing wins the launch."
          body={`UKM is still in its Day-7 cut. Focus on real shares, fast replies, and one loop that can survive outside the product.`}
        />
        <View className="mt-5 gap-5">
          <SectionCard>
            <Text className="font-body text-xs uppercase tracking-[2px]" style={{ color: palette.textMuted }}>
              Active prompt
            </Text>
            <Text className="mt-3 font-display text-[28px] leading-[32px]" style={{ color: palette.text }}>
              {activePrompt.title}
            </Text>
            <Text className="mt-2 font-body text-sm leading-6" style={{ color: palette.textMuted }}>
              {socialProof}
            </Text>
            <View className="mt-4 flex-row flex-wrap">
              {dashboard.prompts.map((prompt) => (
                <Pill
                  key={prompt.id}
                  active={prompt.id === activePrompt.id}
                  label={prompt.title}
                  onPress={async () => {
                    await ukmApi.setActivePrompt(sessionUser, prompt.id);
                    await invalidateDashboard();
                  }}
                />
              ))}
            </View>
            <View className="mt-4 flex-row">
              <Pill active={copyVariant === "a"} label="Copy A" onPress={() => setCopyVariant("a")} />
              <Pill active={copyVariant === "b"} label="Copy B" onPress={() => setCopyVariant("b")} />
            </View>
            <View className="mt-4 rounded-[24px] border p-5" style={{ borderColor: palette.border, backgroundColor: palette.cardMuted }}>
              <Text className="font-display text-2xl" style={{ color: palette.text }}>
                {activePrompt.title}
              </Text>
              <Text className="mt-3 font-body text-sm leading-6" style={{ color: palette.textMuted }}>
                {shareCaption}
              </Text>
              <View className="mt-6 flex-row items-center justify-between">
                <Text className="font-body text-sm" style={{ color: palette.textMuted }}>
                  @{dashboard.profile.username}
                </Text>
                <Pressable onPress={copyLink}>
                  <Text className="font-medium text-sm" style={{ color: palette.accent }}>
                    Copy link
                  </Text>
                </Pressable>
              </View>
            </View>
            <View className="mt-5 flex-row items-center justify-between">
              <View>
                <Text className="font-body text-sm" style={{ color: palette.textMuted }}>
                  Momentum
                </Text>
                <Text className="font-display text-2xl" style={{ color: palette.text }}>
                  +{momentum} responses
                </Text>
              </View>
              <PrimaryButton label="Share now" onPress={() => setShareOpen(true)} />
            </View>
          </SectionCard>

          <SectionCard>
            <SectionTitle title="Launch signal" hint="Keep shipping the loop, not the dashboard." />
            <View className="flex-row items-center justify-between">
              <Text className="font-body text-sm" style={{ color: palette.textMuted }}>
                Boost window
              </Text>
              <Text className="font-medium text-sm" style={{ color: palette.text }}>
                {boostHoursLeft}h left
              </Text>
            </View>
            <View className="mt-3 flex-row items-center justify-between">
              <Text className="font-body text-sm" style={{ color: palette.textMuted }}>
                Organic messages
              </Text>
              <Text className="font-medium text-sm" style={{ color: palette.text }}>
                {organicCount}
              </Text>
            </View>
            <View className="mt-3 flex-row items-center justify-between">
              <Text className="font-body text-sm" style={{ color: palette.textMuted }}>
                Shares logged
              </Text>
              <Text className="font-medium text-sm" style={{ color: palette.text }}>
                {shareCount}
              </Text>
            </View>
          </SectionCard>

          {zeroMessageRecovery ? (
            <SectionCard>
              <SectionTitle title="Recovery card" hint="No shares and no organic replies yet. Switch copy now instead of waiting for automation." />
              <Text className="font-display text-xl" style={{ color: palette.text }}>
                Try: {recoveryPrompt.title}
              </Text>
              <Text className="mt-2 font-body text-sm leading-6" style={{ color: palette.textMuted }}>
                {recoveryPrompt.copyVariants.a}
              </Text>
            </SectionCard>
          ) : null}
        </View>
      </ScrollView>

      <Modal animationType="slide" presentationStyle="pageSheet" transparent visible={shareOpen}>
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.48)" }}>
          <View className="rounded-t-[28px] px-5 pt-5 pb-8" style={{ backgroundColor: palette.backgroundAlt }}>
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="font-display text-2xl" style={{ color: palette.text }}>
                Share confirmation
              </Text>
              <Pressable onPress={() => setShareOpen(false)}>
                <Ionicons color={palette.textMuted} name="close" size={24} />
              </Pressable>
            </View>
            <SectionCard className="mb-4">
              <Text className="font-display text-2xl" style={{ color: palette.text }}>
                {activePrompt.title}
              </Text>
              <Text className="mt-3 font-body text-sm leading-6" style={{ color: palette.textMuted }}>
                {shareCaption}
              </Text>
              <Text className="mt-5 font-body text-xs uppercase tracking-[1.8px]" style={{ color: palette.textMuted }}>
                {buildAttributedUrl("generic")}
              </Text>
            </SectionCard>
            <View className="gap-3">
              <PrimaryButton label={busy ? "Sharing…" : "Copy link"} onPress={copyLink} />
              {shareButtons.map((button) => (
                <PrimaryButton key={button.key} label={button.label} onPress={button.onPress} tone="ghost" />
              ))}
              <PrimaryButton label="Preview card" onPress={shareStoryPreview} tone="ghost" />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
