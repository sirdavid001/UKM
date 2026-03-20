import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient, createAuthedClient } from "../_shared/client.ts";

const STARTERS = ["What should people ask you about?", "What made you join UKM?"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authed = createAuthedClient(req);
    const admin = createAdminClient();
    const { data: authData } = await authed.auth.getUser();
    if (!authData.user) throw new Error("Unauthorized");

    const { data: profile } = await admin.from("profiles").select("active_prompt_id").eq("id", authData.user.id).single();
    const { data: existing } = await admin.from("messages").select("id").eq("recipient_id", authData.user.id).eq("is_seeded", true);

    if (!existing?.length) {
      const rows = STARTERS.map((content) => ({
        recipient_id: authData.user.id,
        prompt_id: profile?.active_prompt_id ?? "prompt-ama",
        content,
        status: "visible",
        moderation_score: 0,
        abuse_score: 0,
        is_seeded: true,
        source: "app",
      }));
      await admin.from("messages").insert(rows);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
