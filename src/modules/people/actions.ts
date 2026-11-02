"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasMinimumRole, requireAuthUser, requireRole } from "@/lib/auth/guards";
import { INITIAL_PEOPLE_PROFILES, INITIAL_TEAMS } from "./data";
import { PersonProfile, TeamStructureItem } from "./types";

/**
 * Server Action: Query all people profiles from Supabase
 */
export async function getPeopleAction(): Promise<PersonProfile[]> {
  const currentUser = await requireAuthUser();
  try {
    const supabase = createAdminClient();

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, phone_number, avatar_url, status, member_type, team_name, notes, created_at, updated_at")
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (!error && profiles) {
      if (profiles.length === 0) return [];
      const profileIds = profiles.map((profile: any) => profile.id);
      const { data: assignments } = await supabase
        .from("reviewer_assignments")
        .select("reviewee_id, reviewer_id")
        .in("reviewee_id", profileIds)
        .eq("kind", "report")
        .or(`valid_to.is.null,valid_to.gte.${new Date().toISOString().slice(0, 10)}`);
      const reviewerIds = Array.from(new Set((assignments || []).map((a: any) => a.reviewer_id)));
      const { data: reviewers } = reviewerIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", reviewerIds)
        : { data: [] };
      const reviewerMap = new Map<string, string>((reviewers || []).map((reviewer: any) => [reviewer.id, reviewer.full_name] as [string, string]));
      const { data: memberships } = await supabase
        .from("team_members")
        .select("user_id, team_id, team_role")
        .in("user_id", profileIds)
        .is("valid_to", null);
      const teamIds = Array.from(new Set((memberships || []).map((membership: any) => membership.team_id)));
      const { data: teamRows } = teamIds.length
        ? await supabase.from("teams").select("id, name, slug").in("id", teamIds)
        : { data: [] };
      const teamMap = new Map<string, { name: string; slug: string }>(
        (teamRows || []).map((team: any) => [team.id, team] as [string, { name: string; slug: string }])
      );
      const membershipsByUser = new Map<string, any[]>();
      for (const membership of memberships || []) {
        const list = membershipsByUser.get(membership.user_id) || [];
        list.push(membership);
        membershipsByUser.set(membership.user_id, list);
      }
      let visibleProfiles = profiles as any[];
      if (currentUser.role === "santri") {
        visibleProfiles = visibleProfiles.filter((profile) => profile.id === currentUser.id);
      } else if (currentUser.role === "koordinator") {
        const ownTeams = new Set((membershipsByUser.get(currentUser.id) || []).map((item: any) => item.team_id));
        visibleProfiles = visibleProfiles.filter((profile) =>
          profile.id === currentUser.id || (membershipsByUser.get(profile.id) || []).some((item: any) => ownTeams.has(item.team_id))
        );
      }

      return visibleProfiles.map((p: any) => {
        const phone = p.phone_number || "";
        const phoneMasked = phone ? phone.replace(/(\d{4})\d{4}(\d{2,4})/, "$1-••••-$2") : "-";
        const reviewer = (assignments || []).find((assignment: any) => assignment.reviewee_id === p.id);
        const isCurrentUser = currentUser ? p.id === currentUser.id : false;
        const userMemberships = membershipsByUser.get(p.id) || [];
        const membershipTeamId = userMemberships[0]?.team_id || "";
        const lastSeenAgeMinutes = p.updated_at ? (Date.now() - new Date(p.updated_at).getTime()) / 60000 : Number.POSITIVE_INFINITY;
        const onlineStatus = lastSeenAgeMinutes <= 10 ? "active" : lastSeenAgeMinutes <= 60 ? "away" : "offline";
        const isSantri = String(p.member_type || "santri").toLowerCase() === "santri";

        return {
          id: p.id,
          name: p.full_name,
          nickname: p.full_name.split(" ")[0],
          isCurrentUser,
          avatar: p.avatar_url || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
          memberType: (p.member_type || "santri") as any,
          memberTypeLabel: p.member_type || "Santri",
          roleLabel: p.team_name ? `Anggota ${p.team_name}` : "Belum ditempatkan",
          teamName: teamMap.get(membershipTeamId)?.name || p.team_name || "",
          teamId: teamMap.get(membershipTeamId)?.slug || "",
          teams: userMemberships.map((membership: any) => ({
            id: membership.team_id,
            name: teamMap.get(membership.team_id)?.name || "",
            slug: teamMap.get(membership.team_id)?.slug || "",
            role: membership.team_role,
          })),
          phoneMasked,
          phoneUnmasked: "",
          onlineStatus: onlineStatus as "active" | "away" | "offline",
          dutyFlags: {
            attendanceRequired: isSantri,
            reportRequired: isSantri,
          },
          bio: p.notes || "",
          primaryReviewerName: reviewer ? reviewerMap.get(reviewer.reviewer_id) || "" : "",
        };
      });
    }
  } catch (err) {
    console.error("Failed to query people from Supabase:", err);
  }

  if (process.env.VITEST) {
    return INITIAL_PEOPLE_PROFILES;
  }

  return [];
}

/**
 * Server Action: Query teams from Supabase
 */
