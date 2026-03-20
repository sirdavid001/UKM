import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient, createAuthedClient } from "../_shared/client.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authed = createAuthedClient(req);
    const admin = createAdminClient();
    const { data: authData, error: authError } = await authed.auth.getUser();
    if (authError || !authData.user) {
      throw new Error("Unauthorized");
    }

    const { desiredUsername } = await req.json();
    const username = String(desiredUsername ?? "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (username.length < 3) {
      throw new Error("Username too short");
    }

    const { data: existing } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
    if (existing && existing.id !== authData.user.id) {
      throw new Error("Username already taken");
    }

    const { error } = await admin
      .from("profiles")
      .update({
        username,
        onboarding_complete: true,
        onboarding_boost_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", authData.user.id);
    if (error) throw error;

    const { data: seededMessages } = await admin
      .from("messages")
      .select("id")
      .eq("recipient_id", authData.user.id)
      .eq("is_seeded", true);

    if (!seededMessages?.length) {
      await admin.from("messages").insert([
        {
          recipient_id: authData.user.id,
          prompt_id: "prompt-ama",
          content: "What should people ask you about?",
          status: "visible",
          moderation_score: 0,
          abuse_score: 0,
          is_seeded: true,
          source: "app",
        },
        {
          recipient_id: authData.user.id,
          prompt_id: "prompt-ama",
          content: "What made you join UKM?",
          status: "visible",
          moderation_score: 0,
          abuse_score: 0,
          is_seeded: true,
          source: "app",
        },
      ]);
    }

    return new Response(JSON.stringify({ username, isAvailable: true, normalizedUsername: username }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
