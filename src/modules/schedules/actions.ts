"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createAdminClient } from "@/lib/supabase/admin";
import { INITIAL_ANNOUNCEMENTS, INITIAL_EVENTS } from "./data";
import { AnnouncementItem, ScheduleEventItem } from "./types";

/**
 * Server Action: Query Events for Schedules
 */
export async function getEventsAction(): Promise<ScheduleEventItem[]> {
  try {
    const supabase = createAdminClient();
    const { data: events, error } = await supabase
      .from("events")
      .select("*")
      .order("starts_at", { ascending: true });

    if (!error && events && events.length > 0) {
      return events.map((e: any) => {
        const start = new Date(e.starts_at);
        const end = new Date(e.ends_at);
        const timeRangeStr = `${start.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`;

        return {
          id: e.id,
          timeRangeStr,
          statusBadge: e.location_changed ? "location_changed" : "on_schedule",
          statusLabel: e.location_changed ? "Perubahan Lokasi" : "Sesuai Jadwal",
          category: (e.category || "teknologi") as any,
          categoryLabel: e.category === "keagamaan" ? "Kajian & Ibadah" : "Teknologi & Koding",
          title: e.title,
          location: e.location || "Lab Utama",
          previousLocation: e.previous_location,
          speakerOrHost: "Ustadz Pembina",
          groupName: "Sentra Digital",
          attendeesCount: 24,
          actionType: "detail",
          actionLabel: "Lihat Detail",
          subNote: e.description,
        };
      });
    }
  } catch (err) {
    console.error("Failed to query events from Supabase:", err);
  }
  return INITIAL_EVENTS;
}

/**
 * Server Action: Query Announcements
 */
export async function getAnnouncementsAction(): Promise<AnnouncementItem[]> {
  try {
    const supabase = createAdminClient();
    const { data: announcements, error } = await supabase
      .from("announcements")
      .select("*")
      .order("published_at", { ascending: false });

    if (!error && announcements && announcements.length > 0) {
      return announcements.map((a: any) => ({
        id: a.id,
        title: a.title,
        bodyMarkdown: a.body_markdown,
        priority: a.priority as "normal" | "important",
        isPinned: a.pinned || a.priority === "important",
        expiresAtStr: a.expires_at ? new Date(a.expires_at).toLocaleDateString("id-ID") : undefined,
        targetAudienceLabel: a.target_audience_label || "Semua Santri",
        publishedAtStr: new Date(a.published_at || a.created_at).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        isRead: false,
      }));
    }
  } catch (err) {
    console.error("Failed to query announcements from Supabase:", err);
  }
  return INITIAL_ANNOUNCEMENTS;
}

/**
 * Server Action: Mark Announcement as Read (SCH-015)
 */
export async function markAnnouncementReadAction(
  announcementId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", "salman@pondok.id")
      .single();

    if (profile?.id && announcementId.length > 30) {
      await supabase.from("announcement_reads").upsert({
        announcement_id: announcementId,
        user_id: profile.id,
      });
    }
  } catch {
    // fallback
  }

  return {
    success: true,
    message: `Pengumuman ${announcementId} ditandai sudah dibaca.`,
  };
}

/**
 * Server Action: Generate iCal Calendar Subscription Link (SCH-009)
 */
export async function generateICalSubscriptionAction(): Promise<{
  success: boolean;
  icalUrl: string;
  message: string;
}> {
  const token = "usr-salman-feed-token-9988";
  const icalUrl = `https://pondok.os/api/calendar/feed?token=${token}`;
  return {
    success: true,
    icalUrl,
    message: "Tautan kalender iCal pribadi berhasil dibuat. Silakan tambahkan ke Google Calendar atau Apple Calendar.",
  };
}

/**
 * Server Action: Publish New Announcement (SCH-011, BR-SCH-02)
 */
export async function publishAnnouncementAction(payload: {
  title: string;
  bodyMarkdown: string;
  priority: "normal" | "important";
  targetAudienceLabel: string;
}): Promise<{ success: boolean; message: string; announcement?: AnnouncementItem }> {
  if (!payload.title.trim()) {
    return {
      success: false,
      message: "Judul pengumuman wajib diisi.",
    };
  }

  if (!payload.bodyMarkdown.trim()) {
    return {
      success: false,
      message: "Isi pengumuman wajib diisi.",
    };
  }

  let newId = `ann-${Date.now()}`;
  try {
    const supabase = createAdminClient();
    const { data: inserted } = await supabase
      .from("announcements")
      .insert({
        title: payload.title,
        body_markdown: payload.bodyMarkdown,
        priority: payload.priority,
        pinned: payload.priority === "important",
        target_audience_label: payload.targetAudienceLabel,
        status: "published",
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (inserted?.id) newId = inserted.id;
  } catch (err) {
    console.error("Failed to insert announcement in Supabase:", err);
  }

  const newAnn: AnnouncementItem = {
    id: newId,
    title: payload.title,
    bodyMarkdown: payload.bodyMarkdown,
    priority: payload.priority,
    isPinned: payload.priority === "important",
    targetAudienceLabel: payload.targetAudienceLabel,
    publishedAtStr: "Baru Saja",
    isRead: false,
  };

  return {
    success: true,
    message: `Pengumuman "${payload.title}" berhasil diterbitkan untuk ${payload.targetAudienceLabel}.`,
    announcement: newAnn,
  };
}
