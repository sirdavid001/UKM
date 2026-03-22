import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import { PROMPT_TEMPLATES, SHARE_CHANNELS } from "@/core/config";
import { env } from "@/core/env";
import { useTheme } from "@/core/theme";
import { AppTextInput, FieldLabel, GradientHero, Pill, PrimaryButton, Screen, SectionCard, SectionTitle } from "@/ui/primitives";

const activePrompt = PROMPT_TEMPLATES[0];
const backupPrompt = PROMPT_TEMPLATES[1];
const previewUsername = "david";
const previewDisplayName = "David Mercer";
const previewProfileUrl = `${env.appUrl}/u/${previewUsername}`;
const organicMessages = [
  "You make people feel comfortable fast. Lean into that.",
  "You seem fun, but a little hard to read at first.",
  "Your taste is very specific in a good way.",
];
const filteredMessages = ["You are low-key intimidating until people know you."];
const archivedMessages = ["You should host something. You have convener energy."];

function PreviewTabBar({ active }: { active: "share" | "inbox" | "settings" }) {
  const { palette } = useTheme();
  const items = [
    { key: "share" as const, icon: "sparkles-outline" as const, label: "Share" },
    { key: "inbox" as const, icon: "mail-unread-outline" as const, label: "Inbox" },
    { key: "settings" as const, icon: "options-outline" as const, label: "Settings" },
  ] as const;

  return (
    <View
      className="flex-row border-t px-2 pt-2"
      style={{ backgroundColor: palette.card, borderTopColor: palette.border, height: 78 }}
    >
      {items.map((item) => {
        const selected = item.key === active;

        return (
          <View key={item.key} className="flex-1 items-center justify-center">
            <Ionicons color={selected ? palette.accent : palette.textMuted} name={item.icon} size={22} />
            <Text
              className="mt-1 font-body text-xs"
              style={{ color: selected ? palette.accent : palette.textMuted }}
            >
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function TabShell({
  active,
  children,
}: {
  active: "share" | "inbox" | "settings";
  children: React.ReactNode;
}) {
  return (
    <Screen padded={false}>
      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>
        {children}
      </ScrollView>
      <PreviewTabBar active={active} />
    </Screen>
  );
}

function PreviewLogin() {
  const { palette } = useTheme();

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
          <View className="mt-5 gap-4">
            <View>
              <FieldLabel>Email</FieldLabel>
              <AppTextInput editable={false} placeholder="you@example.com" value="david@ukm.app" />
            </View>
            <PrimaryButton label="Send code" />
          </View>
          <Text className="mt-4 font-body text-xs uppercase tracking-[1.4px]" style={{ color: palette.textMuted }}>
            Backend: Local mock mode
          </Text>
        </SectionCard>
      </View>
    </Screen>
  );
}

function PreviewAge() {
  const { palette } = useTheme();

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
          <AppTextInput editable={false} placeholder="2001-04-17" value="2001-04-17" />
          <Text className="mt-3 font-body text-sm" style={{ color: palette.textMuted }}>
            Format: YYYY-MM-DD
          </Text>
          <View className="mt-5">
            <PrimaryButton label="Continue" />
          </View>
        </SectionCard>
      </View>
    </Screen>
  );
}

function PreviewProfile() {
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
              <AppTextInput editable={false} value={previewDisplayName} />
            </View>
            <View>
              <FieldLabel>Avatar URL (optional)</FieldLabel>
              <AppTextInput editable={false} value="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300" />
            </View>
          </View>
          <View className="mt-5">
            <PrimaryButton label="Continue" />
          </View>
        </SectionCard>
      </View>
    </Screen>
  );
}

function PreviewUsername() {
  const { palette } = useTheme();

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
          <AppTextInput editable={false} placeholder="@ukm" value={previewUsername} />
          <Text className="mt-3 font-body text-sm" style={{ color: palette.textMuted }}>
            Only letters, numbers, and underscores.
          </Text>
          <View className="mt-5">
            <PrimaryButton label="Claim username" />
          </View>
        </SectionCard>
      </View>
    </Screen>
  );
}

function PreviewShare() {
  const { palette } = useTheme();

  return (
    <TabShell active="share">
      <GradientHero
        eyebrow="Launch Mode On"
        title="Prompt-first sharing wins the launch."
        body="UKM is still in its Day-7 cut. Focus on real shares, fast replies, and one loop that can survive outside the product."
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
            People are answering this
          </Text>
          <View className="mt-4 flex-row flex-wrap">
            {PROMPT_TEMPLATES.map((prompt) => (
              <Pill key={prompt.id} active={prompt.id === activePrompt.id} label={prompt.title} onPress={() => {}} />
            ))}
          </View>
          <View className="mt-4 flex-row">
            <Pill active label="Copy A" onPress={() => {}} />
            <Pill label="Copy B" onPress={() => {}} />
          </View>
          <View className="mt-4 rounded-[24px] border p-5" style={{ borderColor: palette.border, backgroundColor: palette.cardMuted }}>
            <Text className="font-display text-2xl" style={{ color: palette.text }}>
              {activePrompt.title}
            </Text>
            <Text className="mt-3 font-body text-sm leading-6" style={{ color: palette.textMuted }}>
              {activePrompt.copyVariants.a}
            </Text>
            <View className="mt-6 flex-row items-center justify-between">
              <Text className="font-body text-sm" style={{ color: palette.textMuted }}>
                @{previewUsername}
              </Text>
              <Text className="font-medium text-sm" style={{ color: palette.accent }}>
                Copy link
              </Text>
            </View>
          </View>
          <View className="mt-5 flex-row items-center justify-between">
            <View>
              <Text className="font-body text-sm" style={{ color: palette.textMuted }}>
                Momentum
              </Text>
              <Text className="font-display text-2xl" style={{ color: palette.text }}>
                +8 responses
              </Text>
            </View>
            <PrimaryButton label="Share now" />
          </View>
        </SectionCard>

        <SectionCard>
          <SectionTitle title="Share channels" hint="Keep distribution lightweight and direct." />
          <View className="flex-row flex-wrap gap-3">
            {SHARE_CHANNELS.map((channel) => (
              <View
                key={channel.key}
                className="min-w-[140px] flex-1 rounded-[22px] border p-4"
                style={{ backgroundColor: palette.cardMuted, borderColor: palette.border }}
              >
                <Text className="font-display text-lg" style={{ color: palette.text }}>
                  {channel.label}
                </Text>
                <Text className="mt-2 font-body text-sm" style={{ color: palette.textMuted }}>
                  {channel.key === "whatsapp"
                    ? "Send the clean link where replies actually happen."
                    : channel.key === "instagram_story"
                      ? "Post the prompt visually and drive taps."
                      : "Copy or share anywhere else."}
                </Text>
              </View>
            ))}
          </View>
        </SectionCard>

        <SectionCard>
          <SectionTitle title="Launch signal" hint="Keep shipping the loop, not the dashboard." />
          <View className="flex-row items-center justify-between">
            <Text className="font-body text-sm" style={{ color: palette.textMuted }}>
              Boost window
            </Text>
            <Text className="font-medium text-sm" style={{ color: palette.text }}>
              18h left
            </Text>
          </View>
          <View className="mt-3 flex-row items-center justify-between">
            <Text className="font-body text-sm" style={{ color: palette.textMuted }}>
              Organic messages
            </Text>
            <Text className="font-medium text-sm" style={{ color: palette.text }}>
              8
            </Text>
          </View>
          <View className="mt-3 flex-row items-center justify-between">
            <Text className="font-body text-sm" style={{ color: palette.textMuted }}>
              Shares logged
            </Text>
            <Text className="font-medium text-sm" style={{ color: palette.text }}>
              14
            </Text>
          </View>
          <View className="mt-3 flex-row items-center justify-between">
            <Text className="font-body text-sm" style={{ color: palette.textMuted }}>
              Public link
            </Text>
            <Text className="font-medium text-sm" style={{ color: palette.text }}>
              {previewProfileUrl.replace(/^https?:\/\//, "")}
            </Text>
          </View>
        </SectionCard>
      </View>
    </TabShell>
  );
}

function PreviewInbox() {
  const { palette } = useTheme();

  return (
    <TabShell active="inbox">
      <SectionCard>
        <Text className="font-body text-xs uppercase tracking-[2px]" style={{ color: palette.textMuted }}>
          Inbox return hook
        </Text>
        <Text className="mt-3 font-display text-[28px] leading-[32px]" style={{ color: palette.text }}>
          You’re getting responses
        </Text>
        <Text className="mt-2 font-body text-sm leading-6" style={{ color: palette.textMuted }}>
          3 new since the last time you opened UKM.
        </Text>
      </SectionCard>

      <View className="mt-5 flex-row flex-wrap">
        <Pill active label="All" onPress={() => {}} />
        <Pill label="Unread" onPress={() => {}} />
        <Pill label="Filtered" onPress={() => {}} />
        <Pill label="Archived" onPress={() => {}} />
      </View>

      <View className="mt-5 gap-4">
        <SectionCard>
          <SectionTitle title="Starter questions" hint="These are system-owned icebreakers and do not count toward momentum." />
          <Text className="mt-2 font-body text-sm leading-6" style={{ color: palette.text }}>
            • What should people ask you about?
          </Text>
          <Text className="mt-2 font-body text-sm leading-6" style={{ color: palette.text }}>
            • What made you join UKM?
          </Text>
        </SectionCard>

        {organicMessages.map((message, index) => (
          <SectionCard key={message}>
            <View className="flex-row items-center justify-between">
              <Text className="font-body text-xs uppercase tracking-[1.8px]" style={{ color: palette.textMuted }}>
                {index === 0 ? "Unread" : "Read"}
              </Text>
              <Text className="font-body text-xs uppercase tracking-[1.8px]" style={{ color: palette.textMuted }}>
                Mar {18 - index}, 2026
              </Text>
            </View>
            <Text className="mt-3 font-body text-base leading-7" style={{ color: palette.text }}>
              {message}
            </Text>
          </SectionCard>
        ))}

        <SectionCard>
          <SectionTitle title="Filtered queue" hint="Hidden or risky replies stay out of the main view." />
          {filteredMessages.map((message) => (
            <Text key={message} className="mt-2 font-body text-sm leading-6" style={{ color: palette.textMuted }}>
              • {message}
            </Text>
          ))}
        </SectionCard>

        <SectionCard>
          <SectionTitle title="Archived" hint="Keep the inbox moving without deleting context." />
          {archivedMessages.map((message) => (
            <Text key={message} className="mt-2 font-body text-sm leading-6" style={{ color: palette.textMuted }}>
              • {message}
            </Text>
          ))}
        </SectionCard>
      </View>
    </TabShell>
  );
}

function PreviewSettings() {
  const { palette } = useTheme();

  return (
    <TabShell active="settings">
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
            <Pill label="Light" onPress={() => {}} />
            <Pill label="Dark" onPress={() => {}} />
            <Pill active label="System" onPress={() => {}} />
          </View>
        </SectionCard>

        <SectionCard>
          <SectionTitle title="Hidden words" hint="Filtered replies stay out of your main inbox." />
          <View>
            <FieldLabel>Add a hidden word</FieldLabel>
            <AppTextInput editable={false} placeholder="spammy phrase" value="weirdly mean" />
            <View className="mt-3">
              <PrimaryButton label="Add word" />
            </View>
          </View>
          <View className="mt-4 flex-row flex-wrap">
            <Pill label="spam" onPress={() => {}} />
            <Pill label="boring" onPress={() => {}} />
            <Pill label="mean" onPress={() => {}} />
          </View>
        </SectionCard>

        <SectionCard>
          <SectionTitle title="Blocked senders" hint="Launch moderation should be reversible." />
          <Text className="font-body text-sm" style={{ color: palette.textMuted }}>
            1 blocked
          </Text>
          <View className="mt-4 gap-3">
            <SectionCard className="px-4 py-4">
              <Text className="font-body text-xs uppercase tracking-[1.6px]" style={{ color: palette.textMuted }}>
                launch review
              </Text>
              <Text className="mt-2 font-body text-sm" style={{ color: palette.text }}>
                Sender 8f27a31c
              </Text>
              <Text className="mt-1 font-body text-sm" style={{ color: palette.textMuted }}>
                Blocked Mar 19, 2026
              </Text>
              <View className="mt-3">
                <PrimaryButton label="Unblock" tone="ghost" />
              </View>
            </SectionCard>
          </View>
        </SectionCard>

        <SectionCard>
          <SectionTitle title="Launch diagnostics" hint="Useful while the product is still proving the core loop." />
          <Text className="font-body text-sm" style={{ color: palette.textMuted }}>
            Backend mode: mock
          </Text>
          <Text className="mt-2 font-body text-sm" style={{ color: palette.textMuted }}>
            Launch mode: enabled
          </Text>
          <Text className="mt-2 font-body text-sm" style={{ color: palette.textMuted }}>
            Signed in as: david@ukm.app
          </Text>
        </SectionCard>

        <PrimaryButton label="Sign out" tone="ghost" />
      </View>
    </TabShell>
  );
}

function PreviewPublicProfile() {
  const { palette } = useTheme();

  return (
    <Screen padded={false}>
      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 120 }}>
        <GradientHero
          eyebrow={`@${previewUsername}`}
          title={backupPrompt.title}
          body="People are answering this."
        />
        <View className="mt-5 gap-5">
          <SectionCard>
            <View className="flex-row items-center">
              <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: palette.cardMuted }}>
                <Text className="font-display text-xl" style={{ color: palette.text }}>
                  D
                </Text>
              </View>
              <View className="ml-4 flex-1">
                <Text className="font-display text-2xl" style={{ color: palette.text }}>
                  {previewDisplayName}
                </Text>
                <Text className="mt-1 font-body text-sm" style={{ color: palette.textMuted }}>
                  @{previewUsername}
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
              {backupPrompt.suggestedReplies.map((reply) => (
                <Pill key={reply} label={reply} onPress={() => {}} />
              ))}
            </View>
            <View className="mt-5">
              <FieldLabel>Your anonymous reply</FieldLabel>
              <AppTextInput
                editable={false}
                multiline
                numberOfLines={5}
                placeholder="Type something honest..."
                value="You come across as thoughtful, but a little intimidating at first."
              />
            </View>
            <View className="mt-5">
              <PrimaryButton label="Send anonymously" />
            </View>
          </SectionCard>

          <SectionCard>
            <Text className="font-display text-2xl" style={{ color: palette.text }}>
              Sent.
            </Text>
            <Text className="mt-2 font-body text-sm leading-6" style={{ color: palette.textMuted }}>
              Your reply is on the way. If you want to keep the loop alive, send another while you’re here.
            </Text>
            <View className="mt-4">
              <PrimaryButton label="Send another" tone="ghost" />
            </View>
          </SectionCard>
        </View>
      </ScrollView>
    </Screen>
  );
}

