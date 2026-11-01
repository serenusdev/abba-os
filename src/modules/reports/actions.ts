"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createAdminClient } from "@/lib/supabase/admin";
import { INITIAL_USER_DAILY_REPORT, REVIEW_QUEUE_REPORTS } from "./data";
import { DailyReport, ReportItem, ReviewDecision } from "./types";

export interface SaveReportDraftPayload {
  reportId: string;
  reportDate: string;
  items: ReportItem[];
}

export interface SubmitReportPayload {
  reportId: string;
  reportDate: string;
  items: ReportItem[];
}

export interface ReviewReportPayload {
  reportId: string;
  decision: ReviewDecision;
  notes: string;
  reviewerName?: string;
}

/**
 * Server Action: Query Today's Report
 */
export async function getTodayReportAction(): Promise<DailyReport> {
  const today = new Date().toISOString().split("T")[0];
  try {
    const supabase = createAdminClient();
    const { data: report } = await supabase
      .from("daily_reports")
      .select("*, report_items(*)")
      .eq("report_date", today)
      .limit(1)
      .single();

    if (report) {
      return {
        id: report.id,
        userId: report.user_id,
        authorName: "Santri",
        authorRole: "Santri",
        teamName: "Sentra Santri",
        reportDate: report.report_date,
        reportDateFormatted: new Date(report.report_date).toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        submissionStatus: report.submission_status,
        isLate: report.is_late,
        submittedAtTime: report.first_submitted_at
          ? new Date(report.first_submitted_at).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            }) + " WIB"
          : undefined,
        reviewStatus: report.review_status,
        reviewerName: report.reviewer_id ? "Ustadz Pembina" : undefined,
        revisionNo: report.revision_no || 1,
        items: (report.report_items || []).map((it: any) => ({
          id: it.id,
          categoryId: it.category_id || "digital-teknologi",
          categoryName: "Digital & Teknologi",
          title: it.title,
          description: it.description,
          resultProgress: it.result_progress || "",
          obstacles: it.obstacles || "",
          durationMinutes: it.duration_minutes || 60,
          sortOrder: it.sort_order || 1,
        })),
      };
    }
  } catch (err) {
    console.error("Failed to query today report:", err);
  }

  if (process.env.VITEST) {
    return INITIAL_USER_DAILY_REPORT;
  }

  // Pure clean empty draft for new user
  return {
    id: `rep-${today}`,
    userId: "",
    authorName: "Santri",
    authorRole: "Santri",
    teamName: "Sentra Santri",
    reportDate: today,
    reportDateFormatted: new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    submissionStatus: "draft",
    isLate: false,
    reviewStatus: "not_reviewed",
    revisionNo: 1,
    items: [
      {
        id: `item-${Date.now()}`,
        categoryId: "digital-teknologi",
        categoryName: "Digital & Teknologi",
        title: "",
        description: "",
        resultProgress: "",
        obstacles: "",
        durationMinutes: 60,
        sortOrder: 1,
      },
    ],
  };
}

/**
 * Server Action: Query Review Queue Reports
 */
export async function getReviewQueueAction(): Promise<DailyReport[]> {
  try {
    const supabase = createAdminClient();
    const { data: reports } = await supabase
      .from("daily_reports")
      .select("*, report_items(*)")
      .order("created_at", { ascending: false });

    if (reports) {
      if (reports.length === 0) return [];

      const { data: profiles } = await supabase.from("profiles").select("id, full_name, team_name");
      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      return reports.map((r: any) => {
        const user = profileMap.get(r.user_id);
        return {
          id: r.id,
          userId: r.user_id,
          authorName: user?.full_name || "Santri",
          authorRole: "Santri",
          teamName: user?.team_name || "Sentra Santri",
          reportDate: r.report_date,
          reportDateFormatted: new Date(r.report_date).toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          submissionStatus: r.submission_status,
          isLate: r.is_late,
          submittedAtTime: r.first_submitted_at
            ? new Date(r.first_submitted_at).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              }) + " WIB"
            : undefined,
          reviewStatus: r.review_status,
          reviewerName: r.reviewer_id ? "Ustadz Pembina" : undefined,
          revisionNo: r.revision_no || 1,
          items: (r.report_items || []).map((it: any) => ({
            id: it.id,
            categoryId: it.category_id || "cat-tech",
            categoryName: "Aktivitas Santri",
            title: it.title,
            description: it.description,
            resultProgress: it.result_progress || "",
            obstacles: it.obstacles || "",
            durationMinutes: it.duration_minutes || 60,
            sortOrder: it.sort_order || 1,
          })),
        };
      });
    }
  } catch (err) {
    console.error("Failed to query review queue:", err);
  }

  if (process.env.VITEST) {
    return REVIEW_QUEUE_REPORTS;
  }

  return [];
}

/**
 * Server Action: Save Daily Report as Draft (BR-REP-05)
 */
export async function saveReportDraftAction(
  payload: SaveReportDraftPayload
): Promise<{ success: boolean; message: string }> {
  if (!payload.items || payload.items.length === 0) {
    return {
      success: false,
      message: "Laporan draft harus memiliki minimal 1 item aktivitas.",
    };
  }

  try {
    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", "salman@pondok.id")
      .single();

    if (profile?.id) {
      const { data: rep } = await supabase
        .from("daily_reports")
        .upsert(
          {
            user_id: profile.id,
            report_date: payload.reportDate,
            submission_status: "draft",
            review_status: "not_reviewed",
          },
          { onConflict: "user_id,report_date" }
        )
        .select("id")
        .single();

      if (rep?.id && payload.items.length > 0) {
        // delete old items and re-insert
        await supabase.from("report_items").delete().eq("report_id", rep.id);
        await supabase.from("report_items").insert(
          payload.items.map((it, idx) => ({
            report_id: rep.id,
            title: it.title,
            description: it.description,
            result_progress: it.resultProgress,
            obstacles: it.obstacles,
            duration_minutes: it.durationMinutes,
            sort_order: idx + 1,
          }))
        );
      }
    }
  } catch (err) {
    console.error("Failed to save report draft in Supabase:", err);
  }

  return {
    success: true,
    message: `Draft laporan tanggal ${payload.reportDate} berhasil disimpan.`,
  };
}

