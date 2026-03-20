import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient, createAuthedClient } from "../_shared/client.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authed = createAuthedClient(req);
    const admin = createAdminClient();
    const { data: authData } = await authed.auth.getUser();
    if (!authData.user) throw new Error("Unauthorized");

    const { dob, displayName, avatarUrl } = await req.json();
    const birthDate = new Date(dob);
    const age = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(birthDate.getTime()) || age < 18) throw new Error("User must be 18+");

    const { error } = await admin
      .from("profiles")
      .update({
        dob,
        display_name: displayName ?? null,
        avatar_url: avatarUrl ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", authData.user.id);
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
