import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

import { APP_FLAGS, PROMPT_TEMPLATES, STARTER_MESSAGES } from "@/core/config";
import { isSupabaseConfigured } from "@/core/env";
import { supabase } from "@/core/supabase";
import type {
  AppFlags,
  CopyVariantKey,
  DashboardSnapshot,
  LinkEvent,
  Message,
  Profile,
  PublicProfile,
  ReportRecord,
  SenderIdentity,
  SessionUser,
  SubmitMessageInput,
  SubmitMessageResult,
  ThemePreference,
} from "@/core/types";

const MOCK_DB_KEY = "ukm.mock-db.v1";
const DEMO_OTP = "000000";
const PROFANITY = ["hate", "stupid", "idiot", "die", "ugly", "bitch"];

type MockDb = {
  profiles: Profile[];
  messages: Message[];
  hiddenWords: { userId: string; word: string }[];
  blockedSenders: { userId: string; senderIdentityId: string; reason: string }[];
  reports: ReportRecord[];
  linkEvents: LinkEvent[];
  senderIdentities: SenderIdentity[];
  submissionEvents: {
    recipientId: string;
    promptId: string;
    senderIdentityId: string | null;
    outcome: "visible" | "filtered" | "flagged" | "retry" | "blocked";
    source: "web" | "app";
    abuseScore: number;
    captchaRequired: boolean;
    copyVariantKey: CopyVariantKey | null;
    createdAt: string;
  }[];
  pushTokens: { userId: string; token: string; platform: string; updatedAt: string }[];
  appFlags: AppFlags;
};

function nowIso() {
  return new Date().toISOString();
}

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function normalizeWord(word: string) {
  return word.trim().toLowerCase();
}

function demoHash(input: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}

async function loadMockDb(): Promise<MockDb> {
  const raw = await AsyncStorage.getItem(MOCK_DB_KEY);

  if (!raw) {
    const seeded: MockDb = {
      profiles: [],
      messages: [],
      hiddenWords: [],
      blockedSenders: [],
      reports: [],
      linkEvents: [],
      senderIdentities: [],
      submissionEvents: [],
      pushTokens: [],
      appFlags: APP_FLAGS,
    };
    await AsyncStorage.setItem(MOCK_DB_KEY, JSON.stringify(seeded));
    return seeded;
  }

  const parsed = JSON.parse(raw) as Partial<MockDb>;

  return {
    profiles: parsed.profiles ?? [],
    messages: parsed.messages ?? [],
    hiddenWords: parsed.hiddenWords ?? [],
    blockedSenders: parsed.blockedSenders ?? [],
    reports: parsed.reports ?? [],
    linkEvents: parsed.linkEvents ?? [],
    senderIdentities: parsed.senderIdentities ?? [],
    submissionEvents: parsed.submissionEvents ?? [],
    pushTokens: parsed.pushTokens ?? [],
    appFlags: parsed.appFlags ?? APP_FLAGS,
  };
}

async function saveMockDb(db: MockDb) {
  await AsyncStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));
}

async function waitForSuspiciousDelay() {
  const jitterMs = 1000 + Math.floor(Math.random() * 2000);
  await new Promise((resolve) => setTimeout(resolve, jitterMs));
}

