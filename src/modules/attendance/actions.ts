"use server";

import { AttendanceClassification, CorrectionRequestPayload } from "./types";

export interface CheckinResult {
  success: boolean;
  message: string;
  classification: AttendanceClassification;
  timeStr: string;
  alreadyCheckedIn?: boolean;
}

/**
 * Server Action: Process 1-tap Attendance Check-in
 * Strictly enforces server time (BR-ATT-05) and minute threshold (BR-ATT-09).
 */
export async function checkInAttendanceAction(): Promise<CheckinResult> {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const timeFormatted = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} WIB`;

  // Classification calculation (WIB)
  let classification: AttendanceClassification = "on_time";
  if (hours > 8 || (hours === 8 && minutes > 15)) {
    classification = "late";
  } else if (hours === 8 && minutes >= 1 && minutes <= 15) {
    classification = "grace";
  } else {
    classification = "on_time";
  }

  const label =
    classification === "on_time"
      ? "Tepat Waktu"
      : classification === "grace"
      ? "Masa Toleransi"
      : "Terlambat";

  return {
    success: true,
    message: `Presensi berhasil dicatat pada ${timeFormatted} (Status: ${label}).`,
    classification,
    timeStr: timeFormatted,
    alreadyCheckedIn: false,
  };
}

/**
 * Server Action: Submit Attendance Correction Request (ATT-007)
 */
export async function submitCorrectionAction(
  payload: CorrectionRequestPayload
): Promise<{ success: boolean; message: string }> {
  if (!payload.reasonCategory) {
    return {
      success: false,
      message: "Alasan koreksi presensi wajib dipilih.",
    };
  }

  return {
    success: true,
    message: `Pengajuan koreksi untuk ${payload.attendanceDate} (${payload.reasonCategory}) berhasil diteruskan ke Pengurus.`,
  };
}

/**
 * Server Action: Submit Sickness / Leave Exception
 */
export async function submitExceptionAction(
  dateFrom: string,
  dateTo: string,
  type: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  if (!reason.trim()) {
    return {
      success: false,
      message: "Keterangan alasan izin / sakit wajib diisi.",
    };
  }

  return {
    success: true,
    message: `Permohonan ${type === "sick" ? "Sakit" : "Izin"} untuk tanggal ${dateFrom} s.d. ${dateTo} telah diajukan ke Dewan Pengurus.`,
  };
}

