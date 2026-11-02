import { createHash, createSign } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PushMessage {
  type: string;
  title: string;
  body: string;
  url: string;
  referenceId?: string;
}

interface FirebaseCredentials {
  project_id: string;
  client_email: string;
  private_key: string;
}

function readCredentials(): FirebaseCredentials | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;
  try {
    const json = raw.trim().startsWith("{")
      ? raw
      : Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as FirebaseCredentials;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) return null;
    return { ...parsed, private_key: parsed.private_key.replace(/\\n/g, "\n") };
  } catch {
    return null;
  }
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

async function getAccessToken(credentials: FirebaseCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = encodeBase64Url(
    JSON.stringify({
      iss: credentials.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const unsigned = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const assertion = `${unsigned}.${signer.sign(credentials.private_key, "base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error(`FCM OAuth token request failed (${response.status})`);
  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("FCM OAuth response did not contain an access token");
  return data.access_token;
}

function isInvalidTokenError(body: string): boolean {
  return /UNREGISTERED|registration-token-not-registered|INVALID_ARGUMENT/i.test(body);
}

/** Server-only FCM dispatcher. Missing Firebase configuration is non-fatal to
 * the originating business transaction, but is visible in server logs. */
export async function sendPushToUsers(
  userIds: string[],
  message: PushMessage
): Promise<{ sent: number; removed: number; skipped: boolean }> {
  const credentials = readCredentials();
  if (!credentials) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("[FCM] FIREBASE_SERVICE_ACCOUNT_KEY is not configured; push skipped.");
    }
    return { sent: 0, removed: 0, skipped: true };
  }
  if (userIds.length === 0) return { sent: 0, removed: 0, skipped: false };

  const admin = createAdminClient();
  const { data: devices, error: deviceError } = await admin
    .from("device_tokens")
    .select("user_id, token")
    .in("user_id", userIds);
  if (deviceError) throw deviceError;
  if (!devices?.length) return { sent: 0, removed: 0, skipped: false };

  const accessToken = await getAccessToken(credentials);
  let sent = 0;
  let removed = 0;
  for (const device of devices as Array<{ user_id: string; token: string }>) {
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(credentials.project_id)}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: device.token,
            notification: { title: message.title, body: message.body },
            data: {
              type: message.type,
              url: message.url,
              route: message.url,
              referenceId: message.referenceId || "",
            },
          },
        }),
      }
    );
    if (response.ok) {
      sent += 1;
      continue;
    }
    const errorBody = await response.text();
    if (isInvalidTokenError(errorBody)) {
      const { error } = await admin
        .from("device_tokens")
        .delete()
        .eq("user_id", device.user_id)
        .eq("token", device.token);
      if (!error) removed += 1;
    } else {
      console.error("[FCM] Delivery failed", response.status, errorBody.slice(0, 500));
    }
  }
  return { sent, removed, skipped: false };
}

export async function sendBroadcastPush(message: PushMessage) {
  const admin = createAdminClient();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id")
    .eq("status", "active");
  if (error) throw error;
  return sendPushToUsers((profiles || []).map((profile: { id: string }) => profile.id), message);
}

export function hashCalendarToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
