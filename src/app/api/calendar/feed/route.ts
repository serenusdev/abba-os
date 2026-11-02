import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashCalendarToken } from "@/lib/fcm";

export const dynamic = "force-dynamic";

/**
 * Format Date to RFC 5545 iCalendar UTC string: YYYYMMDDTHHMMSSZ
 */
function formatIcalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/**
 * Escape special characters per RFC 5545
 */
function escapeIcalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * GET /api/calendar/feed
 * Generates dynamic RFC 5545 iCalendar (.ics) subscription feed from Supabase events
 */
export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token");
    if (!token || token.length < 32) {
      return NextResponse.json({ error: "Calendar token wajib diisi." }, { status: 401 });
    }
    const supabase = createAdminClient();
    const { data: subscription, error: subscriptionError } = await supabase
      .from("calendar_subscriptions")
      .select("id, user_id, expires_at, revoked_at")
      .eq("token_hash", hashCalendarToken(token))
      .maybeSingle();
    if (subscriptionError) throw subscriptionError;
    if (
      !subscription ||
      subscription.revoked_at ||
      new Date(subscription.expires_at).getTime() <= Date.now()
    ) {
      return NextResponse.json({ error: "Calendar token tidak valid atau sudah kedaluwarsa." }, { status: 401 });
    }

    const { data: owner, error: ownerError } = await supabase
      .from("profiles")
      .select("id, team_name, member_type, status")
      .eq("id", subscription.user_id)
      .maybeSingle();
    if (ownerError) throw ownerError;
    if (!owner || owner.status !== "active") {
      return NextResponse.json({ error: "Akun pemilik kalender tidak aktif." }, { status: 403 });
    }

    const { data: memberships, error: membershipError } = await supabase
      .from("team_members")
      .select("team_id, teams(id, name, slug)")
      .eq("user_id", owner.id)
      .is("valid_to", null);
    if (membershipError) throw membershipError;
    const ownerTeamKeys = new Set(
      (memberships || []).flatMap((item: { team_id: string; teams?: { id?: string; name?: string; slug?: string } | null }) => [
        item.team_id,
        item.teams?.id,
        item.teams?.name,
        item.teams?.slug,
      ]).filter(Boolean)
    );

    const { data: events, error } = await supabase
      .from("events")
      .select("*")
      .neq("status", "cancelled")
      .is("deleted_at", null)
      .order("starts_at", { ascending: true });

    if (error) {
      console.error("Gagal mengambil events untuk iCal:", error);
    }

    const now = new Date();
    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Pondok Quran Abdurrahman bin Auf//Pondok OS//ID",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Agenda & Kajian Pondok OS",
      "X-WR-TIMEZONE:Asia/Jakarta",
      "X-WR-CALDESC:Jadwal kegiatan santri, kajian kitab, dan operasional Pondok Quran Abdurrahman bin Auf",
    ];

    const visibleEvents = (events || []).filter((event: { audience_config?: Record<string, unknown>; team_id?: string | null }) => {
      const config = event.audience_config || { scope: "all" };
      if (config.scope === "users") return Array.isArray(config.userIds) && config.userIds.includes(owner.id);
      if (config.scope === "member_type") return Array.isArray(config.memberTypes) && config.memberTypes.includes(owner.member_type || "santri");
      if (config.scope === "team") return Array.isArray(config.teamIds) && config.teamIds.some((id) => ownerTeamKeys.has(id));
      return !event.team_id || event.team_id === owner.team_name || ownerTeamKeys.has(event.team_id);
    });

    if (visibleEvents.length > 0) {
      for (const event of visibleEvents) {
        const start = new Date(event.starts_at);
        const end = new Date(event.ends_at);

        lines.push("BEGIN:VEVENT");
        lines.push(`UID:${event.id}@pondok.os`);
        lines.push(`DTSTAMP:${formatIcalDate(now)}`);
        lines.push(`DTSTART:${formatIcalDate(start)}`);
        lines.push(`DTEND:${formatIcalDate(end)}`);
        lines.push(`SUMMARY:${escapeIcalText(event.title)}`);

        if (event.description) {
          lines.push(`DESCRIPTION:${escapeIcalText(event.description)}`);
        }
        if (event.location) {
          lines.push(`LOCATION:${escapeIcalText(event.location)}`);
        }

        lines.push("STATUS:CONFIRMED");
        lines.push("END:VEVENT");
      }
    }

    lines.push("END:VCALENDAR");

    const icalContent = lines.join("\r\n");

    return new Response(icalContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="agenda-pondok.ics"',
        "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
        Pragma: "no-cache",
      },
    });
  } catch (err) {
    console.error("iCal feed error:", err);
    return NextResponse.json(
      { error: "Gagal memproses feed kalender" },
      { status: 500 }
    );
  }
}

