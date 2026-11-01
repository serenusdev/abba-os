"use server";

import { AnnouncementItem } from "./types";

/**
 * Server Action: Mark Announcement as Read (SCH-015)
 */
export async function markAnnouncementReadAction(
  announcementId: string
): Promise<{ success: boolean; message: string }> {
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

  const newAnn: AnnouncementItem = {
    id: `ann-${Date.now()}`,
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
