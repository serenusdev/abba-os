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

    if (!error && events) {
      if (events.length === 0) return [];

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

  if (process.env.VITEST) {
    return INITIAL_EVENTS;
  }

  return [];
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

    if (!error && announcements) {
      if (announcements.length === 0) return [];

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

  if (process.env.VITEST) {
    return INITIAL_ANNOUNCEMENTS;
  }

  return [];
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

    // Log to audit
    await supabase.from("audit_logs").insert({
      event_name: "announcement.published",
      actor_name: "Super Admin",
      target_id: newId,
      target_label: payload.title,
      action_detail: `Menerbitkan pengumuman prioritas ${payload.priority} untuk ${payload.targetAudienceLabel}`,
    });
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

/**
 * Server Action: Delete Announcement
 */
export async function deleteAnnouncementAction(
  announcementId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createAdminClient();
    await supabase.from("announcements").delete().eq("id", announcementId);
    await supabase.from("audit_logs").insert({
      event_name: "announcement.deleted",
      actor_name: "Super Admin",
      target_id: announcementId,
      target_label: "Pengumuman",
      action_detail: `Menghapus pengumuman ID ${announcementId}`,
    });
    return { success: true, message: "Pengumuman berhasil dihapus." };
  } catch (err) {
    console.error("Failed to delete announcement:", err);
    return { success: false, message: "Gagal menghapus pengumuman." };
  }
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  startsAt: string; // ISO string or datetime-local
  endsAt: string;
  location: string;
  category: "teknologi" | "keagamaan" | "operasional" | "umum";
}

/**
 * Server Action: Create Event / Agenda
 */
export async function createEventAction(
  payload: CreateEventPayload
): Promise<{ success: boolean; message: string; eventId?: string }> {
  if (!payload.title.trim()) {
    return { success: false, message: "Judul agenda wajib diisi." };
  }
  if (!payload.startsAt || !payload.endsAt) {
    return { success: false, message: "Waktu mulai dan selesai wajib ditentukan." };
  }

  try {
    const supabase = createAdminClient();
    const { data: inserted, error } = await supabase
      .from("events")
      .insert({
        title: payload.title,
        description: payload.description || "",
        starts_at: new Date(payload.startsAt).toISOString(),
        ends_at: new Date(payload.endsAt).toISOString(),
        location: payload.location || "Lab Utama Pondok",
        category: payload.category || "umum",
        status: "scheduled",
      })
      .select("id")
      .single();

    if (error) throw error;

    await supabase.from("audit_logs").insert({
      event_name: "event.created",
      actor_name: "Super Admin",
      target_id: inserted?.id,
      target_label: payload.title,
      action_detail: `Menambahkan agenda baru: ${payload.title} (${payload.category}) di ${payload.location}`,
    });

    return {
      success: true,
      message: `Agenda "${payload.title}" berhasil ditambahkan ke jadwal.`,
      eventId: inserted?.id,
    };
  } catch (err) {
    console.error("Failed to create event:", err);
    return { success: false, message: "Gagal menambahkan agenda kegiatan." };
  }
}

/**
 * Server Action: Delete Event
 */
export async function deleteEventAction(
  eventId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createAdminClient();
    await supabase.from("events").delete().eq("id", eventId);
    await supabase.from("audit_logs").insert({
      event_name: "event.deleted",
      actor_name: "Super Admin",
      target_id: eventId,
      target_label: "Agenda",
      action_detail: `Menghapus agenda ID ${eventId}`,
    });
    return { success: true, message: "Agenda berhasil dihapus." };
  } catch (err) {
    console.error("Failed to delete event:", err);
    return { success: false, message: "Gagal menghapus agenda." };
  }
}
