import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: events, error } = await supabase
      .from("events")
      .select("*")
      .neq("status", "cancelled")
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

    if (events && events.length > 0) {
      for (const event of events) {
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
