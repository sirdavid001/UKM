import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/client.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = createAdminClient();
    const { username, eventType, copyVariantKey } = await req.json();
    const normalized = String(username ?? "").trim().toLowerCase();
    const allowed = new Set(["view", "open_app"]);
    if (!allowed.has(String(eventType))) throw new Error("Unsupported event");

    const { data: publicProfile } = await admin.rpc("get_public_profile", { target_username: normalized });
    const profile = publicProfile?.[0];
    if (!profile) throw new Error("Profile not found");

    const { error } = await admin.from("link_events").insert({
      user_id: profile.id,
      event_type: eventType,
      channel: eventType === "open_app" ? "app" : "unknown",
      copy_variant_key: copyVariantKey ?? null,
      metadata: {},
    });
    if (error) throw error;

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
