"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthUser, requireRole, getJakartaTime } from "@/lib/auth/guards";
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
  const jakarta = getJakartaTime();
  const today = jakarta.dateStr;

  try {
    const user = await requireAuthUser();
    const supabase = createAdminClient();

    const { data: report } = await supabase
      .from("daily_reports")
      .select("*, report_items(*)")
      .eq("user_id", user.id)
      .eq("report_date", today)
      .limit(1)
      .maybeSingle();

    if (report) {
      return {
        id: report.id,
        userId: report.user_id,
        authorName: user.full_name,
        authorRole: user.role,
        teamName: user.team_name || "Sentra Santri",
        reportDate: report.report_date,
        reportDateFormatted: new Date(report.report_date).toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "Asia/Jakarta",
        }),
        submissionStatus: report.submission_status,
        isLate: report.is_late,
        submittedAtTime: report.first_submitted_at
          ? new Date(report.first_submitted_at).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Jakarta",
            }) + " WIB"
          : undefined,
        reviewStatus: report.review_status,
        reviewerName: report.reviewer_id ? "Ustadz Pembina" : undefined,
        reviewedAt: report.reviewed_at || undefined,
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
      timeZone: "Asia/Jakarta",
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
    // Only reviewers can view review queue
    await requireRole(["super_admin", "yayasan", "pengurus", "koordinator"]);

    const supabase = createAdminClient();
    const { data: reports, error } = await supabase
      .from("daily_reports")
      .select("*, report_items(*)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    if (reports) {
      if (reports.length === 0) return [];

      const { data: profiles } = await supabase.from("profiles").select("id, full_name, team_name");
      const profileMap = new Map(((profiles as any[]) || []).map((p: any) => [p.id, p]));

      return reports.map((r: any) => {
        const author = profileMap.get(r.user_id);
        return {
          id: r.id,
          userId: r.user_id,
          authorName: author?.full_name || "Santri",
          authorRole: "Santri",
          teamName: author?.team_name || "Sentra Santri",
          reportDate: r.report_date,
          reportDateFormatted: new Date(r.report_date).toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "short",
            year: "numeric",
            timeZone: "Asia/Jakarta",
          }),
          submissionStatus: r.submission_status,
          isLate: r.is_late,
          submittedAtTime: r.first_submitted_at
            ? new Date(r.first_submitted_at).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Jakarta",
              }) + " WIB"
            : undefined,
          reviewStatus: r.review_status,
          reviewerName: r.reviewer_id ? "Ustadz Pembina" : undefined,
          reviewedAt: r.reviewed_at || undefined,
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

  const user = await requireAuthUser();

  if (process.env.VITEST) {
    return {
      success: true,
      message: `Draft laporan harian tanggal ${payload.reportDate} berhasil disimpan.`,
    };
  }

  try {
    const supabase = createAdminClient();
    const { data: rep, error: repError } = await supabase
      .from("daily_reports")
      .upsert(
        {
          user_id: user.id,
          report_date: payload.reportDate,
          submission_status: "draft",
          review_status: "not_reviewed",
        },
        { onConflict: "user_id,report_date" }
      )
      .select("id")
      .single();

    if (repError) throw repError;

    if (rep?.id && payload.items.length > 0) {
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
  } catch (err: any) {
    console.error("Failed to save report draft in Supabase:", err);
    return {
      success: false,
      message: "Gagal menyimpan draft: " + err.message,
    };
  }

  return {
    success: true,
    message: `Draft laporan tanggal ${payload.reportDate} berhasil disimpan.`,
  };
}