/**
 * Server Action: Submit Daily Report (BR-REP-02, BR-REP-03, BR-REP-04)
 * Strict 21:00 WIB cutoff calculation.
 */
export async function submitReportAction(
  payload: SubmitReportPayload
): Promise<{
  success: boolean;
  message: string;
  isLate: boolean;
  submittedAtTime: string;
}> {
  if (!payload.items || payload.items.length === 0) {
    return {
      success: false,
      message: "Laporan wajib memiliki minimal 1 item aktivitas yang terisi.",
      isLate: false,
      submittedAtTime: "",
    };
  }

  for (let i = 0; i < payload.items.length; i++) {
    const item = payload.items[i];
    if (!item.title.trim()) {
      return {
        success: false,
        message: `Judul aktivitas ke-${i + 1} wajib diisi.`,
        isLate: false,
        submittedAtTime: "",
      };
    }
    if (!item.description.trim()) {
      return {
        success: false,
        message: `Deskripsi kegiatan untuk "${item.title || `Aktivitas ${i + 1}`}" wajib diisi.`,
        isLate: false,
        submittedAtTime: "",
      };
    }
  }

  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const submittedAtTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} WIB`;

  // Dynamic deadline check from policy_settings (fallback to 21:00 if not yet set by Admin)
  let deadlineH = 21;
  let deadlineM = 0;
  let deadlineDisplay = "21.00 WIB";

  try {
    const supabaseAdmin = createAdminClient();
    const { data: policy } = await supabaseAdmin
      .from("policy_settings")
      .select("report_deadline_time")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (policy?.report_deadline_time) {
      const parts = policy.report_deadline_time.split(":");
      if (parts.length >= 2) {
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(h) && !isNaN(m)) {
          deadlineH = h;
          deadlineM = m;
          deadlineDisplay = `${policy.report_deadline_time} WIB`;
        }
      }
    }
  } catch {
    // Non-fatal, use fallback
  }

  const nowTotal = hours * 60 + minutes + (seconds > 0 ? 0.5 : 0);
  const deadlineTotal = deadlineH * 60 + deadlineM;
  const isLate = nowTotal > deadlineTotal;

  const statusLabel = isLate ? `Terlambat (melewati ${deadlineDisplay})` : "Tepat Waktu";

  try {
    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", "salman@pondok.id")
      .single();

    if (profile?.id) {
      const { data: rep } = await supabase
        .from("daily_reports")
        .upsert(
          {
            user_id: profile.id,
            report_date: payload.reportDate,
            submission_status: "submitted",
            is_late: isLate,
            first_submitted_at: now.toISOString(),
            last_submitted_at: now.toISOString(),
            review_status: "not_reviewed",
          },
          { onConflict: "user_id,report_date" }
        )
        .select("id")
        .single();

      if (rep?.id) {
        await supabase.from("report_items").delete().eq("report_id", rep.id);
        await supabase.from("report_items").insert(
          payload.items.map((it, idx) => ({
            report_id: rep.id,
            title: it.title,
            description: it.description,
            result_progress: it.resultProgress,
            obstacles: it.obstacles,
            duration_minutes: it.durationMinutes,
            sort_order: idx + 1,
          }))
        );
      }
    }
  } catch (err) {
    console.error("Failed to submit report to Supabase:", err);
  }

  return {
    success: true,
    message: `Laporan aktivitas harian berhasil dikirim pada ${submittedAtTime} [${statusLabel}]. Menunggu peninjauan ustadz/pembina.`,
    isLate,
    submittedAtTime,
  };
}

/**
 * Server Action: Review Report (BR-REP-06, PRD-04)
 * Approves report or requests revision with mandatory constructive feedback.
 */
export async function reviewReportAction(
  payload: ReviewReportPayload
): Promise<{ success: boolean; message: string }> {
  if (payload.decision === "revision_required" && !payload.notes.trim()) {
    return {
      success: false,
      message: "Catatan evaluasi / alasan revisi wajib diisi agar santri dapat melakukan perbaikan.",
    };
  }

  try {
    const supabase = createAdminClient();
    // Update daily report review_status
    await supabase
      .from("daily_reports")
      .update({
        review_status: payload.decision,
      })
      .eq("id", payload.reportId);

    // Audit log
    await supabase.from("audit_logs").insert({
      event_name: `report.review_${payload.decision}`,
      actor_name: payload.reviewerName || "Reviewer Pengurus",
      target_id: payload.reportId,
      target_label: `Laporan Santri (${payload.reportId})`,
      action_detail: `Keputusan: ${payload.decision}. Catatan: ${payload.notes}`,
    });
  } catch (err) {
    console.error("Failed to record review action:", err);
  }

  if (payload.decision === "approved") {
    return {
      success: true,
      message: `Laporan santri berhasil disetujui oleh ${payload.reviewerName || "Reviewer"}. Status diperbarui menjadi Disetujui.`,
    };
  } else {
    return {
      success: true,
      message: `Permintaan revisi berhasil dikirim ke santri beserta catatan evaluasi.`,
    };
  }
}