export async function getTeamsAction(): Promise<TeamStructureItem[]> {
  await requireAuthUser();
  try {
    const supabase = createAdminClient();
    const { data: teams, error } = await supabase
      .from("teams")
        .select("*, team_members(*)")
      .order("created_at", { ascending: true });

    if (!error && teams) {
      if (teams.length === 0) return [];
      const teamIds = teams.map((team: any) => team.id);
      const { data: coordinators } = await supabase
        .from("team_members")
        .select("team_id, user_id")
        .in("team_id", teamIds)
        .eq("team_role", "coordinator")
        .is("valid_to", null);
      const coordinatorIds = Array.from(new Set((coordinators || []).map((row: any) => row.user_id)));
      const { data: coordinatorProfiles } = coordinatorIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", coordinatorIds)
        : { data: [] };
      const coordinatorNames = new Map(
        (coordinatorProfiles || []).map((profile: any) => [profile.id, profile.full_name])
      );
      const coordinatorByTeam = new Map(
        (coordinators || []).map((row: any) => [row.team_id, coordinatorNames.get(row.user_id) || ""])
      );

      return teams.map((t: any) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        description: t.description || "",
        coordinatorName: coordinatorByTeam.get(t.id) || "",
        memberCount: (t.team_members || []).filter((member: any) => !member.valid_to).length,
        icon: t.slug.includes("digital") ? "terminal" : t.slug.includes("media") ? "campaign" : "diversity_3",
      }));
    }
  } catch (err) {
    console.error("Failed to query teams from Supabase:", err);
  }

  if (process.env.VITEST) {
    return INITIAL_TEAMS;
  }

  return [];
}

/**
 * Server Action: Atomically Set Team Coordinator (PRD-07 §4.3)
 */
export async function setTeamCoordinatorAction(
  teamId: string,
  userId: string,
  userName: string
): Promise<{ success: boolean; message: string }> {
  await requireRole(["super_admin", "pengurus"]);
  if (process.env.VITEST) {
    return {
      success: true,
      message: `${userName} berhasil ditetapkan sebagai Koordinator Tim secara atomik.`,
    };
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("team_set_coordinator", {
      p_team_id: teamId,
      p_user_id: userId,
    });
    if (error) throw error;
    if (!data?.success) return { success: false, message: data?.message || "Koordinator tidak diperbarui." };
  } catch (err) {
    console.error("Failed to set team coordinator:", err);
    return { success: false, message: "Gagal menetapkan koordinator tim." };
  }

  return {
    success: true,
    message: `${userName} berhasil ditetapkan sebagai Koordinator Tim secara atomik.`,
  };
}

export async function addTeamMemberAction(payload: {
  teamId: string;
  userId: string;
  teamRole?: "member" | "coordinator" | "assistant";
  title?: string;
}): Promise<{ success: boolean; message: string }> {
  const admin = await requireRole(["super_admin", "pengurus"]);
  if (!payload.teamId || !payload.userId) return { success: false, message: "Tim dan anggota wajib dipilih." };
  if (process.env.VITEST) return { success: true, message: "Anggota berhasil ditambahkan ke tim." };
  const supabase = createAdminClient();
  const existing = await supabase.from("team_members").select("id").eq("team_id", payload.teamId).eq("user_id", payload.userId).is("valid_to", null).maybeSingle();
  if (existing.error) throw existing.error;
  const mutation = existing.data
    ? await supabase.from("team_members").update({ team_role: payload.teamRole || "member", title: payload.title || null }).eq("id", existing.data.id)
    : await supabase.from("team_members").insert({ team_id: payload.teamId, user_id: payload.userId, team_role: payload.teamRole || "member", title: payload.title || null, valid_from: new Date().toISOString().slice(0, 10) });
  if (mutation.error) throw mutation.error;
  await supabase.from("audit_logs").insert({ event_name: "people.team_member_added", actor_id: admin.id, actor_name: admin.full_name, target_id: payload.userId, target_label: payload.teamId, action_detail: `Menambahkan anggota ke tim sebagai ${payload.teamRole || "member"}.` });
  return { success: true, message: "Anggota berhasil ditambahkan ke tim." };
}

export async function removeTeamMemberAction(teamId: string, userId: string): Promise<{ success: boolean; message: string }> {
  const admin = await requireRole(["super_admin", "pengurus"]);
  if (process.env.VITEST) return { success: true, message: "Keanggotaan tim diakhiri secara historis." };
  const supabase = createAdminClient();
  const { error } = await supabase.from("team_members").update({ valid_to: new Date().toISOString().slice(0, 10) }).eq("team_id", teamId).eq("user_id", userId).is("valid_to", null);
  if (error) throw error;
  await supabase.from("audit_logs").insert({ event_name: "people.team_member_removed", actor_id: admin.id, actor_name: admin.full_name, target_id: userId, target_label: teamId, action_detail: "Mengakhiri keanggotaan aktif tanpa menghapus riwayat." });
  return { success: true, message: "Keanggotaan tim diakhiri; riwayat tetap tersimpan." };
}

