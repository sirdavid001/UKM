import { Redirect, useFocusEffect, router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { ukmApi } from "@/core/api";
import { useDashboard, useInvalidateDashboard } from "@/core/hooks";
import { useAppStore } from "@/core/store";
import { useTheme } from "@/core/theme";
import type { Message } from "@/core/types";
import { Pill, PrimaryButton, Screen, SectionCard, SectionTitle } from "@/ui/primitives";

type InboxTab = "all" | "unread" | "filtered" | "archived";

export default function InboxScreen() {
  const sessionUser = useAppStore((state) => state.sessionUser);
  const { data: dashboard } = useDashboard();
  const invalidateDashboard = useInvalidateDashboard();
  const { palette } = useTheme();
  const [activeTab, setActiveTab] = useState<InboxTab>("all");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (sessionUser) {
        void ukmApi.recordInboxOpened(sessionUser);
      }
    }, [sessionUser]),
  );

  if (!sessionUser) {
    return <Redirect href="/(auth)/login" />;
  }

  const user = sessionUser;

  if (!dashboard) {
    return (
      <Screen className="items-center justify-center">
        <Text className="font-body" style={{ color: palette.textMuted }}>
          Loading inbox…
        </Text>
      </Screen>
    );
  }

  const visibleMessages = dashboard.messages.filter((message) => !message.isSeeded);
  const newSinceLastVisit = visibleMessages.filter((message) => {
    if (!dashboard.profile.lastInboxOpenedAt) {
      return !message.readAt;
    }

    return new Date(message.createdAt).getTime() > new Date(dashboard.profile.lastInboxOpenedAt).getTime();
  }).length;

  const filteredMessages = dashboard.messages.filter((message) => message.status === "filtered" || message.status === "flagged");
  const archivedMessages = dashboard.messages.filter((message) => message.status === "archived");
  const unreadMessages = dashboard.messages.filter((message) => message.status === "visible" && !message.readAt && !message.isSeeded);
  const allMessages = dashboard.messages.filter((message) => message.status === "visible" && !message.isSeeded);

  const messageList = useMemo(() => {
    switch (activeTab) {
      case "unread":
        return unreadMessages;
      case "filtered":
        return filteredMessages;
      case "archived":
        return archivedMessages;
      case "all":
      default:
        return allMessages;
    }
  }, [activeTab, archivedMessages, allMessages, filteredMessages, unreadMessages]);

  async function openMessage(message: Message) {
    setSelectedMessage(message);
    if (!message.readAt && message.status === "visible") {
      await ukmApi.markRead(user, message.id);
      await invalidateDashboard();
    }
  }

  async function withRefresh(fn: () => Promise<void>) {
    await fn();
    await invalidateDashboard();
    setSelectedMessage(null);
  }

  return (
    <Screen padded={false}>
      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 120 }}>
        <SectionCard>
          <Text className="font-body text-xs uppercase tracking-[2px]" style={{ color: palette.textMuted }}>
            Inbox return hook
          </Text>
          <Text className="mt-3 font-display text-[28px] leading-[32px]" style={{ color: palette.text }}>
            {newSinceLastVisit > 0 ? `You’re getting responses` : `Try a new prompt to get more`}
          </Text>
          <Text className="mt-2 font-body text-sm leading-6" style={{ color: palette.textMuted }}>
            {newSinceLastVisit > 0 ? `${newSinceLastVisit} new since the last time you opened UKM.` : "Your share tab is the lever. Change the prompt, not the product."}
          </Text>
        </SectionCard>

        <View className="mt-5 flex-row flex-wrap">
          <Pill active={activeTab === "all"} label="All" onPress={() => setActiveTab("all")} />
          <Pill active={activeTab === "unread"} label="Unread" onPress={() => setActiveTab("unread")} />
          <Pill active={activeTab === "filtered"} label="Filtered" onPress={() => setActiveTab("filtered")} />
          <Pill active={activeTab === "archived"} label="Archived" onPress={() => setActiveTab("archived")} />
        </View>

        <View className="mt-5 gap-4">
          {dashboard.messages.some((message) => message.isSeeded) && activeTab === "all" ? (
            <SectionCard>
              <SectionTitle title="Starter questions" hint="These are system-owned icebreakers and do not count toward momentum." />
              {dashboard.messages
                .filter((message) => message.isSeeded)
                .map((message) => (
                  <Text key={message.id} className="mt-2 font-body text-sm leading-6" style={{ color: palette.text }}>
                    • {message.content}
                  </Text>
                ))}
            </SectionCard>
          ) : null}

          {messageList.length === 0 ? (
            <SectionCard>
              <Text className="font-display text-xl" style={{ color: palette.text }}>
                Nothing here yet.
              </Text>
              <Text className="mt-2 font-body text-sm leading-6" style={{ color: palette.textMuted }}>
                The inbox is empty for this filter. That is normal at launch. Keep the share loop moving.
              </Text>
            </SectionCard>
          ) : null}

          {messageList.map((message) => (
            <Pressable key={message.id} onPress={() => openMessage(message)}>
              <SectionCard>
                <View className="flex-row items-center justify-between">
                  <Text className="font-body text-xs uppercase tracking-[1.8px]" style={{ color: palette.textMuted }}>
                    {message.readAt ? "Read" : "Unread"}
                  </Text>
                  <Text className="font-body text-xs uppercase tracking-[1.8px]" style={{ color: palette.textMuted }}>
                    {new Date(message.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text className="mt-3 font-body text-base leading-7" style={{ color: palette.text }}>
                  {message.content}
                </Text>
              </SectionCard>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Modal animationType="slide" presentationStyle="pageSheet" visible={Boolean(selectedMessage)}>
        <Screen>
          <View className="flex-row items-center justify-between">
            <Text className="font-display text-2xl" style={{ color: palette.text }}>
              Message details
            </Text>
            <Pressable onPress={() => setSelectedMessage(null)}>
              <Text className="font-medium text-sm" style={{ color: palette.textMuted }}>
                Close
              </Text>
            </Pressable>
          </View>
          <SectionCard className="mt-5">
            <Text className="font-body text-lg leading-8" style={{ color: palette.text }}>
              {selectedMessage?.content}
            </Text>
          </SectionCard>
          <View className="mt-5 gap-3">
            <PrimaryButton label="Archive" onPress={() => selectedMessage && withRefresh(() => ukmApi.archiveMessage(user, selectedMessage.id))} />
            <PrimaryButton label="Delete" onPress={() => selectedMessage && withRefresh(() => ukmApi.deleteMessage(user, selectedMessage.id))} tone="ghost" />
            <PrimaryButton label="Report" onPress={() => selectedMessage && withRefresh(() => ukmApi.reportMessage(user, selectedMessage.id, "launch_review"))} tone="ghost" />
            <PrimaryButton label="Block sender" onPress={() => selectedMessage && withRefresh(() => ukmApi.blockSender(user, selectedMessage.id))} tone="ghost" />
          </View>
        </Screen>
      </Modal>
    </Screen>
  );
}
