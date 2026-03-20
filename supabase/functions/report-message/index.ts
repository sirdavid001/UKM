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

    const { messageId, reason } = await req.json();
    const { data: message } = await admin
      .from("messages")
      .select("recipient_id")
      .eq("id", messageId)
      .maybeSingle();
    if (!message || message.recipient_id !== authData.user.id) throw new Error("Message not found");

    await admin.from("reports").insert({
      message_id: messageId,
      reporter_id: authData.user.id,
      reason: reason ?? "launch_review",
    });

    return new Response(JSON.stringify({ reported: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