function PhoneFrame({ children, title }: { children: React.ReactNode; title: string }) {
  const { palette } = useTheme();

  return (
    <View className="w-full max-w-[440px]">
      <Text className="mb-3 font-display text-xl" style={{ color: palette.text }}>
        {title}
      </Text>
      <View
        className="overflow-hidden rounded-[32px] border"
        style={{ borderColor: palette.border, backgroundColor: palette.background, height: 920 }}
      >
        {children}
      </View>
    </View>
  );
}

function PreviewAll() {
  const { palette } = useTheme();

  return (
    <Screen padded={false}>
      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 80 }}>
        <GradientHero
          eyebrow="UKM / Figma Board"
          title="All major frontend surfaces"
          body="Login, onboarding, owner tabs, and the public reply flow in one capture board."
        />
        <View className="mt-6 items-center gap-8">
          <PhoneFrame title="Login">
            <PreviewLogin />
          </PhoneFrame>
          <PhoneFrame title="Age Gate">
            <PreviewAge />
          </PhoneFrame>
          <PhoneFrame title="Profile Setup">
            <PreviewProfile />
          </PhoneFrame>
          <PhoneFrame title="Username Claim">
            <PreviewUsername />
          </PhoneFrame>
          <PhoneFrame title="Share Tab">
            <PreviewShare />
          </PhoneFrame>
          <PhoneFrame title="Inbox Tab">
            <PreviewInbox />
          </PhoneFrame>
          <PhoneFrame title="Settings Tab">
            <PreviewSettings />
          </PhoneFrame>
          <PhoneFrame title="Public Profile">
            <PreviewPublicProfile />
          </PhoneFrame>
        </View>
        <Text className="mt-8 text-center font-body text-sm" style={{ color: palette.textMuted }}>
          Capture board generated for Figma MCP.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function PreviewIndex() {
  const { palette } = useTheme();

  return (
    <Screen>
      <SectionCard>
        <Text className="font-display text-2xl" style={{ color: palette.text }}>
          Unknown preview
        </Text>
        <Text className="mt-2 font-body text-sm leading-6" style={{ color: palette.textMuted }}>
          Use one of: login, age, profile, username, share, inbox, settings, public.
        </Text>
      </SectionCard>
    </Screen>
  );
}

export default function FigmaPreviewScreen() {
  const params = useLocalSearchParams<{ screen?: string | string[] }>();
  const screen = Array.isArray(params.screen) ? params.screen[0] : params.screen;

  switch (screen) {
    case "login":
      return <PreviewLogin />;
    case "age":
      return <PreviewAge />;
    case "profile":
      return <PreviewProfile />;
    case "username":
      return <PreviewUsername />;
    case "share":
      return <PreviewShare />;
    case "inbox":
      return <PreviewInbox />;
    case "settings":
      return <PreviewSettings />;
    case "public":
      return <PreviewPublicProfile />;
    case "all":
      return <PreviewAll />;
    default:
      return <PreviewIndex />;
  }
}
