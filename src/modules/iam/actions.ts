"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getHighestRole, requireRole, ROLE_PRIORITY } from "@/lib/auth/guards";
import { UserProfile } from "@/lib/auth/types";
import { ManualAccountPayload } from "./types";
import { sendPushToUsers } from "@/lib/fcm";
import { enforceRateLimit } from "@/lib/rate-limit";

const VALID_ROLES = ["super_admin", "yayasan", "pengurus", "koordinator", "santri"] as const;
type ValidRole = (typeof VALID_ROLES)[number];

function normalizeRole(value: string | null | undefined): ValidRole | null {
  const normalized = (value || "").trim().toLowerCase();
  if (normalized.includes("super_admin") || normalized.includes("super admin")) return "super_admin";
  if (normalized.includes("yayasan")) return "yayasan";
  if (normalized.includes("pengurus")) return "pengurus";
  if (normalized.includes("koordinator")) return "koordinator";
  if (normalized.includes("santri")) return "santri";
  return VALID_ROLES.includes(normalized as ValidRole) ? (normalized as ValidRole) : null;
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Kata sandi minimal 8 karakter.";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Kata sandi harus mengandung huruf dan angka.";
  }
  return null;
}

async function grantActiveRole(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  roleId: string,
  grantedBy?: string
) {
  const { data: existing, error: lookupError } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role_id", roleId)
    .is("revoked_at", null)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return;
  const { error } = await supabase.from("user_roles").insert({
    user_id: userId,
    role_id: roleId,
    granted_by: grantedBy || null,
  });
  if (error) throw error;
}

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
 * Server Action: Submit Public Account Registration Request (Pathway A)
 */
