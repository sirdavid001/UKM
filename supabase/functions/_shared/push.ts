const PUSH_CHANNEL_ID = "messages";

async function sendPushPayloads(tokens: { token: string }[], payload: { title: string; body: string; route: string }) {
  const accessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(
      tokens.map((tokenRow) => ({
        to: tokenRow.token,
        sound: "default",
        priority: "high",
        title: payload.title,
        body: payload.body,
        channelId: PUSH_CHANNEL_ID,
        data: { route: payload.route },
      })),
    ),
  });

  if (!response.ok) {
    throw new Error(`Expo push failed with ${response.status}`);
  }
}

export async function sendOwnerNudgePush(admin: any, recipientId: string, body: string, route = "/(tabs)/share") {
  const { data: tokens } = await admin.from("push_tokens").select("id, token").eq("user_id", recipientId).is("disabled_at", null);

  if (!tokens?.length) {
    return { sent: false, count: 0 };
  }

  await sendPushPayloads(tokens, {
    title: "UKM",
    body,
    route,
  });

  return { sent: true, count: tokens.length };
}

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
  await sendPushPayloads(tokens, {
    title: "UKM",
    body,
    route: "/(tabs)/inbox",
  });

  await admin.from("notification_state").upsert({
    user_id: recipientId,
    last_push_sent_at: new Date().toISOString(),
    last_notified_count: count,
    updated_at: new Date().toISOString(),
  });

  return { sent: true, count };
}
