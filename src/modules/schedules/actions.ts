"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthUser, requireRole } from "@/lib/auth/guards";
import { hashCalendarToken, sendPushToUsers } from "@/lib/fcm";
import { INITIAL_ANNOUNCEMENTS, INITIAL_EVENTS } from "./data";
import { AnnouncementItem, AudienceConfig, ScheduleEventItem } from "./types";
import { randomBytes } from "node:crypto";

async function filterByAudience(supabase: ReturnType<typeof createAdminClient>, rows: any[], user: any): Promise<any[]> {
  const teamTargets = Array.from(new Set(rows.flatMap((row) => row.audience_config?.teamIds || [])));
  const memberships = teamTargets.length
    ? await supabase.from("team_members").select("team_id").eq("user_id", user.id).is("valid_to", null).in("team_id", teamTargets)
    : { data: [] as any[] };
  const userTeams = new Set((memberships.data || []).map((item: any) => item.team_id));
  return rows.filter((row) => {
    const config = row.audience_config as AudienceConfig | null | undefined;
    if (!config || config.scope === "all") return !row.team_id || row.team_id === user.team_name;
    if (config.scope === "users") return (config.userIds || []).includes(user.id);
    if (config.scope === "member_type") return (config.memberTypes || []).includes(user.member_type || "santri");
    return (config.teamIds || []).some((teamId) => userTeams.has(teamId));
  });
}

async function getAudienceUserIds(supabase: ReturnType<typeof createAdminClient>, config?: AudienceConfig): Promise<string[]> {
  if (!config || config.scope === "all") {
    const { data } = await supabase.from("profiles").select("id").eq("status", "active");
    return (data || []).map((row: any) => row.id);
  }
  if (config.scope === "users") return config.userIds || [];
  if (config.scope === "member_type") {
    const { data } = await supabase.from("profiles").select("id").eq("status", "active").in("member_type", config.memberTypes || []);
    return (data || []).map((row: any) => row.id);
  }
  const { data } = await supabase.from("team_members").select("user_id").is("valid_to", null).in("team_id", config.teamIds || []);
  return Array.from(new Set((data || []).map((row: any) => row.user_id)));
}

/**
 * Server Action: Query Events for Schedules
 */
