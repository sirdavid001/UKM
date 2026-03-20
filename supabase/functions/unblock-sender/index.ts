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

    const { senderIdentityId } = await req.json();
    if (!senderIdentityId) throw new Error("Missing sender identity");

    const { error } = await admin
      .from("blocked_senders")
      .delete()
      .eq("user_id", authData.user.id)
      .eq("sender_identity_id", senderIdentityId);
    if (error) throw error;

    return new Response(JSON.stringify({ unblocked: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
