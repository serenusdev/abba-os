"use server";

import { ReportItem, ReviewDecision } from "./types";

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