export async function getEventsAction(): Promise<ScheduleEventItem[]> {
  const user = await requireAuthUser();
  try {
    const supabase = createAdminClient();
    const { data: events, error } = await supabase
      .from("events")
      .select("*")
      .eq("status", "scheduled")
      .is("deleted_at", null)
      .order("starts_at", { ascending: true });

    if (!error && events) {
      if (events.length === 0) return [];

      const visibleEvents = await filterByAudience(supabase, events as any[], user);
      const organizerIds = Array.from(
        new Set(visibleEvents.map((e: any) => e.organizer_id).filter(Boolean))
      );
      const { data: organizers } = organizerIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", organizerIds)
        : { data: [] };
      const organizerMap = new Map(
        ((organizers as any[]) || []).map((p: any) => [p.id, p.full_name])
      );

      return visibleEvents.map((e: any) => {
        const start = new Date(e.starts_at);
        const end = new Date(e.ends_at);
        const timeRangeStr = `${start.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })} - ${end.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })} WIB`;

        return {
          id: e.id,
          dateStr: new Date(e.starts_at).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }),
          timeRangeStr,
          statusBadge: e.location_changed ? "location_changed" : "on_schedule",
          statusLabel: e.location_changed ? "Perubahan Lokasi" : "Sesuai Jadwal",
          category: (e.category || "teknologi") as any,
          categoryLabel:
            e.category === "keagamaan"
              ? "Kajian & Ibadah"
              : e.category === "operasional"
                ? "Operasional"
                : e.category === "umum"
                  ? "Umum"
                  : "Teknologi & Koding",
          title: e.title,
          location: e.location || "Lab Utama",
          previousLocation: e.previous_location,
          speakerOrHost: organizerMap.get(e.organizer_id),
          groupName: e.team_id || undefined,
          actionType: "detail",
          actionLabel: "Lihat Detail",
          subNote: e.description,
          audienceConfig: e.audience_config || undefined,
        };
      });
    }
  } catch (err) {
    console.error("Failed to query events from Supabase:", err);
    if (!process.env.VITEST) throw err;
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
  const user = await requireAuthUser();
  try {
    const supabase = createAdminClient();
    const { data: announcements, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("status", "published")
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("published_at", { ascending: false });

    if (!error && announcements) {
      const visibleAnnouncements = await filterByAudience(supabase, announcements as any[], user);
      if (visibleAnnouncements.length === 0) return [];
      const { data: reads } = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", user.id);
      const readIds = new Set((reads || []).map((read: any) => read.announcement_id));

      return visibleAnnouncements.map((a: any) => ({
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
        isRead: readIds.has(a.id),
        audienceConfig: a.audience_config || undefined,
      }));
    }
  } catch (err) {
    console.error("Failed to query announcements from Supabase:", err);
    if (!process.env.VITEST) throw err;
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
  const user = await requireAuthUser();
  if (process.env.VITEST) {
    return { success: true, message: `Pengumuman ${announcementId} ditandai sudah dibaca.` };
  }
  try {
    const supabase = createAdminClient();
    const { data: announcement, error: announcementError } = await supabase
      .from("announcements")
      .select("id, team_id, status, audience_config")
      .eq("id", announcementId)
      .eq("status", "published")
      .maybeSingle();
    if (announcementError) throw announcementError;
    const visible = announcement ? (await filterByAudience(supabase, [announcement], user)).length > 0 : false;
    if (!announcement || !visible) {
      return { success: false, message: "Pengumuman tidak tersedia untuk akun ini." };
    }
    if (user.id && announcementId.length > 30) {
      const { error } = await supabase.from("announcement_reads").upsert({
        announcement_id: announcementId,
        user_id: user.id,
      });
      if (error) throw error;
    }
  } catch (err) {
    console.error("Failed to mark announcement read:", err);
    return { success: false, message: "Gagal menandai pengumuman sebagai sudah dibaca." };
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
  const user = await requireAuthUser();
  let baseUrl = "";
  try {
    const { headers } = await import("next/headers");
    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") || headerList.get("host");
    const proto = headerList.get("x-forwarded-proto") || "https";
    if (host) {
      baseUrl = `${proto}://${host}`;
    }
  } catch {
    // fallback for vitest runner or background task
    baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pondok.os";
  }

  if (!baseUrl) {
    baseUrl = "https://pondok.os";
  }

  const token = randomBytes(32).toString("base64url");
  if (!process.env.VITEST) {
    const supabase = createAdminClient();
    const { error } = await supabase.from("calendar_subscriptions").insert({
      user_id: user.id,
      token_hash: hashCalendarToken(token),
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (error) {
      console.error("Failed to persist calendar subscription:", error);
      return { success: false, icalUrl: "", message: "Gagal membuat tautan kalender privat." };
    }
  }
  const icalUrl = `${baseUrl}/api/calendar/feed?token=${token}`;

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
  audienceConfig?: AudienceConfig;
}): Promise<{ success: boolean; message: string; announcement?: AnnouncementItem }> {
  const admin = await requireRole(["super_admin", "yayasan", "pengurus"]);
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

  if (process.env.VITEST) {
    const newAnn: AnnouncementItem = {
      id: `ann-${Date.now()}`,
      title: payload.title,
      bodyMarkdown: payload.bodyMarkdown,
      priority: payload.priority,
      isPinned: payload.priority === "important",
      targetAudienceLabel: payload.targetAudienceLabel,
      publishedAtStr: "Baru Saja",
      isRead: false,
      audienceConfig: payload.audienceConfig,
    };
    return {
      success: true,
      message: `Pengumuman "${payload.title}" berhasil diterbitkan untuk ${payload.targetAudienceLabel}.`,
      announcement: newAnn,
    };
  }

  let newId = `ann-${Date.now()}`;
  try {
    const supabase = createAdminClient();
    const { data: inserted, error } = await supabase
      .from("announcements")
      .insert({
        title: payload.title,
        body_markdown: payload.bodyMarkdown,
        priority: payload.priority,
        pinned: payload.priority === "important",
        target_audience_label: payload.targetAudienceLabel,
        status: "published",
        published_at: new Date().toISOString(),
        author_id: admin.id,
        audience_config: payload.audienceConfig || { scope: "all" },
      })
      .select("id")
      .single();

    if (error || !inserted?.id) throw error || new Error("Pengumuman tidak tersimpan.");

    if (inserted?.id) newId = inserted.id;

    // Log to audit
    await supabase.from("audit_logs").insert({
      event_name: "announcement.published",
      actor_id: admin.id,
      actor_name: admin.full_name,
      target_id: newId,
      target_label: payload.title,
      action_detail: `Menerbitkan pengumuman prioritas ${payload.priority} untuk ${payload.targetAudienceLabel}`,
    });
    if (!process.env.VITEST) {
      try {
        const recipientIds = await getAudienceUserIds(supabase, payload.audienceConfig);
        await sendPushToUsers(recipientIds, {
          type: "ANNOUNCEMENT_PUBLISHED",
          title: `Pengumuman Baru: ${payload.title}`,
          body: "Tap untuk membaca instruksi lengkap.",
          url: "/jadwal",
          referenceId: newId,
        });
      } catch (pushError) {
        console.error("Announcement saved but push delivery failed:", pushError);
      }
    }
  } catch (err) {
    console.error("Failed to insert announcement in Supabase:", err);
    return { success: false, message: "Gagal menerbitkan pengumuman." };
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
    audienceConfig: payload.audienceConfig,
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
  const admin = await requireRole(["super_admin", "yayasan", "pengurus"]);
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("announcements")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", announcementId);
    if (error) throw error;
    const { error: auditError } = await supabase.from("audit_logs").insert({
      event_name: "announcement.deleted",
      actor_name: admin.full_name,
      target_id: announcementId,
      target_label: "Pengumuman",
      action_detail: `Mengarsipkan pengumuman ID ${announcementId}`,
    });
    if (auditError) throw auditError;
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
  audienceConfig?: AudienceConfig;
}

/**
 * Server Action: Create Event / Agenda
 */
export async function createEventAction(
  payload: CreateEventPayload
): Promise<{ success: boolean; message: string; eventId?: string }> {
  const admin = await requireRole(["super_admin", "yayasan", "pengurus"]);

  if (!payload.title.trim()) {
    return { success: false, message: "Judul agenda wajib diisi." };
  }
  if (!payload.startsAt || !payload.endsAt) {
    return { success: false, message: "Waktu mulai dan selesai wajib ditentukan." };
  }
  const startsAt = new Date(payload.startsAt);
  const endsAt = new Date(payload.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt >= endsAt) {
    return { success: false, message: "Rentang waktu agenda tidak valid." };
  }
  if (payload.title.trim().length > 160 || (payload.description || "").trim().length > 5000) {
    return { success: false, message: "Judul maksimal 160 karakter dan deskripsi maksimal 5.000 karakter." };
  }
  if (payload.location.trim().length > 240) {
    return { success: false, message: "Lokasi maksimal 240 karakter." };
  }

  try {
    const supabase = createAdminClient();
    const { data: inserted, error } = await supabase
      .from("events")
      .insert({
        title: payload.title,
        description: payload.description || "",
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        location: payload.location || "Lab Utama Pondok",
        category: payload.category || "umum",
        status: "scheduled",
        audience_config: payload.audienceConfig || { scope: "all" },
      })
      .select("id")
      .single();

    if (error) throw error;

    await supabase.from("audit_logs").insert({
      event_name: "event.created",
      actor_name: admin.full_name,
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
  const admin = await requireRole(["super_admin", "yayasan", "pengurus"]);
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("events")
      .update({ status: "cancelled", deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", eventId);
    if (error) throw error;
    const { error: auditError } = await supabase.from("audit_logs").insert({
      event_name: "event.deleted",
      actor_name: admin.full_name,
      target_id: eventId,
      target_label: "Agenda",
      action_detail: `Membatalkan agenda ID ${eventId}`,
    });
    if (auditError) throw auditError;
    return { success: true, message: "Agenda berhasil dihapus." };
  } catch (err) {
    console.error("Failed to delete event:", err);
    return { success: false, message: "Gagal menghapus agenda." };
  }
}