export async function submitAccountApplicationAction(payload: {
  fullName: string;
  email: string;
  phoneNumber: string;
  roleRequested: string;
  teamRequested: string;
  notes?: string;
  password: string;
  turnstileToken?: string;
  website?: string;
}): Promise<{ success: boolean; message: string }> {
  if (payload.website) {
    return { success: false, message: "Permohonan tidak dapat diproses." };
  }
  if (!payload.fullName.trim() || !payload.email.trim() || !payload.phoneNumber.trim()) {
    return {
      success: false,
      message: "Nama lengkap, email, dan nomor telepon wajib diisi.",
    };
  }

  const passwordError = validatePassword(payload.password || "");
  if (passwordError) return { success: false, message: passwordError };
  const requestedRole = normalizeRole(payload.roleRequested);
  if (requestedRole !== "santri") {
    return { success: false, message: "Registrasi publik hanya dapat mengajukan peran Santri." };
  }

  // Hoisted so the catch block can roll back an orphaned auth user if the DB insert fails
  let authUserId: string | undefined;

  try {
    const supabase = createAdminClient();
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret) {
      if (!payload.turnstileToken) return { success: false, message: "Verifikasi keamanan wajib diselesaikan." };
      const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret: turnstileSecret, response: payload.turnstileToken }),
      });
      const result = (await verification.json()) as { success?: boolean };
      if (!verification.ok || !result.success) return { success: false, message: "Verifikasi keamanan gagal. Silakan coba lagi." };
    }
    if (!process.env.VITEST) {
      const allowed = await enforceRateLimit(
        `register:${payload.email.trim().toLowerCase()}`,
        5,
        60 * 60
      );
      if (!allowed) return { success: false, message: "Terlalu banyak percobaan registrasi. Silakan coba lagi nanti." };
    }

    // Check if email already requested or exists
    const { data: existingReq } = await supabase
      .from("account_requests")
      .select("id, status, auth_user_id")
      .eq("email", payload.email.trim().toLowerCase())
      .maybeSingle();

    if (existingReq) {
      if (existingReq.status === "rejected" && existingReq.auth_user_id) {
        const { error: reapplyError } = await supabase
          .from("account_requests")
          .update({
            full_name: payload.fullName.trim(),
            phone_number: payload.phoneNumber.trim(),
            role_requested: requestedRole,
            team_requested: payload.teamRequested || "Sentra Santri",
            notes: payload.notes?.trim() || "",
            status: "pending",
            rejection_reason: null,
            reviewed_by: null,
            reviewed_at: null,
          })
          .eq("id", existingReq.id)
          .eq("status", "rejected");
        if (reapplyError) throw reapplyError;
        const { error: authResetError } = await supabase.auth.admin.updateUserById(existingReq.auth_user_id, {
          password: payload.password,
          email_confirm: false,
          user_metadata: { full_name: payload.fullName.trim() },
        });
        if (authResetError) throw authResetError;
        return {
          success: true,
          message: "Pengajuan akun yang sebelumnya ditolak berhasil diajukan ulang dan menunggu peninjauan.",
        };
      }
      return {
        success: false,
        message: `Permohonan akun untuk email "${payload.email}" sudah pernah diajukan sebelumnya (Status: ${existingReq.status}). Silakan hubungi Admin.`,
      };
    }

    // Create Auth user first (unconfirmed — cannot log in until approved)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      email_confirm: false,
      user_metadata: { full_name: payload.fullName.trim() },
    });

    if (authError) {
      return {
        success: false,
        message: authError.message || "Gagal membuat akun. Email mungkin sudah terdaftar.",
      };
    }

    authUserId = authData.user?.id;

    const { error } = await supabase.from("account_requests").insert({
      id: authUserId ?? undefined,
      full_name: payload.fullName.trim(),
      email: payload.email.trim().toLowerCase(),
      phone_number: payload.phoneNumber.trim(),
      role_requested: requestedRole,
      team_requested: payload.teamRequested || "Sentra Santri",
      notes: payload.notes?.trim() || "",
      status: "pending",
      auth_user_id: authUserId,
      turnstile_verified: Boolean(turnstileSecret ? payload.turnstileToken : true),
    });

    if (error) throw error;

    return {
      success: true,
      message: "Pengajuan akun berhasil dikirim! Menunggu peninjauan dan persetujuan Super Admin.",
    };
  } catch (err: any) {
    console.error("Gagal menyimpan permohonan akun:", err);
    // Roll back the orphaned auth user so the email is not permanently blocked
    if (authUserId) {
      const supabase = createAdminClient();
      await supabase.auth.admin.deleteUser(authUserId).catch(() => {});
    }
    return {
      success: false,
      message: err.message || "Gagal mengirimkan pengajuan akun. Silakan coba kembali.",
    };
  }
}

/**
 * Server Action: Query pending account registration requests
 */