function defaultProfile(email: string): Profile {
  const timestamp = nowIso();

  return {
    id: Crypto.randomUUID(),
    email,
    username: null,
    displayName: null,
    avatarUrl: null,
    themePreference: "system",
    dob: null,
    onboardingComplete: false,
    activePromptId: PROMPT_TEMPLATES[0].id,
    onboardingBoostExpiresAt: null,
    lastInboxOpenedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

async function ensureMockProfile(email: string) {
  const db = await loadMockDb();
  const existing = db.profiles.find((profile) => profile.email === email);

  if (existing) {
    return existing;
  }

  const profile = defaultProfile(email);
  db.profiles.push(profile);
  await saveMockDb(db);
  return profile;
}

function messageIsUnread(message: Message) {
  return !message.readAt && message.status === "visible";
}

function messageIsArchived(message: Message) {
  return message.status === "archived";
}

function messageIsFiltered(message: Message) {
  return message.status === "filtered" || message.status === "flagged";
}

function sortInbox(messages: Message[]) {
  return [...messages].sort((left, right) => {
    const leftUnread = messageIsUnread(left) ? 1 : 0;
    const rightUnread = messageIsUnread(right) ? 1 : 0;

    if (leftUnread !== rightUnread) {
      return rightUnread - leftUnread;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

async function seedStarterMessages(recipientId: string) {
  const db = await loadMockDb();
  const existing = db.messages.filter((message) => message.recipientId === recipientId && message.isSeeded);

  if (existing.length > 0) {
    return;
  }

  for (const content of STARTER_MESSAGES) {
    db.messages.push({
      id: Crypto.randomUUID(),
      recipientId,
      promptId: PROMPT_TEMPLATES[0].id,
      senderIdentityId: null,
      content,
      status: "visible",
      moderationScore: 0,
      abuseScore: 0,
      isSeeded: true,
      source: "app",
      readAt: null,
      createdAt: nowIso(),
    });
  }

  await saveMockDb(db);
}

function organicMessages(messages: Message[]) {
  return messages.filter((message) => !message.isSeeded && message.status === "visible");
}

function recentOrganicMessages(messages: Message[]) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return organicMessages(messages).filter((message) => new Date(message.createdAt).getTime() >= weekAgo);
}

async function getPublicProfileFromMock(username: string): Promise<PublicProfile | null> {
  const db = await loadMockDb();
  const profile = db.profiles.find((item) => item.username === username);

  if (!profile) {
    return null;
  }

  const prompt = PROMPT_TEMPLATES.find((item) => item.id === profile.activePromptId) ?? PROMPT_TEMPLATES[0];
  const profileMessages = db.messages.filter((message) => message.recipientId === profile.id);

  return {
    id: profile.id,
    username,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    activePrompt: prompt,
    organicSubmissions7d: recentOrganicMessages(profileMessages).length,
  };
}

async function upsertMockSenderIdentity({
  recipientId,
  senderSessionId,
  senderConfidence,
}: {
  recipientId: string;
  senderSessionId: string;
  senderConfidence: "high" | "low";
}) {
  const db = await loadMockDb();
  const sessionHash = await demoHash(`${recipientId}:${senderSessionId}`);
  const networkHash = await demoHash(`${recipientId}:demo-network`);
  const behaviorHash = await demoHash(`${recipientId}:${senderSessionId}:behavior`);
  let identity = db.senderIdentities.find((item) => item.recipientId === recipientId && item.sessionFingerprintHash === sessionHash);

  if (!identity) {
    identity = {
      id: Crypto.randomUUID(),
      recipientId,
      sessionFingerprintHash: sessionHash,
      networkFingerprintHash: networkHash,
      behaviorSignatureHash: behaviorHash,
      fingerprintConfidenceScore: senderConfidence === "high" ? 1 : 0.55,
      abuseScore: 0,
      abuseScoreLastUpdatedAt: nowIso(),
      shadowLimitedUntil: null,
      createdAt: nowIso(),
    };
    db.senderIdentities.push(identity);
    await saveMockDb(db);
  }

  return identity;
}

async function submitMockMessage(input: SubmitMessageInput): Promise<SubmitMessageResult> {
  const db = await loadMockDb();
  const publicProfile = db.profiles.find((profile) => profile.username === input.username);

  if (!publicProfile) {
    return { accepted: false, canSendAnother: false, message: "That profile does not exist anymore." };
  }

  const identity = await upsertMockSenderIdentity({
    recipientId: publicProfile.id,
    senderSessionId: input.senderSessionId,
    senderConfidence: input.senderConfidence,
  });

  const submissionsThisHour = db.messages.filter(
    (message) =>
      message.senderIdentityId === identity.id &&
      new Date(message.createdAt).getTime() >= Date.now() - 60 * 60 * 1000 &&
      !message.isSeeded,
  );
  const sameNetworkIdentityIds = new Set(
    db.senderIdentities
      .filter((item) => item.recipientId === publicProfile.id && item.networkFingerprintHash === identity.networkFingerprintHash)
      .map((item) => item.id),
  );
  const networkSubmissionsThisHour = db.messages.filter(
    (message) =>
      message.recipientId === publicProfile.id &&
      Boolean(message.senderIdentityId && sameNetworkIdentityIds.has(message.senderIdentityId)) &&
      new Date(message.createdAt).getTime() >= Date.now() - 60 * 60 * 1000 &&
      !message.isSeeded,
  );
  const boostActive = publicProfile.onboardingBoostExpiresAt
    ? new Date(publicProfile.onboardingBoostExpiresAt).getTime() > Date.now()
    : false;
  const sessionCap = boostActive ? 3 : 2;
  const networkCap = boostActive ? 12 : 8;
  const isBlocked = db.blockedSenders.some((item) => item.userId === publicProfile.id && item.senderIdentityId === identity.id);

  if (isBlocked) {
    await waitForSuspiciousDelay();
    db.submissionEvents.push({
      recipientId: publicProfile.id,
      promptId: input.promptId,
      senderIdentityId: identity.id,
      outcome: "blocked",
      source: "web",
      abuseScore: 0.92,
      captchaRequired: false,
      copyVariantKey: input.copyVariantKey,
      createdAt: nowIso(),
    });
    await saveMockDb(db);
    return { accepted: false, canSendAnother: false, message: "Try again in a moment." };
  }

  if (submissionsThisHour.length >= sessionCap || networkSubmissionsThisHour.length >= networkCap) {
    await waitForSuspiciousDelay();
    db.submissionEvents.push({
      recipientId: publicProfile.id,
      promptId: input.promptId,
      senderIdentityId: identity.id,
      outcome: "retry",
      source: "web",
      abuseScore: 0.66,
      captchaRequired: false,
      copyVariantKey: input.copyVariantKey,
      createdAt: nowIso(),
    });
    await saveMockDb(db);
    return { accepted: false, canSendAnother: false, message: "Try again in a moment." };
  }

  const hiddenWords = db.hiddenWords.filter((item) => item.userId === publicProfile.id).map((item) => item.word);
  const normalized = input.content.trim().toLowerCase();
  const hasProfanity = PROFANITY.some((word) => normalized.includes(word));
  const hasHiddenWord = hiddenWords.some((word) => normalized.includes(word));
  const status: Message["status"] = hasProfanity || hasHiddenWord ? "filtered" : "visible";

  db.messages.push({
    id: Crypto.randomUUID(),
    recipientId: publicProfile.id,
    promptId: input.promptId,
    senderIdentityId: identity.id,
    content: input.content.trim(),
    status,
    moderationScore: hasProfanity || hasHiddenWord ? 0.84 : 0.1,
    abuseScore: submissionsThisHour.length >= sessionCap - 1 ? 0.6 : 0.2,
    isSeeded: false,
    source: "web",
    readAt: null,
    createdAt: nowIso(),
  });
  db.linkEvents.push({
    id: Crypto.randomUUID(),
    userId: publicProfile.id,
    eventType: "submit",
    channel: input.channel ?? "unknown",
    copyVariantKey: input.copyVariantKey,
    createdAt: nowIso(),
    metadata: {},
  });
  db.submissionEvents.push({
    recipientId: publicProfile.id,
    promptId: input.promptId,
    senderIdentityId: identity.id,
    outcome: status,
    source: "web",
    abuseScore: status === "visible" ? 0.2 : 0.62,
    captchaRequired: false,
    copyVariantKey: input.copyVariantKey,
    createdAt: nowIso(),
  });
  await saveMockDb(db);

  return { accepted: true, canSendAnother: true };
}

async function buildMockDashboard(email: string): Promise<DashboardSnapshot> {
  const db = await loadMockDb();
  const profile = db.profiles.find((item) => item.email === email) ?? (await ensureMockProfile(email));
  const messages = db.messages.filter((item) => item.recipientId === profile.id);

  return {
    profile,
    prompts: PROMPT_TEMPLATES,
    messages: sortInbox(messages),
    hiddenWords: db.hiddenWords.filter((item) => item.userId === profile.id).map((item) => item.word),
    blockedSenderIds: db.blockedSenders.filter((item) => item.userId === profile.id).map((item) => item.senderIdentityId),
    linkEvents: db.linkEvents.filter((item) => item.userId === profile.id),
    flags: db.appFlags,
  };
}

async function updateMockProfile(email: string, updater: (profile: Profile) => Profile) {
  const db = await loadMockDb();
  const index = db.profiles.findIndex((item) => item.email === email);
  const profile = index >= 0 ? db.profiles[index] : defaultProfile(email);
  const next = updater({ ...profile, updatedAt: nowIso() });

  if (index >= 0) {
    db.profiles[index] = next;
  } else {
    db.profiles.push(next);
  }

  await saveMockDb(db);
  return next;
}

async function trackMockLinkEvent(email: string, event: Omit<LinkEvent, "id" | "userId" | "createdAt">) {
  const db = await loadMockDb();
  const profile = db.profiles.find((item) => item.email === email);

  if (!profile) {
    return;
  }

  db.linkEvents.push({
    id: Crypto.randomUUID(),
    userId: profile.id,
    createdAt: nowIso(),
    ...event,
  });
  await saveMockDb(db);
}

export const ukmApi = {
  async requestOtp(email: string) {
    if (!isSupabaseConfigured || !supabase) {
      await ensureMockProfile(email);
      return { mode: "mock" as const, demoCode: DEMO_OTP };
    }

    await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    return { mode: "supabase" as const };
  },

  async verifyOtp(email: string, code: string): Promise<SessionUser> {
    if (!isSupabaseConfigured || !supabase) {
      if (code !== DEMO_OTP) {
        throw new Error(`Use ${DEMO_OTP} in local mock mode.`);
      }

      const profile = await ensureMockProfile(email);
      return { id: profile.id, email: profile.email };
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (error || !data.user) {
      throw error ?? new Error("Could not verify the code.");
    }

    const user: SessionUser = { id: data.user.id, email: data.user.email ?? email };
    return user;
  },

  async restoreSession(): Promise<SessionUser | null> {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    const { data } = await supabase.auth.getSession();

    if (!data.session?.user) {
      return null;
    }

    return { id: data.session.user.id, email: data.session.user.email ?? "" };
  },

  async signOut() {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
  },

  async getDashboard(session: SessionUser): Promise<DashboardSnapshot> {
    if (!isSupabaseConfigured || !supabase) {
      return buildMockDashboard(session.email);
    }

    const [{ data: profile }, { data: templates }, { data: flags }, { data: messages }, { data: hiddenWords }, { data: blocks }, { data: linkEvents }] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", session.id).single(),
        supabase.from("prompt_templates").select("*").eq("is_active", true).order("base_rank", { ascending: false }),
        supabase.from("app_flags").select("*").limit(1).single(),
        supabase.from("messages").select("*").eq("recipient_id", session.id).order("created_at", { ascending: false }),
        supabase.from("hidden_words").select("word").eq("user_id", session.id),
        supabase.from("blocked_senders").select("sender_identity_id").eq("user_id", session.id),
        supabase.from("link_events").select("*").eq("user_id", session.id).order("created_at", { ascending: false }),
      ]);

    if (!profile) {
      const mockProfile = await ensureMockProfile(session.email);
      return buildMockDashboard(mockProfile.email);
    }

    return {
      profile: mapRemoteProfile(profile),
      prompts: (templates ?? []).map(mapPromptTemplate),
      messages: sortInbox((messages ?? []).map(mapRemoteMessage)),
      hiddenWords: (hiddenWords ?? []).map((row) => row.word),
      blockedSenderIds: (blocks ?? []).map((row) => row.sender_identity_id),
      linkEvents: (linkEvents ?? []).map(mapRemoteLinkEvent),
      flags: mapRemoteFlags(flags),
    };
  },

  async saveAgeGate(session: SessionUser, dob: string) {
    const birthDate = new Date(dob);
    const age = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(birthDate.getTime()) || age < 18) {
      throw new Error("You need to be 18 or older to use UKM.");
    }

    if (!isSupabaseConfigured || !supabase) {
      return updateMockProfile(session.email, (profile) => ({ ...profile, dob }));
    }

    const { data, error } = await supabase
      .from("profiles")
      .upsert({ id: session.id, email: session.email, dob, updated_at: nowIso() })
      .select("*")
      .single();

    if (error || !data) {
      throw error ?? new Error("Could not save your birthday.");
    }

    return mapRemoteProfile(data);
  },

  async saveProfile(session: SessionUser, values: { displayName: string; avatarUrl: string }) {
    if (!isSupabaseConfigured || !supabase) {
      return updateMockProfile(session.email, (profile) => ({
        ...profile,
        displayName: values.displayName || null,
        avatarUrl: values.avatarUrl || null,
      }));
    }

    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        id: session.id,
        email: session.email,
        display_name: values.displayName || null,
        avatar_url: values.avatarUrl || null,
        updated_at: nowIso(),
      })
      .select("*")
      .single();

    if (error || !data) {
      throw error ?? new Error("Could not save your profile.");
    }

    return mapRemoteProfile(data);
  },

  async claimUsername(session: SessionUser, desiredUsername: string) {
    const username = normalizeUsername(desiredUsername);

    if (!username || username.length < 3) {
      throw new Error("Usernames need at least 3 characters.");
    }

    if (!isSupabaseConfigured || !supabase) {
      const db = await loadMockDb();
      const taken = db.profiles.some((profile) => profile.username === username && profile.email !== session.email);

      if (taken) {
        throw new Error("That username is already taken.");
      }

      const next = await updateMockProfile(session.email, (profile) => ({
        ...profile,
        username,
        onboardingComplete: true,
        onboardingBoostExpiresAt: hoursFromNow(24),
      }));
      await seedStarterMessages(next.id);
      return next;
    }

    const { data, error } = await supabase.functions.invoke("claim-username", {
      body: { desiredUsername: username },
    });

    if (error) {
      throw error;
    }

    const next = await this.getDashboard(session);

    return next.profile;
  },

  async setThemePreference(session: SessionUser, themePreference: ThemePreference) {
    if (!isSupabaseConfigured || !supabase) {
      return updateMockProfile(session.email, (profile) => ({ ...profile, themePreference }));
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({ theme_preference: themePreference, updated_at: nowIso() })
      .eq("id", session.id)
      .select("*")
      .single();

    if (error || !data) {
      throw error ?? new Error("Could not update the theme.");
    }

    return mapRemoteProfile(data);
  },

  async setActivePrompt(session: SessionUser, promptId: string) {
    if (!isSupabaseConfigured || !supabase) {
      return updateMockProfile(session.email, (profile) => ({ ...profile, activePromptId: promptId }));
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({ active_prompt_id: promptId, updated_at: nowIso() })
      .eq("id", session.id)
      .select("*")
      .single();

    if (error || !data) {
      throw error ?? new Error("Could not switch prompts.");
    }

    return mapRemoteProfile(data);
  },

  async addHiddenWord(session: SessionUser, word: string) {
    const normalized = normalizeWord(word);

    if (!normalized) {
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      const db = await loadMockDb();
      const exists = db.hiddenWords.some((item) => item.userId === session.id && item.word === normalized);

      if (!exists) {
        db.hiddenWords.push({ userId: session.id, word: normalized });
        await saveMockDb(db);
      }

      return;
    }

    await supabase.from("hidden_words").insert({ user_id: session.id, word: normalized });
  },

  async removeHiddenWord(session: SessionUser, word: string) {
    const normalized = normalizeWord(word);

    if (!isSupabaseConfigured || !supabase) {
      const db = await loadMockDb();
      db.hiddenWords = db.hiddenWords.filter((item) => !(item.userId === session.id && item.word === normalized));
      await saveMockDb(db);
      return;
    }

    await supabase.from("hidden_words").delete().eq("user_id", session.id).eq("word", normalized);
  },

  async markRead(session: SessionUser, messageId: string) {
    if (!isSupabaseConfigured || !supabase) {
      const db = await loadMockDb();
      db.messages = db.messages.map((message) =>
        message.id === messageId && message.recipientId === session.id ? { ...message, readAt: nowIso() } : message,
      );
      await saveMockDb(db);
      return;
    }

    await supabase.from("messages").update({ read_at: nowIso() }).eq("id", messageId).eq("recipient_id", session.id);
  },

  async archiveMessage(session: SessionUser, messageId: string) {
    if (!isSupabaseConfigured || !supabase) {
      const db = await loadMockDb();
      db.messages = db.messages.map((message) =>
        message.id === messageId && message.recipientId === session.id ? { ...message, status: "archived", readAt: message.readAt ?? nowIso() } : message,
      );
      await saveMockDb(db);
      return;
    }

    await supabase.from("messages").update({ status: "archived", read_at: nowIso() }).eq("id", messageId).eq("recipient_id", session.id);
  },

  async deleteMessage(session: SessionUser, messageId: string) {
    if (!isSupabaseConfigured || !supabase) {
      const db = await loadMockDb();
      db.messages = db.messages.filter((message) => !(message.id === messageId && message.recipientId === session.id));
      await saveMockDb(db);
      return;
    }

    await supabase.from("messages").delete().eq("id", messageId).eq("recipient_id", session.id);
  },

  async reportMessage(session: SessionUser, messageId: string, reason: string) {
    if (!isSupabaseConfigured || !supabase) {
      const db = await loadMockDb();
      db.reports.push({
        id: Crypto.randomUUID(),
        messageId,
        reporterId: session.id,
        reason,
        createdAt: nowIso(),
      });
      await saveMockDb(db);
      return;
    }

    await supabase.functions.invoke("report-message", { body: { messageId, reason } });
  },

  async blockSender(session: SessionUser, messageId: string) {
    if (!isSupabaseConfigured || !supabase) {
      const db = await loadMockDb();
      const message = db.messages.find((item) => item.id === messageId && item.recipientId === session.id);

      if (!message?.senderIdentityId) {
        return;
      }

      db.blockedSenders.push({
        userId: session.id,
        senderIdentityId: message.senderIdentityId,
        reason: "manual_block",
      });
      await saveMockDb(db);
      return;
    }

    await supabase.functions.invoke("block-sender", { body: { messageId } });
  },

  async getPublicProfile(username: string) {
    if (!isSupabaseConfigured || !supabase) {
      return getPublicProfileFromMock(username);
    }

    const { data, error } = await supabase.rpc("get_public_profile", { target_username: username });

    if (error || !data?.length) {
      return null;
    }

    const row = data[0];
    const prompt = PROMPT_TEMPLATES.find((item) => item.id === row.active_prompt_id) ?? PROMPT_TEMPLATES[0];

    return {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      activePrompt: prompt,
      organicSubmissions7d: row.organic_submissions_7d ?? 0,
    } satisfies PublicProfile;
  },

  async submitAnonymousMessage(input: SubmitMessageInput) {
    if (!isSupabaseConfigured || !supabase) {
      return submitMockMessage(input);
    }

    const { data, error } = await supabase.functions.invoke("submit-anonymous-message", {
      body: input,
    });

    if (error) {
      throw error;
    }

    return (data as SubmitMessageResult) ?? { accepted: true, canSendAnother: true };
  },

  async registerPushToken(session: SessionUser, token: string) {
    if (!token) {
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      const db = await loadMockDb();
      const existing = db.pushTokens.find((item) => item.userId === session.id && item.token === token);

      if (existing) {
        existing.updatedAt = nowIso();
      } else {
        db.pushTokens.push({
          userId: session.id,
          token,
          platform: "expo",
          updatedAt: nowIso(),
        });
      }

      await saveMockDb(db);
      return;
    }

    await supabase.functions.invoke("register-push-token", {
      body: { token, platform: "expo" },
    });
  },

  async trackShare(email: string, channel: LinkEvent["channel"], copyVariantKey: CopyVariantKey) {
    if (!isSupabaseConfigured || !supabase) {
      return trackMockLinkEvent(email, {
        eventType: "share",
        channel,
        copyVariantKey,
        metadata: {},
      });
    }

    const { data: session } = await supabase.auth.getSession();

    if (!session.session?.user) {
      return;
    }

    await supabase.functions.invoke("track-link-event", {
      body: { eventType: "share", channel, copyVariantKey },
    });
  },

  async recordInboxOpened(session: SessionUser) {
    if (!isSupabaseConfigured || !supabase) {
      const db = await loadMockDb();
      const index = db.profiles.findIndex((item) => item.id === session.id || item.email === session.email);

      if (index >= 0) {
        db.profiles[index] = {
          ...db.profiles[index],
          lastInboxOpenedAt: nowIso(),
          updatedAt: nowIso(),
        };
        db.linkEvents.push({
          id: Crypto.randomUUID(),
          userId: db.profiles[index].id,
          eventType: "inbox_open",
          channel: "app",
          copyVariantKey: null,
          createdAt: nowIso(),
          metadata: {},
        });
        await saveMockDb(db);
      }

      return;
    }

    await supabase.from("profiles").update({ last_inbox_opened_at: nowIso(), updated_at: nowIso() }).eq("id", session.id);
    await supabase.functions.invoke("track-link-event", {
      body: {
        eventType: "inbox_open",
        channel: "app",
        copyVariantKey: null,
        metadata: {},
      },
    });
  },

  async trackPublicEvent(username: string, eventType: "view" | "open_app", copyVariantKey: CopyVariantKey | null = null) {
    if (!isSupabaseConfigured || !supabase) {
      const db = await loadMockDb();
      const profile = db.profiles.find((item) => item.username === username);

      if (!profile) {
        return;
      }

      db.linkEvents.push({
        id: Crypto.randomUUID(),
        userId: profile.id,
        eventType,
        channel: eventType === "open_app" ? "app" : "unknown",
        copyVariantKey,
        createdAt: nowIso(),
        metadata: {},
      });
      await saveMockDb(db);
      return;
    }

    await supabase.functions.invoke("track-public-event", {
      body: { username, eventType, copyVariantKey },
    });
  },
};

function mapPromptTemplate(row: Record<string, unknown>) {
  const existing = PROMPT_TEMPLATES.find((item) => item.id === row.id || item.slug === row.slug);
  return existing ?? PROMPT_TEMPLATES[0];
}

function mapRemoteProfile(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    email: String(row.email ?? ""),
    username: row.username ? String(row.username) : null,
    displayName: row.display_name ? String(row.display_name) : null,
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    themePreference: (row.theme_preference as ThemePreference | null) ?? "system",
    dob: row.dob ? String(row.dob) : null,
    onboardingComplete: Boolean(row.onboarding_complete),
    activePromptId: row.active_prompt_id ? String(row.active_prompt_id) : PROMPT_TEMPLATES[0].id,
    onboardingBoostExpiresAt: row.onboarding_boost_expires_at ? String(row.onboarding_boost_expires_at) : null,
    lastInboxOpenedAt: row.last_inbox_opened_at ? String(row.last_inbox_opened_at) : null,
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: String(row.updated_at ?? nowIso()),
  };
}

function mapRemoteMessage(row: Record<string, unknown>): Message {
  return {
    id: String(row.id),
    recipientId: String(row.recipient_id),
    promptId: String(row.prompt_id),
    senderIdentityId: row.sender_identity_id ? String(row.sender_identity_id) : null,
    content: String(row.content ?? ""),
    status: (row.status as Message["status"]) ?? "visible",
    moderationScore: Number(row.moderation_score ?? 0),
    abuseScore: Number(row.abuse_score ?? 0),
    isSeeded: Boolean(row.is_seeded),
    source: (row.source as Message["source"]) ?? "app",
    readAt: row.read_at ? String(row.read_at) : null,
    createdAt: String(row.created_at ?? nowIso()),
  };
}

function mapRemoteFlags(row: Record<string, unknown> | null): AppFlags {
  if (!row) {
    return APP_FLAGS;
  }

  return {
    launchMode: Boolean(row.launch_mode),
    curiosityHintsEnabled: Boolean(row.curiosity_hints_enabled),
    growthAutomationEnabled: Boolean(row.growth_automation_enabled),
    globalOptimizationEnabled: Boolean(row.global_optimization_enabled),
  };
}

function mapRemoteLinkEvent(row: Record<string, unknown>): LinkEvent {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    eventType: row.event_type as LinkEvent["eventType"],
    channel: (row.channel as LinkEvent["channel"]) ?? "unknown",
    copyVariantKey: (row.copy_variant_key as CopyVariantKey | null) ?? null,
    createdAt: String(row.created_at ?? nowIso()),
    metadata: (row.metadata as LinkEvent["metadata"]) ?? {},
  };
}