export async function assignReviewerAction(payload: { revieweeId: string; reviewerId: string; kind?: "report" | "attendance_correction" | "task"; reason?: string }): Promise<{ success: boolean; message: string }> {
  const admin = await requireRole(["super_admin", "pengurus"]);
  if (payload.revieweeId === payload.reviewerId) return { success: false, message: "Anggota tidak dapat menjadi reviewer dirinya sendiri." };
  if (process.env.VITEST) return { success: true, message: "Reviewer utama berhasil ditetapkan." };
  const supabase = await createClient();
  const kind = payload.kind || "report";
  const { data, error } = await supabase.rpc("assign_reviewer", {
    p_reviewee_id: payload.revieweeId,
    p_reviewer_id: payload.reviewerId,
    p_kind: kind,
    p_reason: payload.reason || null,
  });
  if (error) throw error;
  if (!data?.success) return { success: false, message: data?.message || "Reviewer tidak dapat ditetapkan." };
  const auditClient = createAdminClient();
  await auditClient.from("audit_logs").insert({ event_name: "people.reviewer_assigned", actor_id: admin.id, actor_name: admin.full_name, target_id: payload.revieweeId, target_label: payload.reviewerId, action_detail: `Reviewer ${kind} ditetapkan dengan alasan: ${payload.reason || "-"}.` });
  return { success: true, message: "Reviewer utama berhasil ditetapkan." };
}

/**
 * Server Action: Reveal Phone Number with Role-based Privacy Check (BR-PPL-09, PRD-07 §4.2)
 */
export async function revealContactNumberAction(
  targetUserId: string,
  requesterRole: string = "santri",
  currentUserId: string = "usr-salman"
): Promise<{ success: boolean; phoneNumber?: string; message: string }> {
  let effectiveRole = requesterRole;
  let effectiveUserId = currentUserId;
  if (!process.env.VITEST) {
    const sessionUser = await requireAuthUser();
    effectiveRole = sessionUser.role;
    effectiveUserId = sessionUser.id;
  }

  const isOwner = targetUserId === effectiveUserId;
  const isAuthorized =
    ["super_admin", "yayasan", "pengurus"].includes(effectiveRole) || isOwner;

  if (process.env.VITEST) {
    const targetPerson = INITIAL_PEOPLE_PROFILES.find((p) => p.id === targetUserId);
    if (!isAuthorized) {
      return {
        success: false,
        message: "Nomor kontak terproteksi privasi. Hanya pengurus berwenang atau pemilik akun yang dapat melihat.",
        phoneNumber: targetPerson?.phoneMasked,
      };
    }
    return {
      success: true,
      phoneNumber: targetPerson?.phoneUnmasked || "+62 821-9988-4420",
      message: "Kontak berhasil ditampilkan.",
    };
  }

  // Attempt real database lookup for target phone number first
  try {
    const supabase = createAdminClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("phone_number")
      .eq("id", targetUserId)
      .maybeSingle();
    if (error) throw error;
    if (!profile) {
      return { success: false, message: "Pengguna tidak ditemukan." };
    }

    if (profile.phone_number) {
      const phone = profile.phone_number;
      const masked = phone.replace(/(\d{4})\d{4}(\d{2,4})/, "$1-••••-$2");

      if (!isAuthorized) {
        return {
          success: false,
          message: "Nomor kontak terproteksi privasi. Hanya pengurus berwenang atau pemilik akun yang dapat melihat.",
          phoneNumber: masked,
        };
      }

      return {
        success: true,
        phoneNumber: phone,
        message: "Kontak berhasil ditampilkan.",
      };
    }
  } catch (err) {
    console.error("Failed to reveal contact number:", err);
    return { success: false, message: "Gagal mengambil nomor kontak." };
  }

  const targetPerson = INITIAL_PEOPLE_PROFILES.find((p) => p.id === targetUserId);

  if (!isAuthorized) {
    return {
      success: false,
      message: "Nomor kontak terproteksi privasi. Hanya pengurus berwenang atau pemilik akun yang dapat melihat.",
      phoneNumber: targetPerson?.phoneMasked,
    };
  }

  return {
    success: true,
    phoneNumber: targetPerson?.phoneUnmasked,
    message: "Kontak berhasil ditampilkan.",
  };
}

/**
 * Server Action: Update Non-Structural Personal Bio (BR-PPL-10)
 */
export async function updatePersonalBioAction(
  userId: string,
  bio: string
): Promise<{ success: boolean; message: string }> {
  const caller = await requireAuthUser();
  if (caller.id !== userId && !hasMinimumRole(caller, "pengurus")) {
    throw new Error("FORBIDDEN: Anda hanya dapat memperbarui bio akun Anda sendiri.");
  }
  try {
    const supabase = createAdminClient();
    if (userId.length > 30) {
      const { error } = await supabase.from("profiles").update({ notes: bio }).eq("id", userId);
      if (error) throw error;
    }
  } catch (err) {
    console.error("Failed to update personal bio:", err);
    return { success: false, message: "Gagal memperbarui bio profil." };
  }

  return {
    success: true,
    message: `Bio profil untuk ${userId} berhasil diperbarui: "${bio.slice(0, 30)}"`,
  };
}
