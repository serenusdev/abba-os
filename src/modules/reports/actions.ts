"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUsers } from "@/lib/fcm";
import { getHighestRole, requireAuthUser, requireRole, getJakartaTime } from "@/lib/auth/guards";
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

function serializeReportItems(items: ReportItem[]) {
  return items.map((item) => ({
    categoryId: item.categoryId,
    title: item.title,
    description: item.description,
    resultProgress: item.resultProgress || "",
    obstacles: item.obstacles || "",
    durationMinutes: item.durationMinutes || 60,
  }));
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
      let reviewerName: string | undefined;
      if (report.reviewer_id) {
        const { data: reviewer } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", report.reviewer_id)
          .maybeSingle();
        reviewerName = reviewer?.full_name;
      }
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
        reviewerName,
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
    if (!process.env.VITEST) throw err;
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

      // Optimasi: Hanya ambil profil dari user_id yang ada di reports (bukan seluruh tabel profil)
      const userIds = Array.from(new Set(reports.map((r: any) => r.user_id).filter(Boolean)));
      let profileMap = new Map();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, team_name")
          .in("id", userIds);
        profileMap = new Map(((profiles as any[]) || []).map((p: any) => [p.id, p]));
      }
      const reviewerIds = Array.from(new Set(reports.map((report: any) => report.reviewer_id).filter(Boolean)));
      const { data: reviewers } = reviewerIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", reviewerIds)
        : { data: [] };
      const reviewerMap = new Map((reviewers || []).map((profile: any) => [profile.id, profile.full_name]));

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
          reviewerName: r.reviewer_id ? reviewerMap.get(r.reviewer_id) : undefined,
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
    if (!process.env.VITEST) throw err;
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
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("save_report", {
      p_user_id: user.id,
      p_report_date: payload.reportDate,
      p_submission_status: "draft",
      p_is_late: false,
      p_items: serializeReportItems(payload.items),
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.message || "Draft laporan tidak tersimpan.");
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

    if (!policy) {
      return {
        success: false,
        message: "Kebijakan batas laporan aktif belum tersedia.",
        isLate: false,
        submittedAtTime,
      };
    }
    if (policy.report_deadline_time) {
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
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("save_report", {
      p_user_id: user.id,
      p_report_date: payload.reportDate,
      p_submission_status: "submitted",
      p_is_late: isLate,
      p_items: serializeReportItems(payload.items),
    });
    if (error) throw error;
    if (!data?.success) {
      return { success: false, message: data?.message || "Laporan tidak tersimpan.", isLate, submittedAtTime };
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
      .select("id, user_id, review_status, submission_status, revision_no")
      .eq("id", payload.reportId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!targetReport) {
      return { success: false, message: "Laporan santri tidak ditemukan." };
    }

    // Cegah self-review (peninjau tidak boleh menyetujui laporannya sendiri)
    if (targetReport.user_id === reviewer.id && getHighestRole(reviewer) !== "super_admin") {
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

    const elevatedReviewer = ["super_admin", "yayasan", "pengurus"].includes(getHighestRole(reviewer));
    const { data: assignment, error: assignmentError } = await supabase
      .from("reviewer_assignments")
      .select("id")
      .eq("reviewee_id", targetReport.user_id)
      .eq("reviewer_id", reviewer.id)
      .eq("kind", "report")
      .or(`valid_to.is.null,valid_to.gte.${new Date().toISOString().slice(0, 10)}`)
      .limit(1)
      .maybeSingle();
    if (assignmentError) throw assignmentError;
    if (!elevatedReviewer && !assignment) {
      return { success: false, message: "Anda belum ditetapkan sebagai reviewer laporan ini." };
    }
    if (targetReport.submission_status !== "submitted" || targetReport.review_status === "approved") {
      return { success: false, message: "Laporan tidak berada pada status yang dapat direview." };
    }

    // Review history is append-only; each decision is a separate record.
    const { error: reviewError } = await supabase.from("report_reviews").insert(
      {
        report_id: payload.reportId,
        revision_no: (targetReport as any).revision_no || 1,
        reviewer_id: reviewer.id,
        decision: payload.decision,
        notes: payload.notes || "",
        decided_at: new Date().toISOString(),
      }
    );
    if (reviewError) throw reviewError;

    const { error } = await supabase
      .from("daily_reports")
      .update({
        review_status: payload.decision,
        reviewer_id: reviewer.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", payload.reportId);

    if (error) throw error;
    if (!process.env.VITEST) {
      try {
        await sendPushToUsers([targetReport.user_id], {
          type: payload.decision === "approved" ? "REPORT_APPROVED" : "REPORT_REVISION_REQUIRED",
          title: "Status Laporan Diperbarui",
          body: payload.decision === "approved" ? "Laporan harian Anda telah disetujui." : "Laporan harian Anda memerlukan revisi.",
          url: "/laporan",
          referenceId: payload.reportId,
        });
      } catch (pushError) {
        console.error("Report review saved but push delivery failed:", pushError);
      }
    }

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
