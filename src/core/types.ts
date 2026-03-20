export type ThemePreference = "light" | "dark" | "system";
export type MessageStatus = "visible" | "filtered" | "archived" | "flagged";
export type BoostState = "none" | "first_24h";
export type CopyVariantKey = "a" | "b";
export type LinkChannel = "whatsapp" | "instagram_story" | "generic" | "copy" | "app" | "unknown";

export type AppFlags = {
  launchMode: boolean;
  curiosityHintsEnabled: boolean;
  growthAutomationEnabled: boolean;
  globalOptimizationEnabled: boolean;
};

export type PromptTemplate = {
  id: string;
  slug: string;
  title: string;
  baseRank: number;
  isActive: boolean;
  suggestedReplies: string[];
  copyVariants: Record<CopyVariantKey, string>;
};

export type Profile = {
  id: string;
  email: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  themePreference: ThemePreference;
  dob: string | null;
  onboardingComplete: boolean;
  activePromptId: string | null;
  onboardingBoostExpiresAt: string | null;
  lastInboxOpenedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SenderIdentity = {
  id: string;
  recipientId: string;
  sessionFingerprintHash: string;
  networkFingerprintHash: string;
  behaviorSignatureHash: string;
  fingerprintConfidenceScore: number;
  abuseScore: number;
  abuseScoreLastUpdatedAt: string;
  shadowLimitedUntil: string | null;
  createdAt: string;
};

export type Message = {
  id: string;
  recipientId: string;
  promptId: string;
  senderIdentityId: string | null;
  content: string;
  status: MessageStatus;
  moderationScore: number;
  abuseScore: number;
  isSeeded: boolean;
  source: "web" | "app";
  readAt: string | null;
  createdAt: string;
};

export type LinkEvent = {
  id: string;
  userId: string;
  eventType:
    | "view"
    | "submit"
    | "share"
    | "copy_link"
    | "open_app"
    | "inbox_open"
    | "recovery_view";
  channel: LinkChannel;
  copyVariantKey: CopyVariantKey | null;
  createdAt: string;
  metadata: Record<string, string | number | boolean | null>;
};

export type ReportRecord = {
  id: string;
  messageId: string;
  reporterId: string;
  reason: string;
  createdAt: string;
};

export type BlockedSenderRecord = {
  senderIdentityId: string;
  reason: string;
  createdAt: string;
};

export type SessionUser = {
  id: string;
  email: string;
};

export type PublicProfile = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  activePrompt: PromptTemplate;
  organicSubmissions7d: number;
};

export type SubmitMessageInput = {
  username: string;
  promptId: string;
  content: string;
  senderSessionId: string;
  senderConfidence: "high" | "low";
  copyVariantKey: CopyVariantKey;
  channel?: LinkChannel;
};

export type SubmitMessageResult = {
  accepted: boolean;
  message?: string;
  canSendAnother: boolean;
};

export type DashboardSnapshot = {
  profile: Profile;
  prompts: PromptTemplate[];
  messages: Message[];
  hiddenWords: string[];
  blockedSenders: BlockedSenderRecord[];
  linkEvents: LinkEvent[];
  flags: AppFlags;
};
