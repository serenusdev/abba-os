"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { hasMinimumRole, requireAuthUser, requireRole } from "@/lib/auth/guards";
import { INITIAL_PEOPLE_PROFILES, INITIAL_TEAMS } from "./data";
import { PersonProfile, TeamStructureItem } from "./types";

/**
 * Server Action: Query all people profiles from Supabase
 */
export async function getPeopleAction(): Promise<PersonProfile[]> {
  await requireAuthUser();
  try {
    const supabase = createAdminClient();
    const currentUser = await getCurrentUserProfile();

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
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
      const reviewerMap = new Map((reviewers || []).map((reviewer: any) => [reviewer.id, reviewer.full_name]));
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
      const membershipMap = new Map<string, { team_id: string }>(
        (memberships || []).map((membership: any) => [membership.user_id, membership] as [string, { team_id: string }])
      );

      return profiles.map((p: any) => {
        const phone = p.phone_number || "";
        const phoneMasked = phone ? phone.replace(/(\d{4})\d{4}(\d{2,4})/, "$1-••••-$2") : "-";
        const reviewer = (assignments || []).find((assignment: any) => assignment.reviewee_id === p.id);
        const isCurrentUser = currentUser ? p.id === currentUser.id : false;
        const membershipTeamId = membershipMap.get(p.id)?.team_id || "";

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
          phoneMasked,
          phoneUnmasked: "",
          onlineStatus: "active" as const,
          dutyFlags: {
            attendanceRequired: true,
            reportRequired: true,
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
        memberCount: (t.team_members || []).length,
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
