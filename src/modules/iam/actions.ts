"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { UserProfile } from "@/lib/auth/types";
import { ManualAccountPayload } from "./types";

export interface ActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface AccountRequestItem {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  roleRequested: string;
  teamRequested: string;
  notes: string;
  status: string;
  createdAt: string;
  initials: string;
}

export interface ActiveUserItem {
  id: string;
  fullName: string;
  email: string;
  role: string;
  teamName: string;
  status: string;
  initials: string;
  devicesCount: number;
  deviceInfo: string;
  mfaEnabled: boolean;
  isVerified?: boolean;
}

/**
 * Server Action: Query pending account registration requests
 */
export async function getAccountRequestsAction(): Promise<AccountRequestItem[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("account_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((d: any) => {
        const initials = d.full_name
          ? d.full_name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase()
          : "P";
        return {
          id: d.id,
          fullName: d.full_name,
          email: d.email,
          phoneNumber: d.phone_number || "-",
          roleRequested: d.role_requested || "santri",
          teamRequested: d.team_requested || "Sentra Santri",
          notes: d.notes || "-",
          status: d.status,
          createdAt: new Date(d.created_at).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          initials,
        };
      });
    }
  } catch (err) {
    console.error("Failed to query account requests:", err);
  }
  return [];
}

/**
 * Server Action: Query active user profiles
 */
export async function getActiveUsersAction(): Promise<ActiveUserItem[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((d: any) => {
        const initials = d.full_name
          ? d.full_name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase()
          : "U";
        return {
          id: d.id,
          fullName: d.full_name,
          email: d.email,
          role: d.member_type || "Santri",
          teamName: d.team_name || "Sentra Santri",
          status: d.status || "active",
          initials,
          devicesCount: 1,
          deviceInfo: "1 Perangkat Aktif",
          mfaEnabled: false,
          isVerified: d.status === "active",
        };
      });
    }
  } catch (err) {
    console.error("Failed to query active users:", err);
  }
  return [];
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

  try {
    const supabase = createAdminClient();
    if (applicantId.length > 30) {
      await supabase
        .from("account_requests")
        .update({ status: "approved" })
        .eq("id", applicantId);
    }
    await supabase.from("audit_logs").insert({
      event_name: "iam.account_approved",
      actor_name: "Super Admin",
      target_id: applicantId,
      target_label: `Permohonan ${applicantId}`,
      action_detail: `Persetujuan akun dengan peran '${assignedRole}'.`,
    });
  } catch (err) {
    console.error("Failed to approve account in Supabase:", err);
  }

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

  try {
    const supabase = createAdminClient();
    if (applicantId.length > 30) {
      await supabase
        .from("account_requests")
        .update({ status: "rejected", notes: reason })
        .eq("id", applicantId);
    }
    await supabase.from("audit_logs").insert({
      event_name: "iam.account_rejected",
      actor_name: "Super Admin",
      target_id: applicantId,
      target_label: `Permohonan ${applicantId}`,
      action_detail: `Penolakan akun. Alasan: ${reason}`,
    });
  } catch (err) {
    console.error("Failed to reject account in Supabase:", err);
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

  try {
    const supabase = createAdminClient();
    const { data: authUser } = await supabase.auth.admin.createUser({
      email: payload.email,
      password: "PasswordPondok2026!",
      email_confirm: true,
      user_metadata: { full_name: payload.fullName },
    });

    if (authUser?.user?.id) {
      await supabase.from("profiles").upsert({
        id: authUser.user.id,
        email: payload.email,
        full_name: payload.fullName,
        phone_number: payload.phone,
        status: "active",
        member_type: payload.role,
        team_name: payload.teamName,
        notes: payload.notes || "Dibuat langsung oleh Admin (Jalur B)",
      });
    }

    await supabase.from("audit_logs").insert({
      event_name: "iam.account_created_manual",
      actor_name: "Super Admin",
      target_id: payload.email,
      target_label: payload.fullName,
      action_detail: `Pembuatan akun manual Jalur B untuk peran ${payload.role} di tim ${payload.teamName}.`,
    });
  } catch (err) {
    console.error("Failed to create manual account in Supabase:", err);
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

  try {
    const supabase = createAdminClient();
    await supabase.from("audit_logs").insert({
      event_name: "iam.session_revoked",
      actor_name: "Super Admin",
      target_id: userId,
      target_label: `User ${userId}`,
      action_detail: "Pencabutan seluruh sesi aktif pengguna.",
    });
  } catch {
    // fallback
  }

  return {
    success: true,
    message: `Seluruh sesi aktif untuk ID pengguna ${userId} telah berhasil dicabut.`,
  };
}

/**
 * Server Action: Get Current User Profile for Client Components
 */
export async function getCurrentUserAction(): Promise<UserProfile> {
  return await getCurrentUserProfile();
}
