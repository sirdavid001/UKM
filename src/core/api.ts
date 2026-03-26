import { APP_FLAGS, PROMPT_TEMPLATES } from "@/core/config";
import { getMissingPublicEnvMessage, isSupabaseConfigured } from "@/core/env";
import { supabase } from "@/core/supabase";
import type {
  AppFlags,
  BlockedSenderRecord,
  CopyVariantKey,
  DashboardSnapshot,
  LinkEvent,
  LinkChannel,
  Message,
  Profile,
  PublicProfile,
  SessionUser,
  SubmitMessageInput,
  SubmitMessageResult,
  ThemePreference,
} from "@/core/types";

function nowIso() {
  return new Date().toISOString();
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function normalizeWord(word: string) {
  return word.trim().toLowerCase();
}

function messageIsUnread(message: Message) {
  return !message.readAt && message.status === "visible";
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

function requireSupabaseClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(getMissingPublicEnvMessage());
  }

  return supabase;
}

export const ukmApi = {
  async requestOtp(email: string) {
    const client = requireSupabaseClient();

    await client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    return { mode: "supabase" as const };
  },

  async verifyOtp(email: string, code: string): Promise<SessionUser> {
    const client = requireSupabaseClient();

    const { data, error } = await client.auth.verifyOtp({
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
    const client = requireSupabaseClient();

    const [{ data: profile }, { data: templates }, { data: flags }, { data: messages }, { data: hiddenWords }, { data: blocks }, { data: linkEvents }] =
      await Promise.all([
        client.from("profiles").select("*").eq("id", session.id).single(),
        client.from("prompt_templates").select("*").eq("is_active", true).order("base_rank", { ascending: false }),
        client.from("app_flags").select("*").limit(1).single(),
        client.from("messages").select("*").eq("recipient_id", session.id).order("created_at", { ascending: false }),
        client.from("hidden_words").select("word").eq("user_id", session.id),
        client.from("blocked_senders").select("sender_identity_id, reason, created_at").eq("user_id", session.id),
        client.from("link_events").select("*").eq("user_id", session.id).order("created_at", { ascending: false }),
      ]);

    if (!profile) {
      throw new Error("The live profile row is missing for this account.");
    }

    return {
      profile: mapRemoteProfile(profile),
      prompts: (templates ?? []).map(mapPromptTemplate),
      messages: sortInbox((messages ?? []).map(mapRemoteMessage)),
      hiddenWords: (hiddenWords ?? []).map((row) => row.word),
      blockedSenders: (blocks ?? []).map(mapRemoteBlockedSender),
      linkEvents: (linkEvents ?? []).map(mapRemoteLinkEvent),
      flags: mapRemoteFlags(flags),
    };
  },

  async saveAgeGate(session: SessionUser, dob: string) {
    const client = requireSupabaseClient();
    const birthDate = new Date(dob);
    const age = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(birthDate.getTime()) || age < 18) {
      throw new Error("You need to be 18 or older to use UKM.");
    }

    const { error: invokeError } = await client.functions.invoke("complete-onboarding", {
      body: { dob },
    });

    if (invokeError) {
      throw invokeError;
    }

    const { data, error } = await client.from("profiles").select("*").eq("id", session.id).single();

    if (error || !data) {
      throw error ?? new Error("Could not save your birthday.");
    }

    return mapRemoteProfile(data);
  },

  async saveProfile(session: SessionUser, values: { displayName: string; avatarUrl: string; dob?: string | null }) {
    const client = requireSupabaseClient();

    if (values.dob) {
      const { error: invokeError } = await client.functions.invoke("complete-onboarding", {
        body: {
          dob: values.dob,
          displayName: values.displayName || null,
          avatarUrl: values.avatarUrl || null,
        },
      });

      if (invokeError) {
        throw invokeError;
      }
    } else {
      const { data, error } = await client
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
    }

    const { data, error } = await client.from("profiles").select("*").eq("id", session.id).single();

    if (error || !data) {
      throw error ?? new Error("Could not save your profile.");
    }

    return mapRemoteProfile(data);
  },

  async claimUsername(session: SessionUser, desiredUsername: string) {
    const client = requireSupabaseClient();
    const username = normalizeUsername(desiredUsername);

    if (!username || username.length < 3) {
      throw new Error("Usernames need at least 3 characters.");
    }

    const { data, error } = await client.functions.invoke("claim-username", {
      body: { desiredUsername: username },
    });

    if (error) {
      throw error;
    }

    const next = await this.getDashboard(session);

    return next.profile;
  },

  async setThemePreference(session: SessionUser, themePreference: ThemePreference) {
    const client = requireSupabaseClient();

    const { data, error } = await client
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
    const client = requireSupabaseClient();

    const { data, error } = await client
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
    const client = requireSupabaseClient();
    const normalized = normalizeWord(word);

    if (!normalized) {
      return;
    }

    await client.from("hidden_words").insert({ user_id: session.id, word: normalized });
  },

  async removeHiddenWord(session: SessionUser, word: string) {
    const client = requireSupabaseClient();
    const normalized = normalizeWord(word);

    await client.from("hidden_words").delete().eq("user_id", session.id).eq("word", normalized);
  },

  async markRead(session: SessionUser, messageId: string) {
    const client = requireSupabaseClient();
    await client.from("messages").update({ read_at: nowIso() }).eq("id", messageId).eq("recipient_id", session.id);
  },

  async archiveMessage(session: SessionUser, messageId: string) {
    const client = requireSupabaseClient();
    await client.from("messages").update({ status: "archived", read_at: nowIso() }).eq("id", messageId).eq("recipient_id", session.id);
  },

  async deleteMessage(session: SessionUser, messageId: string) {
    const client = requireSupabaseClient();
    await client.from("messages").delete().eq("id", messageId).eq("recipient_id", session.id);
  },

  async reportMessage(session: SessionUser, messageId: string, reason: string) {
    const client = requireSupabaseClient();
    await client.functions.invoke("report-message", { body: { messageId, reason } });
  },

  async blockSender(session: SessionUser, messageId: string) {
    const client = requireSupabaseClient();
    await client.functions.invoke("block-sender", { body: { messageId } });
  },

  async unblockSender(session: SessionUser, senderIdentityId: string) {
    const client = requireSupabaseClient();
    await client.functions.invoke("unblock-sender", { body: { senderIdentityId } });
  },

  async getPublicProfile(username: string) {
    const client = requireSupabaseClient();

    const { data, error } = await client.rpc("get_public_profile", { target_username: username });

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
    const client = requireSupabaseClient();

    const { data, error } = await client.functions.invoke("submit-anonymous-message", {
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

    const client = requireSupabaseClient();

    await client.functions.invoke("register-push-token", {
      body: { token, platform: "expo" },
    });
  },

  async trackOwnerLinkEvent(
    email: string,
    eventType: LinkEvent["eventType"],
    channel: LinkChannel,
    copyVariantKey: CopyVariantKey | null,
    metadata: LinkEvent["metadata"] = {},
  ) {
    const client = requireSupabaseClient();
    const { data: session } = await client.auth.getSession();

    if (!session.session?.user) {
      return;
    }

    await client.functions.invoke("track-link-event", {
      body: { eventType, channel, copyVariantKey, metadata },
    });
  },

  async trackShare(email: string, channel: LinkChannel, copyVariantKey: CopyVariantKey) {
    return this.trackOwnerLinkEvent(email, "share", channel, copyVariantKey);
  },

  async recordInboxOpened(session: SessionUser) {
    const client = requireSupabaseClient();
    await client.from("profiles").update({ last_inbox_opened_at: nowIso(), updated_at: nowIso() }).eq("id", session.id);
    await client.functions.invoke("track-link-event", {
      body: {
        eventType: "inbox_open",
        channel: "app",
        copyVariantKey: null,
        metadata: {},
      },
    });
  },

  async trackPublicEvent(
    username: string,
    eventType: "view" | "open_app",
    copyVariantKey: CopyVariantKey | null = null,
    channel: LinkChannel = "unknown",
  ) {
    const client = requireSupabaseClient();
    await client.functions.invoke("track-public-event", {
      body: { username, eventType, copyVariantKey, channel },
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

function mapRemoteBlockedSender(row: Record<string, unknown>): BlockedSenderRecord {
  return {
    senderIdentityId: String(row.sender_identity_id),
    reason: String(row.reason ?? "manual_block"),
    createdAt: String(row.created_at ?? nowIso()),
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
