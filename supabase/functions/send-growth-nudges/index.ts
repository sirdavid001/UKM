import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/client.ts";
import { sendOwnerNudgePush } from "../_shared/push.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = createAdminClient();
    const nowIso = new Date().toISOString();
    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, onboarding_boost_expires_at")
      .not("onboarding_boost_expires_at", "is", null)
      .lte("onboarding_boost_expires_at", nowIso);

    if (profilesError) throw profilesError;

    let nudged = 0;

    for (const profile of profiles ?? []) {
      const { data: nudgeState, error: nudgeStateError } = await admin
        .from("growth_nudge_state")
        .select("zero_message_nudged_at")
        .eq("user_id", profile.id)
        .maybeSingle();
      if (nudgeStateError) throw nudgeStateError;
      if (nudgeState?.zero_message_nudged_at) {
        continue;
      }

      const { count: visibleOrganicCount, error: messagesError } = await admin
        .from("messages")
        .select("*", { head: true, count: "exact" })
        .eq("recipient_id", profile.id)
        .eq("status", "visible")
        .eq("is_seeded", false);
      if (messagesError) throw messagesError;
      if ((visibleOrganicCount ?? 0) > 0) {
        continue;
      }

      const pushResult = await sendOwnerNudgePush(admin, profile.id, "Try a new prompt today", "/(tabs)/share");
      if (!pushResult.sent) {
        continue;
      }

      await admin.from("growth_nudge_state").upsert({
        user_id: profile.id,
        zero_message_nudged_at: nowIso,
        updated_at: nowIso,
      });

      await admin.from("link_events").insert({
        user_id: profile.id,
        event_type: "growth_nudge",
        channel: "app",
        copy_variant_key: null,
        metadata: {
          kind: "zero_message_24h",
          destination: "share_tab",
        },
      });

      nudged += 1;
    }

    return new Response(JSON.stringify({ ok: true, nudged }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
