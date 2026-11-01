import { describe, it, expect } from "vitest";
import {
  markAnnouncementReadAction,
  generateICalSubscriptionAction,
  publishAnnouncementAction,
} from "@/modules/schedules/actions";
import {
  WEEK_DAYS_AGENDA,
  INITIAL_EVENTS,
  INITIAL_ANNOUNCEMENTS,
} from "@/modules/schedules/data";

describe("Stage 7 — Schedules & Announcements (PRD-06)", () => {
  it("marks announcement as read for current user (SCH-015)", async () => {
    const res = await markAnnouncementReadAction("ann-01");
    expect(res.success).toBe(true);
    expect(res.message).toContain("ditandai sudah dibaca");
  });

  it("generates secure iCal calendar subscription URL (SCH-009)", async () => {
    const res = await generateICalSubscriptionAction();
    expect(res.success).toBe(true);
    expect(res.icalUrl).toContain("/api/calendar/feed?token=");
    expect(res.message).toContain("Tautan kalender iCal");
  });

  it("validates announcement creation and pins important notices (BR-SCH-07, SCH-011)", async () => {
    const emptyTitleRes = await publishAnnouncementAction({
      title: "",
      bodyMarkdown: "Isi pengumuman",
      priority: "normal",
      targetAudienceLabel: "Semua Santri",
    });
    expect(emptyTitleRes.success).toBe(false);
    expect(emptyTitleRes.message).toContain("Judul pengumuman wajib diisi");

    const validImportantRes = await publishAnnouncementAction({
      title: "Jadwal Ujian Lisan Tahfidz Akbar",
      bodyMarkdown: "Seluruh santri wajib mempersiapkan hafalan mutqin.",
      priority: "important",
      targetAudienceLabel: "Santri Tahfidz",
    });
    expect(validImportantRes.success).toBe(true);
    expect(validImportantRes.announcement).toBeDefined();
    expect(validImportantRes.announcement?.isPinned).toBe(true);
    expect(validImportantRes.announcement?.priority).toBe("important");
  });

  it("verifies consistency of weekly agenda days and timeline sessions", () => {
    expect(WEEK_DAYS_AGENDA).toHaveLength(7);
    const activeDay = WEEK_DAYS_AGENDA.find((d) => d.isActive);
    expect(activeDay?.dateNum).toBe(18);
    expect(activeDay?.dayName).toBe("Sen");

    expect(INITIAL_EVENTS).toHaveLength(3);
    const changedLocationEvent = INITIAL_EVENTS.find(
      (e) => e.statusBadge === "location_changed"
    );
    expect(changedLocationEvent).toBeDefined();
    expect(changedLocationEvent?.previousLocation).toBe("Ruang Teori");
    expect(changedLocationEvent?.location).toBe("Aula Pertemuan Utama");

    const pinnedAnn = INITIAL_ANNOUNCEMENTS.find((a) => a.isPinned);
    expect(pinnedAnn).toBeDefined();
    expect(pinnedAnn?.priority).toBe("important");
  });
});

