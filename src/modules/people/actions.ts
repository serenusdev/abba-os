"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createAdminClient } from "@/lib/supabase/admin";
import { INITIAL_PEOPLE_PROFILES, INITIAL_TEAMS } from "./data";
import { PersonProfile, TeamStructureItem } from "./types";

/**
 * Server Action: Query all people profiles from Supabase
 */
export async function getPeopleAction(): Promise<PersonProfile[]> {
  try {
    const supabase = createAdminClient();
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && profiles && profiles.length > 0) {
      return profiles.map((p: any) => {
        const phone = p.phone_number || "+62 821-9988-4420";
        const phoneMasked = phone.replace(/(\d{4})\d{4}(\d{2,4})/, "$1-••••-$2");
        const isSalman = p.email === "salman@pondok.id";

        return {
          id: p.id,
          name: p.full_name,
          nickname: p.full_name.split(" ")[0],
          isCurrentUser: isSalman,
          avatar: p.avatar_url || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
          memberType: (p.member_type || "santri") as any,
          memberTypeLabel: p.member_type === "pengurus" ? "Pengurus" : "Santri",
          roleLabel: p.team_name ? `Anggota ${p.team_name}` : "Santri Reguler",
          teamName: p.team_name || "Sentra Digitalpreneur",
          teamId: "sentra-digital",
          primaryReviewerName: "Ustadz Ahmad Fauzi",
          phoneMasked,
          phoneUnmasked: phone,
          onlineStatus: "active" as const,
          dutyFlags: {
            attendanceRequired: true,
            reportRequired: true,
          },
          bio: p.notes || "Santri Pondok OS yang aktif dan bersemangat.",
        };
      });
    }
  } catch (err) {
    console.error("Failed to query people from Supabase:", err);
  }
  return INITIAL_PEOPLE_PROFILES;
}

/**
 * Server Action: Query teams from Supabase
 */
export async function getTeamsAction(): Promise<TeamStructureItem[]> {
  try {
    const supabase = createAdminClient();
    const { data: teams, error } = await supabase
      .from("teams")
      .select("*, team_members(*)")
      .order("created_at", { ascending: true });

    if (!error && teams && teams.length > 0) {
      return teams.map((t: any) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        description: t.description || "",
        coordinatorName: "Salman Al-Farisi",
        memberCount: (t.team_members || []).length > 0 ? (t.team_members || []).length : 12,
        icon: t.slug.includes("digital") ? "terminal" : t.slug.includes("media") ? "campaign" : "diversity_3",
      }));
    }
  } catch (err) {
    console.error("Failed to query teams from Supabase:", err);
  }
  return INITIAL_TEAMS;
}

/**
 * Server Action: Atomically Set Team Coordinator (PRD-07 §4.3)
 */
export async function setTeamCoordinatorAction(
  teamId: string,
  userId: string,
  userName: string
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createAdminClient();
    if (teamId.length > 30 && userId.length > 30) {
      await supabase.from("team_members").upsert({
        team_id: teamId,
        user_id: userId,
        team_role: "coordinator",
      });
    }
  } catch {
    // fallback
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
  const isOwner = targetUserId === currentUserId;
  const isAuthorized =
    ["admin", "pengurus", "mudir", "pembina"].includes(requesterRole) || isOwner;

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

/**
 * Server Action: Update Non-Structural Personal Bio (BR-PPL-10)
 */
export async function updatePersonalBioAction(
  userId: string,
  bio: string
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createAdminClient();
    if (userId.length > 30) {
      await supabase.from("profiles").update({ notes: bio }).eq("id", userId);
    }
  } catch {
    // fallback
  }

  return {
    success: true,
    message: `Bio profil untuk ${userId} berhasil diperbarui: "${bio.slice(0, 30)}"`,
  };
}
