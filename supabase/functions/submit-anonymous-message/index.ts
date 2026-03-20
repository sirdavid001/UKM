import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/client.ts";
import { sendGenericPush } from "../_shared/push.ts";
import { containsProfanity } from "../_shared/profanity.ts";

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

async function hash(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function waitForSuspiciousDelay() {
  const jitterMs = 1000 + Math.floor(Math.random() * 2000);
  await new Promise((resolve) => setTimeout(resolve, jitterMs));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = createAdminClient();
    const body = await req.json();
    const username = String(body.username ?? "").trim().toLowerCase();
    const content = String(body.content ?? "").trim();
    const promptId = String(body.promptId ?? "prompt-ama");
    const senderSessionId = String(body.senderSessionId ?? "");
    const senderConfidence = body.senderConfidence === "low" ? 0.55 : 1;

    if (content.length < 3) throw new Error("Message too short");
    if (!senderSessionId) throw new Error("Missing sender session");

    const { data: publicProfile } = await admin.rpc("get_public_profile", { target_username: username });
    const profile = publicProfile?.[0];
    if (!profile) throw new Error("Profile not found");

    const forwardedFor = req.headers.get("x-forwarded-for") ?? "0.0.0.0";
    const ipBucket = forwardedFor.split(".").slice(0, 3).join(".");
    const sessionHash = await hash(`${profile.id}:${senderSessionId}`);
    const networkHash = await hash(`${profile.id}:${ipBucket}`);
    const behaviorHash = await hash(`${profile.id}:${content.length}:${new Date().getUTCHours()}`);

    let { data: identity } = await admin
      .from("sender_identities")
      .select("*")
      .eq("recipient_id", profile.id)
      .eq("session_fingerprint_hash", sessionHash)
      .maybeSingle();

    if (!identity) {
      const { data: inserted } = await admin
        .from("sender_identities")
        .insert({
          recipient_id: profile.id,
          session_fingerprint_hash: sessionHash,
          network_fingerprint_hash: networkHash,
          behavior_signature_hash: behaviorHash,
          fingerprint_confidence_score: senderConfidence,
        })
        .select("*")
        .single();
      identity = inserted;
    } else {
      await admin
        .from("sender_identities")
        .update({
          network_fingerprint_hash: networkHash,
          behavior_signature_hash: behaviorHash,
          fingerprint_confidence_score: senderConfidence,
          abuse_score_last_updated_at: new Date().toISOString(),
        })
        .eq("id", identity.id);
    }

    const boostActive = profile.onboarding_boost_expires_at && new Date(profile.onboarding_boost_expires_at).getTime() > Date.now();
    const sessionCap = boostActive ? 3 : 2;
    const networkCap = boostActive ? 12 : 8;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: blockedSender } = await admin
      .from("blocked_senders")
      .select("id")
      .eq("user_id", profile.id)
      .eq("sender_identity_id", identity.id)
      .maybeSingle();

    if (blockedSender) {
      await waitForSuspiciousDelay();
      await admin.from("submission_events").insert({
        recipient_id: profile.id,
        prompt_id: promptId,
        sender_identity_id: identity.id,
        outcome: "blocked",
        source: "web",
        abuse_score: 0.92,
        captcha_required: false,
        copy_variant_key: body.copyVariantKey ?? null,
      });

      return new Response(JSON.stringify({ accepted: false, canSendAnother: false, message: "Try again in a moment." }), {
        status: 429,
        headers: jsonHeaders,
      });
    }

    const { count: sessionCount } = await admin
      .from("submission_events")
      .select("*", { head: true, count: "exact" })
      .eq("recipient_id", profile.id)
      .eq("sender_identity_id", identity.id)
      .in("outcome", ["visible", "filtered", "flagged"])
      .gte("created_at", oneHourAgo);

    const { data: networkIdentities } = await admin
      .from("sender_identities")
      .select("id")
      .eq("recipient_id", profile.id)
      .eq("network_fingerprint_hash", networkHash);

    const networkIdentityIds = (networkIdentities ?? []).map((item: { id: string }) => item.id);
    let networkCount = 0;

    if (networkIdentityIds.length > 0) {
      const { count } = await admin
        .from("submission_events")
        .select("*", { head: true, count: "exact" })
        .eq("recipient_id", profile.id)
        .in("sender_identity_id", networkIdentityIds)
        .in("outcome", ["visible", "filtered", "flagged"])
        .gte("created_at", oneHourAgo);
      networkCount = count ?? 0;
    }

    if ((sessionCount ?? 0) >= sessionCap || (networkCount ?? 0) >= networkCap) {
      await waitForSuspiciousDelay();
      await admin.from("submission_events").insert({
        recipient_id: profile.id,
        prompt_id: promptId,
        sender_identity_id: identity.id,
        outcome: "retry",
        source: "web",
        abuse_score: 0.65,
        captcha_required: false,
        copy_variant_key: body.copyVariantKey ?? null,
      });

      return new Response(JSON.stringify({ accepted: false, canSendAnother: false, message: "Try again in a moment." }), {
        status: 429,
        headers: jsonHeaders,
      });
    }

    const { data: hiddenWords } = await admin.from("hidden_words").select("word").eq("user_id", profile.id);
    const normalized = content.toLowerCase();
    const hiddenMatch = (hiddenWords ?? []).some((item) => normalized.includes(item.word));
    const profanity = containsProfanity(content);
    const status = hiddenMatch || profanity ? "filtered" : "visible";
    const moderationScore = hiddenMatch || profanity ? 0.82 : 0.12;

    await admin.from("messages").insert({
      recipient_id: profile.id,
      prompt_id: promptId,
      sender_identity_id: identity.id,
      content,
      status,
      moderation_score: moderationScore,
      abuse_score: status === "visible" ? 0.15 : 0.62,
      is_seeded: false,
      source: "web",
    });
    await admin.from("submission_events").insert({
      recipient_id: profile.id,
      prompt_id: promptId,
      sender_identity_id: identity.id,
      outcome: status,
      source: "web",
      abuse_score: status === "visible" ? 0.15 : 0.62,
      captcha_required: false,
      copy_variant_key: body.copyVariantKey ?? null,
    });
    await admin.from("link_events").insert({
      user_id: profile.id,
      event_type: "submit",
      channel: body.channel ?? "unknown",
      copy_variant_key: body.copyVariantKey ?? null,
      metadata: {},
    });

    if (status === "visible") {
      await sendGenericPush(admin, profile.id);
    }

    return new Response(JSON.stringify({ accepted: true, canSendAnother: true }), { headers: jsonHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }
});