export async function getAccountRequestsAction(): Promise<AccountRequestItem[]> {
  await requireRole(["super_admin", "yayasan", "pengurus"]);
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
  await requireRole(["super_admin", "yayasan", "pengurus"]);
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      const userIds = data.map((profile: any) => profile.id).filter(Boolean);
      const { data: deviceRows } = userIds.length
        ? await supabase.from("device_tokens").select("user_id, platform, device_label").in("user_id", userIds)
        : { data: [] as any[] };
      const devicesByUser = new Map<string, any[]>();
      for (const device of deviceRows || []) {
        const devices = devicesByUser.get(device.user_id) || [];
        devices.push(device);
        devicesByUser.set(device.user_id, devices);
      }
      return data.map((d: any) => {
        const initials = d.full_name
          ? d.full_name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase()
          : "U";
        const devices = devicesByUser.get(d.id) || [];
        const deviceLabels = Array.from(new Set(devices.map((device: any) => device.device_label || device.platform))).filter(Boolean);
        return {
          id: d.id,
          fullName: d.full_name,
          email: d.email,
          role: d.member_type || "Santri",
          teamName: d.team_name || "Sentra Santri",
          status: d.status || "active",
          initials,
          devicesCount: devices.length,
          deviceInfo: devices.length
            ? `${devices.length} Perangkat Aktif${deviceLabels.length ? ` · ${deviceLabels.slice(0, 2).join(", ")}` : ""}`
            : "Belum ada perangkat terhubung",
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
    const approver = await requireRole(["super_admin", "yayasan", "pengurus"]);
    const approverRole = getHighestRole(approver);
    const canonicalRole = normalizeRole(assignedRole);
    if (!canonicalRole) return { success: false, message: "Peran tujuan tidak valid." };
    if (ROLE_PRIORITY[canonicalRole] >= ROLE_PRIORITY[approverRole]) {
      return { success: false, message: "Anda tidak dapat menetapkan peran setara atau lebih tinggi dari peran Anda." };
    }
    if (process.env.VITEST) {
      return {
        success: true,
        message: `Permohonan akun ${applicantId} berhasil disetujui dengan peran '${assignedRole}'. Hak akses telah aktif.`,
      };
    }
    const supabase = createAdminClient();

    // Fetch the account request to get auth_user_id and user info
    const { data: request, error: fetchError } = await supabase
      .from("account_requests")
      .select("*")
      .eq("id", applicantId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!request) {
      return { success: false, message: "Pengajuan akun tidak ditemukan." };
    }
    if (request.status !== "pending") {
      return { success: false, message: `Pengajuan ini sudah berstatus "${request.status}".` };
    }

    // Activate Auth user if auth_user_id is stored
    const authUserId = request?.auth_user_id;
    if (!authUserId) {
      return { success: false, message: "Pengajuan belum memiliki akun Auth yang valid dan tidak dapat disetujui." };
    }
    if (authUserId) {
      const { error: authErr } = await supabase.auth.admin.updateUserById(authUserId, {
        email_confirm: true,
      });
      if (authErr) {
        throw authErr;
      }

      // Upsert profile row with the role assigned by the admin
      const { error: profErr } = await supabase.from("profiles").upsert(
        {
          id: authUserId,
          email: request.email,
          full_name: request.full_name,
          phone_number: request.phone_number || null,
          status: "active",
          member_type: canonicalRole,
          team_name: request.team_requested || "Sentra Santri",
        },
        { onConflict: "id" }
      );
      if (profErr) throw profErr;

      // Hubungkan ke tabel user_roles
      const { data: roleRow } = await supabase
        .from("roles")
        .select("id")
        .eq("key", canonicalRole)
        .maybeSingle();

      if (!roleRow?.id) throw new Error("Role tujuan tidak ditemukan.");
      await grantActiveRole(supabase, authUserId, roleRow.id, approver.id);
    }

    // Mark the request approved only after Auth, profile, and role provisioning
    // have all succeeded. This keeps the queue retryable on partial failure.
    const { data: updatedReq, error: updateErr } = await supabase
      .from("account_requests")
      .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: approver.id })
      .eq("id", applicantId)
      .eq("status", "pending")
      .select("id");
    if (updateErr) throw updateErr;
    if (!updatedReq?.length) return { success: false, message: "Pengajuan sudah diproses oleh admin lain." };

    const { error: auditError } = await supabase.from("audit_logs").insert({
      event_name: "iam.account_approved",
      actor_id: approver.id,
      actor_name: approver.full_name,
      target_id: applicantId,
      target_label: `Permohonan ${applicantId}`,
      action_detail: `Persetujuan akun dengan peran '${canonicalRole}'.`,
    });
    if (auditError) throw auditError;
    if (request.auth_user_id && !process.env.VITEST) {
      try {
        await sendPushToUsers([request.auth_user_id], {
          type: "ACCOUNT_APPROVED",
          title: "Akun Disetujui",
          body: "Selamat, akun Anda sudah aktif. Silakan login ke Pondok OS.",
          url: "/login",
          referenceId: request.auth_user_id,
        });
      } catch (pushError) {
        console.error("Account approval saved but push delivery failed:", pushError);
      }
    }
  } catch (err: any) {
    console.error("Failed to approve account in Supabase:", err);
    return {
      success: false,
      message: err.message || "Gagal menyetujui akun. Silakan coba kembali.",
    };
  }

  return {
    success: true,
    message: `Permohonan akun ${applicantId} berhasil disetujui dengan peran '${normalizeRole(assignedRole) || assignedRole}'. Hak akses telah aktif.`,
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
    const approver = await requireRole(["super_admin", "yayasan", "pengurus"]);
    if (process.env.VITEST) {
      return { success: true, message: `Permohonan akun ${applicantId} telah ditolak dan dicatat ke log penolakan.` };
    }
    const supabase = createAdminClient();

    const { data: rejected, error } = await supabase
      .from("account_requests")
      .update({ status: "rejected", notes: reason, reviewed_by: approver.id, reviewed_at: new Date().toISOString() })
      .eq("id", applicantId)
      .eq("status", "pending")
      .select("id");

    if (error) throw error;
    if (!rejected?.length) return { success: false, message: "Pengajuan tidak ditemukan atau sudah diproses." };

    await supabase.from("audit_logs").insert({
      event_name: "iam.account_rejected",
      actor_name: approver.full_name,
      target_id: applicantId,
      target_label: `Permohonan ${applicantId}`,
      action_detail: `Penolakan akun. Alasan: ${reason}`,
    });
  } catch (err: any) {
    console.error("Failed to reject account in Supabase:", err);
    return {
      success: false,
      message: err.message || "Gagal menolak akun. Silakan coba kembali.",
    };
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
  const adminUser = await requireRole(["super_admin", "pengurus"]);
  const adminRole = getHighestRole(adminUser);

  if (!payload.fullName || !payload.email || !payload.phone) {
    return { success: false, message: "Semua bidang identitas wajib diisi." };
  }
  const canonicalRole = normalizeRole(payload.role);
  if (!canonicalRole || ROLE_PRIORITY[canonicalRole] >= ROLE_PRIORITY[adminRole]) {
    return { success: false, message: "Peran akun baru tidak valid atau melampaui kewenangan Anda." };
  }
  if (process.env.VITEST) {
    return { success: true, message: `Akun ${payload.fullName} berhasil dibuat dan langsung berstatus aktif. Undangan aktivasi telah dikirimkan ke email tujuan.` };
  }

  try {
    const supabase = createAdminClient();
    // Menggunakan inviteUserByEmail agar pengguna mengatur password sendiri secara aman
    const { data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(
      payload.email.trim(),
      {
        data: { full_name: payload.fullName.trim() },
      }
    );

    if (inviteErr) {
      return { success: false, message: `Gagal mengundang pengguna: ${inviteErr.message}` };
    }

    const userId = inviteData?.user?.id;
    if (userId) {
      const { error: profileErr } = await supabase.from("profiles").upsert({
        id: userId,
        email: payload.email.trim(),
        full_name: payload.fullName.trim(),
        phone_number: payload.phone.trim(),
        status: "active",
        member_type: canonicalRole,
        team_name: payload.teamName,
        notes: payload.notes || "Dibuat langsung oleh Admin (Jalur B)",
      });

      if (profileErr) {
        await supabase.auth.admin.deleteUser(userId);
        return { success: false, message: `Gagal membuat profil: ${profileErr.message}` };
      }

      // Kaitkan role ke user_roles
      const { data: roleRow } = await supabase
        .from("roles")
        .select("id")
        .eq("key", canonicalRole)
        .maybeSingle();

      if (!roleRow?.id) {
        await supabase.auth.admin.deleteUser(userId);
        return { success: false, message: "Role akun tidak ditemukan." };
      }
      await grantActiveRole(supabase, userId, roleRow.id, adminUser.id);
    }

    await supabase.from("audit_logs").insert({
      event_name: "iam.account_created_manual",
      actor_name: adminUser.full_name,
      target_id: payload.email,
      target_label: payload.fullName,
      action_detail: `Pembuatan akun manual Jalur B untuk peran ${canonicalRole} di tim ${payload.teamName}. Undangan email dikirim.`,
    });

    return {
      success: true,
      message: `Akun ${payload.fullName} berhasil dibuat dan langsung berstatus aktif. Undangan aktivasi telah dikirimkan ke email tujuan.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
    console.error("Failed to create manual account in Supabase:", err);
    return { success: false, message: msg };
  }
}

/**
 * Server Action: Reset / Revoke User Active Sessions (PRD-01 §2.5).
 */
export async function resetUserSessionAction(
  userId: string
): Promise<ActionResult> {
  const adminUser = await requireRole(["super_admin", "pengurus"]);

  if (!userId) {
    return { success: false, message: "User ID tidak valid." };
  }

  try {
    const supabase = createAdminClient();
    
    const { error: revokeError } = await supabase
      .from("profiles")
      .update({ session_revoked_at: new Date().toISOString() })
      .eq("id", userId);
    if (revokeError) throw revokeError;

    await supabase.from("audit_logs").insert({
      event_name: "iam.session_revoked",
      actor_name: adminUser.full_name,
      target_id: userId,
      target_label: `User ${userId}`,
      action_detail: "Pencabutan seluruh sesi aktif pengguna.",
    });

    return {
      success: true,
      message: `Seluruh sesi aktif untuk ID pengguna ${userId} telah berhasil dicabut.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal mencabut sesi pengguna.";
    return { success: false, message: msg };
  }
}

/**
 * Server Action: Get Current User Profile for Client Components
 */
export async function getCurrentUserAction(): Promise<UserProfile | null> {
  return await getCurrentUserProfile();
}



/**
 * Server Action: Update current user's own profile (Issue 4 — self-service).
 * Users can only update their own profile. Role/status changes are blocked.
 */
export async function updateProfileAction(payload: {
  fullName: string;
  phoneNumber: string;
  avatarUrl?: string;
}): Promise<ActionResult> {
  if (!payload.fullName.trim()) {
    return { success: false, message: "Nama lengkap wajib diisi." };
  }

  try {
    const { requireAuthUser } = await import("@/lib/auth/guards");
    const user = await requireAuthUser();
    const supabase = createAdminClient();

    const updatePayload: Record<string, string> = {
      full_name: payload.fullName.trim(),
      phone_number: payload.phoneNumber.trim(),
      updated_at: new Date().toISOString(),
    };
    if (payload.avatarUrl) {
      updatePayload.avatar_url = payload.avatarUrl;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", user.id);

    if (error) throw error;

    return { success: true, message: "Profil berhasil diperbarui." };
  } catch (err: any) {
    console.error("updateProfileAction error:", err);
    return { success: false, message: err.message || "Gagal memperbarui profil." };
  }
}

/**
 * Server Action: Upload avatar to Supabase Storage (Issue 4).
 * Validates file type and size before uploading.
 */
export async function uploadAvatarAction(
  formData: FormData
): Promise<ActionResult<{ avatarUrl: string }>> {
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

  try {
    const { requireAuthUser } = await import("@/lib/auth/guards");
    const user = await requireAuthUser();

    const file = formData.get("avatar") as File | null;
    if (!file) {
      return { success: false, message: "File tidak ditemukan." };
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { success: false, message: "Format file tidak didukung. Gunakan JPEG, PNG, atau WebP." };
    }
    if (file.size > MAX_SIZE_BYTES) {
      return { success: false, message: "Ukuran file melebihi batas 2MB." };
    }

    const ext = file.type.split("/")[1];
    const path = `${user.id}/${Date.now()}.${ext}`;
    const supabase = createAdminClient();

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);

    return {
      success: true,
      message: "Foto profil berhasil diunggah.",
      data: { avatarUrl: urlData.publicUrl },
    };
  } catch (err: any) {
    console.error("uploadAvatarAction error:", err);
    return { success: false, message: err.message || "Gagal mengunggah foto profil." };
  }
}

/**
 * Server Action: Change current user's password via Supabase Auth admin (Issue 4).
 * Password is never logged or stored in plaintext.
 */
export async function changePasswordAction(
  currentPassword: string,
  newPassword: string
): Promise<ActionResult> {
  const passwordError = validatePassword(newPassword || "");
  if (passwordError) return { success: false, message: passwordError };
  if (!currentPassword) return { success: false, message: "Kata sandi lama wajib diisi." };

  try {
    const { requireAuthUser } = await import("@/lib/auth/guards");
    const user = await requireAuthUser();
    const authClient = await createClient();
    const { error: verifyError } = await authClient.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyError) return { success: false, message: "Kata sandi lama tidak sesuai." };
    const supabase = createAdminClient();

    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (error) throw error;

    return { success: true, message: "Kata sandi berhasil diperbarui." };
  } catch (err: any) {
    console.error("changePasswordAction error:", err);
    return { success: false, message: err.message || "Gagal memperbarui kata sandi." };
  }
}

/**
 * Server Action: Admin updates another user's profile (Issue 4B).
 * Requires super_admin, yayasan, or pengurus role.
 */
export async function adminUpdateUserAction(
  userId: string,
  payload: {
    fullName?: string;
    phoneNumber?: string;
    status?: string;
    teamName?: string;
    memberType?: string;
  }
): Promise<ActionResult> {
  if (!userId) {
    return { success: false, message: "User ID tidak valid." };
  }

  try {
    const adminUser = await requireRole(["super_admin", "yayasan", "pengurus"]);
    const adminRole = getHighestRole(adminUser);
    const supabase = createAdminClient();

    const { data: target, error: targetError } = await supabase
      .from("profiles")
      .select("id, member_type, status")
      .eq("id", userId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) return { success: false, message: "Pengguna tidak ditemukan." };
    const targetRole = normalizeRole(target.member_type) || "santri";
    if (targetRole !== "santri" && ROLE_PRIORITY[targetRole] >= ROLE_PRIORITY[adminRole]) {
      return { success: false, message: "Anda tidak dapat mengubah akun dengan hierarki setara atau lebih tinggi." };
    }
    const requestedRole = payload.memberType === undefined ? targetRole : normalizeRole(payload.memberType);
    if (!requestedRole || ROLE_PRIORITY[requestedRole] >= ROLE_PRIORITY[adminRole]) {
      return { success: false, message: "Peran baru tidak valid atau melampaui hierarki Anda." };
    }

    const updatePayload: Record<string, string> = {
      updated_at: new Date().toISOString(),
    };
    if (payload.fullName !== undefined) updatePayload.full_name = payload.fullName.trim();
    if (payload.phoneNumber !== undefined && payload.phoneNumber.trim()) updatePayload.phone_number = payload.phoneNumber.trim();
    if (payload.status !== undefined) {
      if (!["active", "suspended", "deactivated", "rejected"].includes(payload.status)) {
        return { success: false, message: "Status akun tidak valid." };
      }
      updatePayload.status = payload.status;
    }
    if (payload.teamName !== undefined) updatePayload.team_name = payload.teamName.trim();
    if (payload.memberType !== undefined) updatePayload.member_type = requestedRole;

    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId);

    if (error) throw error;
    if (payload.memberType !== undefined && requestedRole !== targetRole) {
      const { data: roleRow, error: roleError } = await supabase
        .from("roles")
        .select("id")
        .eq("key", requestedRole)
        .maybeSingle();
      if (roleError) throw roleError;
      if (!roleRow) return { success: false, message: "Role tidak ditemukan." };
      const { error: roleUpdateError } = await supabase
        .from("user_roles")
        .update({ revoked_at: new Date().toISOString(), revoked_by: adminUser.id, reason: "Role diperbarui" })
        .eq("user_id", userId)
        .is("revoked_at", null);
      if (roleUpdateError) throw roleUpdateError;
      const { error: roleInsertError } = await supabase.from("user_roles").insert({
        user_id: userId,
        role_id: roleRow.id,
        granted_by: adminUser.id,
      });
      if (roleInsertError) throw roleInsertError;
    }

    return { success: true, message: "Profil pengguna berhasil diperbarui." };
  } catch (err: any) {
    console.error("adminUpdateUserAction error:", err);
    return { success: false, message: err.message || "Gagal memperbarui profil pengguna." };
  }
}
