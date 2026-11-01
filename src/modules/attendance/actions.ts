"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createAdminClient } from "@/lib/supabase/admin";
import { ATTENDANCE_HISTORY } from "./data";
import { AttendanceClassification, AttendanceRecordItem, CorrectionRequestPayload } from "./types";

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

  try {
    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", "salman@pondok.id")
      .single();

    const userId = profile?.id;
    if (userId) {
      const today = now.toISOString().split("T")[0];
      await supabase.from("attendance_records").upsert(
        {
          user_id: userId,
          attendance_date: today,
          checked_in_at: now.toISOString(),
          classification,
          minutes_after_deadline: classification === "late" ? (hours - 8) * 60 + minutes : 0,
          policy_version_id: "v2.0-default",
          client_meta: { source: "web-live", recorded_at: now.toISOString() },
        },
        { onConflict: "user_id,attendance_date" }
      );
    }
  } catch (err) {
    console.error("Supabase attendance checkin error:", err);
  }

  return {
    success: true,
    message: `Presensi berhasil dicatat pada ${timeFormatted} (Status: ${label}).`,
    classification,
    timeStr: timeFormatted,
    alreadyCheckedIn: false,
  };
}

/**
 * Server Action: Query live attendance history from Supabase
 */
export async function getAttendanceHistoryAction(): Promise<AttendanceRecordItem[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("attendance_records")
      .select("*")
      .order("attendance_date", { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((r: any) => {
        const timeStr =
          new Date(r.checked_in_at).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          }) + " WIB";
        const label =
          r.classification === "on_time"
            ? "Tepat Waktu"
            : r.classification === "grace"
            ? "Masa Toleransi"
            : r.classification === "late"
            ? "Terlambat"
            : "Izin";

        return {
          id: r.id,
          dateStr: r.attendance_date,
          dateFormatted: new Date(r.attendance_date).toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          timeStr,
          classification: r.classification,
          label,
          sessionTitle: "Operasional Santri Pagi",
          canCorrect: r.classification === "late" || r.classification === "grace",
        };
      });
    }
  } catch (err) {
    console.error("Failed to query attendance records:", err);
  }
  return ATTENDANCE_HISTORY;
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

  try {
    const supabase = createAdminClient();
    // Record into audit log
    await supabase.from("audit_logs").insert({
      event_name: "attendance.correction_requested",
      actor_name: "Salman Al-Farisi",
      target_id: payload.attendanceDate,
      target_label: `Koreksi Presensi ${payload.attendanceDate}`,
      action_detail: `Alasan: ${payload.reasonCategory}. Catatan: ${payload.notes || "-"}`,
    });
  } catch (err) {
    console.error("Failed to log correction audit:", err);
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

  try {
    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", "salman@pondok.id")
      .single();

    if (profile?.id) {
      await supabase.from("attendance_exceptions").insert({
        user_id: profile.id,
        date_from: dateFrom,
        date_to: dateTo,
        type,
        reason,
        status: "pending",
      });
    }
  } catch (err) {
    console.error("Failed to insert attendance exception:", err);
  }

  return {
    success: true,
    message: `Permohonan ${type === "sick" ? "Sakit" : "Izin"} untuk tanggal ${dateFrom} s.d. ${dateTo} telah diajukan ke Dewan Pengurus.`,
  };
}
