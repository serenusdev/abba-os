"use client";

import * as React from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  getCurrentUserAction,
  updateProfileAction,
  uploadAvatarAction,
  changePasswordAction,
} from "@/modules/iam/actions";
import { UserProfile } from "@/lib/auth/types";

export default function ProfileSettingsPage() {
  const [currentUser, setCurrentUser] = React.useState<UserProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = React.useState(true);

  // Profile form
  const [fullName, setFullName] = React.useState("");
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [profileMsg, setProfileMsg] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);
  const [passwordMsg, setPasswordMsg] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  React.useEffect(() => {
    getCurrentUserAction()
      .then((user) => {
        setCurrentUser(user);
        if (user) {
          setFullName(user.full_name || "");
          setPhoneNumber(user.phone_number || "");
          setAvatarUrl(user.avatar_url || null);
        }
      })
      .finally(() => setIsLoadingAuth(false));
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setAvatarFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setAvatarPreview(null);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setIsSavingProfile(true);

    let finalAvatarUrl = avatarUrl || undefined;

    // Upload avatar first if a new file was chosen
    if (avatarFile) {
      const fd = new FormData();
      fd.append("avatar", avatarFile);
      const uploadRes = await uploadAvatarAction(fd);
      if (!uploadRes.success || !uploadRes.data) {
        setProfileMsg({ type: "error", text: uploadRes.message });
        setIsSavingProfile(false);
        return;
      }
      finalAvatarUrl = uploadRes.data.avatarUrl;
      setAvatarUrl(finalAvatarUrl);
      setAvatarPreview(null);
      setAvatarFile(null);
    }

    const res = await updateProfileAction({
      fullName,
      phoneNumber,
      avatarUrl: finalAvatarUrl,
    });

    setProfileMsg({ type: res.success ? "success" : "error", text: res.message });
    setIsSavingProfile(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 8) {
      setPasswordMsg({ type: "error", text: "Kata sandi minimal 8 karakter." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Konfirmasi kata sandi tidak cocok." });
      return;
    }

    setIsChangingPassword(true);
    const res = await changePasswordAction(currentPassword, newPassword);
    setPasswordMsg({ type: res.success ? "success" : "error", text: res.message });
    if (res.success) {
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
    }
    setIsChangingPassword(false);
  };

  if (isLoadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3">
        <LoadingSpinner size="lg" />
        <p className="font-body-sm text-sm text-muted-foreground">Memuat profil...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[350px]">
        <p className="text-muted-foreground text-sm">Sesi tidak ditemukan. Silakan masuk kembali.</p>
      </div>
    );
  }

  const displayAvatar = avatarPreview || avatarUrl;
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "?";

  return (
    <div className="w-full max-w-2xl mx-auto pb-12 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="font-headline-sm text-[22px] font-bold text-on-surface tracking-tight">
          Pengaturan Profil
        </h1>
        <p className="font-body-sm text-[13px] text-muted-foreground mt-0.5">
          Kelola informasi profil dan keamanan akun Anda.
        </p>
      </div>

      {/* Profile Form */}
      <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-xs space-y-5">
        <h2 className="font-label-md text-[15px] font-semibold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">person</span>
          Informasi Profil
        </h2>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          {/* Avatar upload */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-primary font-bold text-xl overflow-hidden shrink-0">
              {displayAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="h-9 px-3 rounded-lg bg-surface-container border border-border text-on-surface font-label-sm text-[13px] flex items-center gap-1.5 cursor-pointer hover:bg-muted transition-colors">
                <span className="material-symbols-outlined text-[16px]">upload</span>
                <span>Unggah Foto</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={handleAvatarChange}
                />
              </label>
              <p className="font-body-sm text-[11px] text-muted-foreground">JPEG, PNG, WebP — maks. 2MB</p>
            </div>
          </div>

          {/* Full name */}
          <div className="space-y-1.5">
            <label className="font-label-sm text-label-sm text-on-surface block">Nama Lengkap</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full h-11 px-3 rounded-xl bg-surface-container text-on-surface text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Phone number */}
          <div className="space-y-1.5">
            <label className="font-label-sm text-label-sm text-on-surface block">Nomor Telepon</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="08xxxxxxxxxx"
              className="w-full h-11 px-3 rounded-xl bg-surface-container text-on-surface text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Read-only fields */}
          <div className="space-y-1.5">
            <label className="font-label-sm text-label-sm text-muted-foreground block">Email (tidak dapat diubah)</label>
            <input
              type="email"
              value={currentUser.email}
              readOnly
              disabled
              className="w-full h-11 px-3 rounded-xl bg-muted text-muted-foreground text-sm border border-border cursor-not-allowed"
            />
          </div>

          {profileMsg && (
            <div
              className={`p-3 rounded-xl text-[13px] flex items-center gap-2 ${
                profileMsg.type === "success"
                  ? "bg-success/15 text-success border border-success/30"
                  : "bg-error/15 text-error border border-error/30"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {profileMsg.type === "success" ? "check_circle" : "error"}
              </span>
              {profileMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={isSavingProfile}
            className="h-11 px-6 rounded-xl bg-primary text-on-primary font-label-md text-sm font-semibold flex items-center gap-2 shadow-xs hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSavingProfile ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">save</span>
                <span>Simpan Perubahan</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Password Change */}
      <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-xs space-y-5">
        <h2 className="font-label-md text-[15px] font-semibold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">lock</span>
          Ubah Kata Sandi
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-label-sm text-label-sm text-on-surface block">Kata Sandi Lama</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Masukkan kata sandi saat ini"
              autoComplete="current-password"
              required
              className="w-full h-11 px-3 rounded-xl bg-surface-container text-on-surface text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-label-sm text-label-sm text-on-surface block">Kata Sandi Baru</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              required
              className="w-full h-11 px-3 rounded-xl bg-surface-container text-on-surface text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-label-sm text-label-sm text-on-surface block">Konfirmasi Kata Sandi</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi kata sandi baru"
              required
              className="w-full h-11 px-3 rounded-xl bg-surface-container text-on-surface text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {passwordMsg && (
            <div
              className={`p-3 rounded-xl text-[13px] flex items-center gap-2 ${
                passwordMsg.type === "success"
                  ? "bg-success/15 text-success border border-success/30"
                  : "bg-error/15 text-error border border-error/30"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {passwordMsg.type === "success" ? "check_circle" : "error"}
              </span>
              {passwordMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={isChangingPassword}
            className="h-11 px-6 rounded-xl bg-surface-container border border-border text-on-surface font-label-md text-sm font-semibold flex items-center gap-2 hover:bg-muted transition-colors disabled:opacity-50"
          >
            {isChangingPassword ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Memperbarui...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">lock_reset</span>
                <span>Perbarui Kata Sandi</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
