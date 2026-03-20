export async function sendGenericPush(admin: any, recipientId: string) {
  const [{ data: unreadMessages }, { data: tokens }, { data: state }] = await Promise.all([
    admin
      .from("messages")
      .select("id")
      .eq("recipient_id", recipientId)
      .eq("status", "visible")
      .is("read_at", null)
      .eq("is_seeded", false),
    admin.from("push_tokens").select("id, token").eq("user_id", recipientId).is("disabled_at", null),
    admin.from("notification_state").select("*").eq("user_id", recipientId).maybeSingle(),
  ]);

  const count = unreadMessages?.length ?? 0;
  if (!count || !tokens?.length) {
    return { sent: false, count };
  }

  const lastPushAt = state?.last_push_sent_at ? new Date(state.last_push_sent_at).getTime() : 0;
  const withinCooldown = Date.now() - lastPushAt < 60 * 1000;
  if (withinCooldown && count < 3) {
    return { sent: false, count };
  }

  const body = count >= 3 ? `You have ${count} new messages` : "You got a new message";
  const accessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(
      tokens.map((tokenRow: { token: string }) => ({
        to: tokenRow.token,
        sound: "default",
        title: "UKM",
        body,
        data: { route: "/(tabs)/inbox" },
      })),
    ),
  });

  if (!response.ok) {
    throw new Error(`Expo push failed with ${response.status}`);
  }

  await admin.from("notification_state").upsert({
    user_id: recipientId,
    last_push_sent_at: new Date().toISOString(),
    last_notified_count: count,
    updated_at: new Date().toISOString(),
  });

  return { sent: true, count };
}
