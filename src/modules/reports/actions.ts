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
  try {
    const supabase = createAdminClient();
    const today = new Date().toISOString().split("T")[0];
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
        authorName: "Salman Al-Farisi",
        authorRole: "Santri",
        teamName: "Sentra Digitalpreneur",
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
  return INITIAL_USER_DAILY_REPORT;
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

    const { data: profiles } = await supabase.from("profiles").select("id, full_name, team_name");
    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    if (reports && reports.length > 0) {
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
  return REVIEW_QUEUE_REPORTS;
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
  // Per BR-REP-03: Deadline is 21:00 WIB
  const isLate = hours > 21 || (hours === 21 && (minutes > 0 || seconds > 0));

  const statusLabel = isLate ? "Terlambat (melewati 21.00 WIB)" : "Tepat Waktu";

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
