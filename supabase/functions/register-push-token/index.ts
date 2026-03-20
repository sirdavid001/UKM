import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient, createAuthedClient } from "../_shared/client.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authed = createAuthedClient(req);
    const admin = createAdminClient();
    const { data: authData } = await authed.auth.getUser();
    if (!authData.user) throw new Error("Unauthorized");

    const { token, platform } = await req.json();
    if (!token) throw new Error("Missing token");

    const { error } = await admin.from("push_tokens").upsert(
      {
        user_id: authData.user.id,
        token,
        platform: platform ?? "expo",
        disabled_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );
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