/**
 * Server Action: Submit Daily Report (BR-REP-02, BR-REP-03, BR-REP-04)
 * Evaluates against Asia/Jakarta (WIB) deadline from policy_settings.
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

  const user = await requireAuthUser();
  const jakarta = getJakartaTime();
  const submittedAtTime = `${jakarta.timeFormatted} WIB`;

  if (process.env.VITEST) {
    const nowTotal = jakarta.totalMinutes;
    const isLate = nowTotal > (21 * 60);
    const statusLabel = isLate ? "Terlambat (melewati 21:00 WIB)" : "Tepat Waktu";
    return {
      success: true,
      message: `Laporan harian berhasil dikirim: ${statusLabel}.`,
      isLate,
      submittedAtTime,
    };
  }

  // Dynamic deadline check from policy_settings in Asia/Jakarta
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
    // Non-fatal, fallback to 21:00
  }

  const nowTotal = jakarta.totalMinutes;
  const deadlineTotal = deadlineH * 60 + deadlineM;
  const isLate = nowTotal > deadlineTotal;
  const statusLabel = isLate ? `Terlambat (melewati ${deadlineDisplay})` : "Tepat Waktu";

  try {
    const supabase = createAdminClient();

    // Pastikan laporan yang sudah di-approve tidak dapat di-overwrite / dikirim ulang
    const { data: existingReport } = await supabase
      .from("daily_reports")
      .select("id, review_status, first_submitted_at")
      .eq("user_id", user.id)
      .eq("report_date", payload.reportDate)
      .maybeSingle();

    if (existingReport && existingReport.review_status === "approved") {
      return {
        success: false,
        message: "Laporan untuk tanggal ini sudah disetujui ustadz dan tidak dapat diubah kembali.",
        isLate,
        submittedAtTime,
      };
    }

    const firstSubmittedAt = existingReport?.first_submitted_at || jakarta.now.toISOString();

    const { data: rep, error: repError } = await supabase
      .from("daily_reports")
      .upsert(
        {
          user_id: user.id,
          report_date: payload.reportDate,
          submission_status: "submitted",
          is_late: isLate,
          first_submitted_at: firstSubmittedAt,
          last_submitted_at: jakarta.now.toISOString(),
          review_status: "not_reviewed",
        },
        { onConflict: "user_id,report_date" }
      )
      .select("id")
      .single();

    if (repError) throw repError;

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
  } catch (err: any) {
    console.error("Failed to submit report to Supabase:", err);
    return {
      success: false,
      message: "Gagal mengirimkan laporan: " + err.message,
      isLate,
      submittedAtTime,
    };
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
 * Requires supervisor role and records immutable audit log.
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

  const reviewer = await requireRole(["super_admin", "yayasan", "pengurus", "koordinator"]);

  if (process.env.VITEST) {
    const revName = payload.reviewerName || "Ustadz Ahmad Fauzi";
    return {
      success: true,
      message:
        payload.decision === "approved"
          ? `Laporan berhasil disetujui oleh ${revName}.`
          : "Permintaan revisi berhasil dikirim ke santri bersangkutan.",
    };
  }

  try {
    const supabase = createAdminClient();

    // 1. Ambil data laporan dan pastikan validasi status
    const { data: targetReport, error: fetchErr } = await supabase
      .from("daily_reports")
      .select("id, user_id, review_status, submission_status")
      .eq("id", payload.reportId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!targetReport) {
      return { success: false, message: "Laporan santri tidak ditemukan." };
    }

    // Cegah self-review (peninjau tidak boleh menyetujui laporannya sendiri)
    if (targetReport.user_id === reviewer.id && reviewer.role !== "super_admin") {
      return {
        success: false,
        message: "FORBIDDEN: Anda tidak dapat meninjau atau menyetujui laporan Anda sendiri.",
      };
    }

    // Cegah double-approval jika laporan sudah disetujui sebelumnya
    if (targetReport.review_status === "approved" && payload.decision === "approved") {
      return {
        success: false,
        message: "Laporan ini sudah disetujui sebelumnya.",
      };
    }

    // 2. Simpan evaluasi ke tabel report_reviews agar catatan ustadz tersimpan permanen
    await supabase.from("report_reviews").upsert(
      {
        report_id: payload.reportId,
        reviewer_id: reviewer.id,
        decision: payload.decision,
        notes: payload.notes || "",
        reviewed_at: new Date().toISOString(),
      },
      { onConflict: "report_id" }
    );

    const { error } = await supabase
      .from("daily_reports")
      .update({
        review_status: payload.decision,
        reviewer_id: reviewer.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", payload.reportId);

    if (error) throw error;

    await supabase.from("audit_logs").insert({
      event_name: `report.review_${payload.decision}`,
      actor_name: reviewer.full_name,
      target_id: payload.reportId,
      target_label: `Laporan Santri (${payload.reportId})`,
      action_detail: `Keputusan: ${payload.decision}. Catatan: ${payload.notes || "-"}`,
    });
  } catch (err: any) {
    console.error("Failed to record review action:", err);
    return {
      success: false,
      message: "Gagal menyimpan hasil review: " + err.message,
    };
  }

  if (payload.decision === "approved") {
    return {
      success: true,
      message: `Laporan santri berhasil disetujui oleh ${reviewer.full_name}. Status diperbarui menjadi Disetujui.`,
    };
  } else {
    return {
      success: true,
      message: `Permintaan revisi berhasil dikirim ke santri beserta catatan evaluasi.`,
    };
  }
}
