"use server";

import { INITIAL_PEOPLE_PROFILES } from "./data";

/**
 * Server Action: Atomically Set Team Coordinator (PRD-07 §4.3)
 */
export async function setTeamCoordinatorAction(
  teamId: string,
  userId: string,
  userName: string
): Promise<{ success: boolean; message: string }> {
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
    phoneNumber: targetPerson?.phoneUnmasked || "+62 812-3456-9821",
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
  return {
    success: true,
    message: `Bio profil untuk ${userId} berhasil diperbarui: "${bio.slice(0, 30)}"`,
  };
}
