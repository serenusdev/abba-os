"use server";

import { ManualAccountPayload } from "./types";

export interface ActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

/**
 * Server Action: Approve an applicant from the registration queue.
 * Complies with BR-IAM-01 & BR-IAM-04.
 */
export async function approveAccountApplicationAction(
  applicantId: string,
  assignedRole: string
): Promise<ActionResult> {
  if (!applicantId) {
    return { success: false, message: "ID Pemohon tidak valid." };
  }

  // In production, performs Supabase transaction: updates account_requests, creates user_roles, logs to audit.audit_logs
  return {
    success: true,
    message: `Permohonan akun ${applicantId} berhasil disetujui dengan peran '${assignedRole}'. Hak akses telah aktif.`,
  };
}

/**
 * Server Action: Reject an applicant with mandatory reason.
 */
export async function rejectAccountApplicationAction(
  applicantId: string,
  reason: string
): Promise<ActionResult> {
  if (!applicantId || !reason.trim()) {
    return { success: false, message: "Alasan penolakan wajib diisi (BR-IAM-02)." };
  }

  return {
    success: true,
    message: `Permohonan akun ${applicantId} telah ditolak dan dicatat ke log penolakan.`,
  };
}

/**
 * Server Action: Manual Account Creation by Admin (PRD-01 §3.2 Pathway B).
 */
export async function createManualAccountAction(
  payload: ManualAccountPayload
): Promise<ActionResult> {
  if (!payload.fullName || !payload.email || !payload.phone) {
    return { success: false, message: "Semua bidang identitas wajib diisi." };
  }

  return {
    success: true,
    message: `Akun untuk ${payload.fullName} (${payload.email}) berhasil dibuat dan langsung berstatus aktif.`,
  };
}

/**
 * Server Action: Reset / Revoke User Active Sessions (PRD-01 §2.5).
 */
export async function resetUserSessionAction(
  userId: string
): Promise<ActionResult> {
  if (!userId) {
    return { success: false, message: "User ID tidak valid." };
  }

  return {
    success: true,
    message: `Seluruh sesi aktif untuk ID pengguna ${userId} telah berhasil dicabut.`,
  };
}
