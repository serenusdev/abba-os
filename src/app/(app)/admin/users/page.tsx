"use client";

import * as React from "react";
import Link from "next/link";
import { UnauthorizedState } from "@/components/ui/unauthorized-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Illustration } from "@/components/ui/illustration";
import { UserProfile } from "@/lib/auth/types";
import {
  getAccountRequestsAction,
  getActiveUsersAction,
  approveAccountApplicationAction,
  rejectAccountApplicationAction,
  createManualAccountAction,
  resetUserSessionAction,
  getCurrentUserAction,
  type AccountRequestItem,
  type ActiveUserItem,
} from "@/modules/iam/actions";

export default function AdminUsersPage() {
  const [currentUser, setCurrentUser] = React.useState<UserProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"queue" | "active" | "archived">("queue");
  const [selectedRoleFilter, setSelectedRoleFilter] = React.useState("Semua");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isManualModalOpen, setIsManualModalOpen] = React.useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = React.useState(false);
  const [rejectionTargetId, setRejectionTargetId] = React.useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");

  // Dynamic Data
  const [accountRequests, setAccountRequests] = React.useState<AccountRequestItem[]>([]);
  const [activeUsers, setActiveUsers] = React.useState<ActiveUserItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Approval state tracker for interactive tactile feedback
  const [approvedCards, setApprovedCards] = React.useState<Record<string, string>>({});
  const [rejectedCards, setRejectedCards] = React.useState<Record<string, string>>({});
  const [resetSessions, setResetSessions] = React.useState<Record<string, boolean>>({});

  // Manual Account Creation Form State
  const [manualForm, setManualForm] = React.useState({
    fullName: "",
    email: "",
    phone: "",
    role: "santri" as const,
    teamName: "Sentra Digitalpreneur",
    notes: "",
  });
  const [manualSuccessMsg, setManualSuccessMsg] = React.useState("");

  // Role select per applicant
  const [applicantRoles, setApplicantRoles] = React.useState<Record<string, string>>({});

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [requests, users] = await Promise.all([
        getAccountRequestsAction(),
        getActiveUsersAction(),
      ]);
      setAccountRequests(requests);
      setActiveUsers(users);
    } catch (err) {
      console.error("Failed to load IAM data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    getCurrentUserAction()
      .then((user) => setCurrentUser(user))
      .finally(() => setIsLoadingAuth(false));

    loadData();
  }, [loadData]);

  if (isLoadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3">
        <LoadingSpinner size="lg" />
        <p className="font-body-sm text-sm text-muted-foreground">Memverifikasi hak akses...</p>
      </div>
    );
  }

  const isAdminOrPengurus =
    currentUser?.role === "super_admin" ||
    currentUser?.role === "yayasan" ||
    currentUser?.role === "pengurus";

  if (!isAdminOrPengurus) {
    return <UnauthorizedState requiredRole="Super Admin / Pengurus / Yayasan" />;
  }

  const handleApprove = async (cardId: string) => {
    const role = applicantRoles[cardId] || "Santri • Sentra Digitalpreneur";
    const res = await approveAccountApplicationAction(cardId, role);
    if (res.success) {
      setApprovedCards((prev) => ({ ...prev, [cardId]: role }));
      await loadData();
    }
  };

  const openRejectDialog = (cardId: string) => {
    setRejectionTargetId(cardId);
    setRejectionReason("");
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectionTargetId) return;
    const res = await rejectAccountApplicationAction(
      rejectionTargetId,
      rejectionReason || "Persyaratan belum terpenuhi."
    );
    if (res.success) {
      setRejectedCards((prev) => ({ ...prev, [rejectionTargetId]: rejectionReason || "Ditolak" }));
      await loadData();
    }
    setIsRejectModalOpen(false);
  };

  const handleResetSession = async (userId: string) => {
    const res = await resetUserSessionAction(userId);
    if (res.success) {
      setResetSessions((prev) => ({ ...prev, [userId]: true }));
    }
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createManualAccountAction(manualForm);
    if (res.success) {
      setManualSuccessMsg(res.message);
      await loadData();
      setTimeout(() => {
        setManualSuccessMsg("");
        setIsManualModalOpen(false);
        setManualForm({
          fullName: "",
          email: "",
          phone: "",
          role: "santri",
          teamName: "Sentra Digitalpreneur",
          notes: "",
        });
      }, 1500);
    }
  };

  const pendingRequests = accountRequests.filter((r) => r.status === "pending" || !r.status);
  const activeUsersList = activeUsers.filter((u) => u.status === "active");
  const suspendedUsersList = activeUsers.filter(
    (u) => u.status === "suspended" || u.status === "deactivated"
  );

  const filteredActiveUsers = activeUsersList.filter((u) => {
    const matchesSearch =
      !searchQuery ||
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole =
      selectedRoleFilter === "Semua" ||
      u.role.toLowerCase().includes(selectedRoleFilter.toLowerCase());

    return matchesSearch && matchesRole;
  });

  return (
    <div className="flex flex-col w-full pb-8 max-w-4xl mx-auto">
      {/* 1. Content Context Header */}
      <div className="flex flex-col gap-1 mb-4">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-mono text-[12px] tracking-tight font-semibold">
            PRD-01 • IAM &amp; ACCESS
          </span>
          <span className="font-mono text-[12px] text-muted-foreground">IAM-001</span>
        </div>
        <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">
          Kelola Akses &amp; Akun
        </h2>
        <p className="font-body-md text-body-md text-muted-foreground">
          Persetujuan pendaftaran santri, manajemen sesi aktif, dan kontrol peran berbasis RBAC.
        </p>
      </div>

      {/* 2. Security Notice Banner */}
      <div className="rounded-xl bg-card p-3.5 mb-5 shadow-sm border border-border">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[20px]">shield</span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-label-sm text-label-sm text-primary uppercase tracking-wide font-semibold">
                BR-IAM-01 &amp; BR-IAM-04
              </span>
              <span className="font-mono text-[12px] text-muted-foreground">• Guard Aktif</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 leading-snug">
              Registrasi publik tidak aktif otomatis. Persetujuan admin mutlak diperlukan sebelum hak akses diberikan. Akun Super Admin dilindungi kebijakan zero-revoke.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Segmented Tabs Navigation */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted mb-5">
        <button
          className={`flex-1 py-2 px-2.5 rounded-lg font-label-sm text-label-sm shadow-sm flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "queue"
              ? "bg-card text-primary font-semibold shadow-xs"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
          onClick={() => setActiveTab("queue")}
          type="button"
        >
          <span>Antrean</span>
          {pendingRequests.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-error text-white font-mono text-[11px] leading-tight font-bold">
              {pendingRequests.length}
            </span>
          )}
        </button>
        <button
          className={`flex-1 py-2 px-2.5 rounded-lg font-label-sm text-label-sm flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "active"
              ? "bg-card text-primary font-semibold shadow-xs"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
          onClick={() => setActiveTab("active")}
          type="button"
        >
          <span>Aktif</span>
          <span className="text-muted-foreground font-mono text-[11px]">
            {activeUsersList.length}
          </span>
        </button>
        <button
          className={`flex-1 py-2 px-2.5 rounded-lg font-label-sm text-label-sm flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "archived"
              ? "bg-card text-primary font-semibold shadow-xs"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
          onClick={() => setActiveTab("archived")}
          type="button"
        >
          <span>Ditangguhkan</span>
          <span className="text-muted-foreground font-mono text-[11px]">
            {suspendedUsersList.length}
          </span>
        </button>
      </div>

      {/* TAB 1: QUEUE */}
      {activeTab === "queue" && (
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              <span className="font-headline-sm text-headline-sm text-on-surface">
                Antrean Registrasi Mandiri
              </span>
              {pendingRequests.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
              )}
            </div>
            <span className="font-mono text-[12px] text-muted-foreground">
              {pendingRequests.length === 0
                ? "Tidak ada antrean"
                : `${pendingRequests.length} Menunggu`}
            </span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center bg-card rounded-xl border border-border text-muted-foreground">
              <span className="material-symbols-outlined text-[32px] animate-spin text-primary">
                progress_activity
              </span>
              <p className="font-body-sm text-[13px] mt-2">Memuat antrean registrasi...</p>
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="p-8 sm:p-10 text-center bg-card rounded-2xl border border-dashed border-border flex flex-col items-center justify-center space-y-3">
              <Illustration
                src="/illustrations/undraw_done_erdp.svg"
                alt="Tidak ada antrean pendaftaran"
                width={130}
                height={90}
              />
              <div>
                <p className="font-headline-sm text-base font-semibold text-on-surface">
                  Tidak Ada Permohonan Pendaftaran
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                  Calon santri atau pengurus yang mendaftar mandiri akan muncul di sini untuk verifikasi hak akses RBAC.
                </p>
              </div>
            </div>
          ) : (
            pendingRequests.map((applicant) => (
              <div
                key={applicant.id}
                className={`rounded-xl bg-card p-4 shadow-sm flex flex-col gap-3.5 transition-all border border-border ${
                  approvedCards[applicant.id] ? "bg-accent/30 border-success/30" : ""
                } ${rejectedCards[applicant.id] ? "bg-error-container/20 border-error/30" : ""}`}
                id={applicant.id}
              >
                {approvedCards[applicant.id] ? (
                  <div className="py-3 px-2 flex items-center justify-center gap-2 text-success font-label-md text-label-md">
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    <span>Akun Berhasil Disetujui ({approvedCards[applicant.id]})</span>
                  </div>
                ) : rejectedCards[applicant.id] ? (
                  <div className="py-3 px-2 flex items-center justify-center gap-2 text-destructive font-label-md text-label-md">
                    <span className="material-symbols-outlined text-[20px]">cancel</span>
                    <span>Permohonan Ditolak: {rejectedCards[applicant.id]}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-headline-sm text-headline-sm flex-shrink-0 font-bold">
                          {applicant.initials}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-label-md text-label-md text-on-surface font-semibold truncate">
                              {applicant.fullName}
                            </span>
                          </div>
                          <span className="font-body-sm text-body-sm text-muted-foreground truncate">
                            {applicant.email}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[12px] text-muted-foreground">
                              {applicant.phoneNumber}
                            </span>
                            <span className="text-muted-foreground font-mono text-[12px]">•</span>
                            <span className="inline-flex items-center gap-0.5 font-mono text-[12px] text-success">
                              <span className="material-symbols-outlined text-[14px]">security</span>
                              Turnstile Valid
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-warning/15 text-tertiary font-label-sm text-label-sm flex-shrink-0 font-semibold">
                        Baru
                      </span>
                    </div>

                    {/* Detail Box Metadata */}
                    <div className="rounded-lg bg-surface-container-low p-2.5 flex flex-col gap-1.5 border border-border/40">
                      <div className="flex items-center justify-between font-label-sm text-label-sm">
                        <span className="text-muted-foreground">Klaim Peran Awal:</span>
                        <span className="text-on-surface font-semibold capitalize">
                          {applicant.roleRequested} ({applicant.teamRequested})
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-mono text-[12px]">
                        <span className="text-muted-foreground">Waktu Pengajuan:</span>
                        <span className="text-on-surface-variant">{applicant.createdAt}</span>
                      </div>
                      {applicant.notes && applicant.notes !== "-" && (
                        <div className="pt-1 mt-0.5">
                          <p className="font-body-sm text-[13px] text-on-surface-variant italic bg-card/60 p-2 rounded">
                            &quot;{applicant.notes}&quot;
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Role Assignment Configuration (RBAC Quick Pick) */}
                    <div className="flex flex-col gap-1.5">
                      <label
                        className="font-label-sm text-label-sm text-muted-foreground flex items-center gap-1 font-semibold"
                        htmlFor={`role-select-${applicant.id}`}
                      >
                        <span className="material-symbols-outlined text-[15px]">badge</span>
                        Alokasi Peran RBAC &amp; Penugasan Sentra:
                      </label>
                      <div className="relative">
                        <select
                          className="w-full h-11 px-3 pr-8 rounded-lg bg-surface-container font-label-md text-label-md text-on-surface appearance-none focus:outline-none focus:ring-2 focus:ring-primary transition-all border border-border"
                          id={`role-select-${applicant.id}`}
                          value={
                            applicantRoles[applicant.id] ||
                            `${applicant.roleRequested} • ${applicant.teamRequested}`
                          }
                          onChange={(e) =>
                            setApplicantRoles({
                              ...applicantRoles,
                              [applicant.id]: e.target.value,
                            })
                          }
                        >
                          <option value="Santri • Sentra Digitalpreneur">
                            Santri • Sentra Digitalpreneur
                          </option>
                          <option value="Santri • Sentra Dakwah Media">
                            Santri • Sentra Dakwah Media
                          </option>
                          <option value="Santri • Sentra Agropreneur">
                            Santri • Sentra Agropreneur
                          </option>
                          <option value="Pengurus • Ustadz Pembina">
                            Pengurus • Ustadz Pembina
                          </option>
                          <option value="Koordinator Divisi (Santri Senior)">
                            Koordinator Divisi (Santri Senior)
                          </option>
                        </select>
                        <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-[20px]">
                          arrow_drop_down
                        </span>
                      </div>
                    </div>

                    {/* Decision Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        className="h-11 rounded-lg bg-error-container text-on-error-container font-label-md text-label-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                        onClick={() => openRejectDialog(applicant.id)}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                        Tolak
                      </button>
                      <button
                        className="h-11 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                        onClick={() => handleApprove(applicant.id)}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        Setujui Akun
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: ACTIVE USERS & SECURITY SESSIONS */}
      {activeTab === "active" && (
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-on-surface">
                Pengguna Aktif &amp; Sesi
              </span>
              <span className="font-body-sm text-body-sm text-muted-foreground">
                Audit hak akses, perangkat aktif, dan status MFA
              </span>
            </div>
          </div>

          {/* Search and Quick Role Chips */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[20px]">
                search
              </span>
              <input
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-card font-body-sm text-body-sm text-on-surface placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all border border-border"
                placeholder="Cari nama, email, atau peran..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {[
                `Semua (${activeUsersList.length})`,
                `Santri (${activeUsersList.filter((u) => u.role.toLowerCase().includes("santri")).length})`,
                `Ustadz (${activeUsersList.filter((u) => u.role.toLowerCase().includes("ustadz") || u.role.toLowerCase().includes("pengurus")).length})`,
                `Koordinator (${activeUsersList.filter((u) => u.role.toLowerCase().includes("koordinator")).length})`,
              ].map((chip) => {
                const label = chip.split(" ")[0];
                const active = selectedRoleFilter === label;
                return (
                  <button
                    key={chip}
                    onClick={() => setSelectedRoleFilter(label)}
                    className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm flex-shrink-0 transition-all ${
                      active
                        ? "bg-primary text-on-primary font-semibold"
                        : "bg-card text-on-surface-variant shadow-sm border border-border hover:bg-muted"
                    }`}
                    type="button"
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active User List */}
          <div className="flex flex-col gap-2.5">
            {isLoading ? (
              <div className="p-8 text-center bg-card rounded-xl border border-border text-muted-foreground">
                <span className="material-symbols-outlined text-[32px] animate-spin text-primary">
                  progress_activity
                </span>
                <p className="font-body-sm text-[13px] mt-2">Memuat daftar pengguna aktif...</p>
              </div>
            ) : filteredActiveUsers.length === 0 ? (
              <div className="p-8 sm:p-10 text-center bg-card rounded-2xl border border-dashed border-border flex flex-col items-center justify-center space-y-3">
                <Illustration
                  src="/illustrations/undraw_team-permissions_1lrk.svg"
                  alt="Belum ada pengguna terdaftar"
                  width={150}
                  height={104}
                />
                <div>
                  <p className="font-headline-sm text-base font-semibold text-on-surface">
                    Belum Ada Pengguna Aktif
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                    Gunakan tombol &quot;Buat Akun Manual (Jalur B Admin)&quot; di bawah untuk menambahkan pengguna baru secara langsung.
                  </p>
                </div>
              </div>
            ) : (
              filteredActiveUsers.map((user) => (
                <div
                  key={user.id}
                  className="rounded-xl bg-card p-3.5 shadow-sm flex flex-col gap-2.5 border border-border"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-headline-sm text-headline-sm flex-shrink-0 font-bold">
                        {user.initials}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-label-md text-label-md text-on-surface font-semibold truncate">
                            {user.fullName}
                          </span>
                          <span className="w-2 h-2 rounded-full bg-success" />
                        </div>
                        <span className="font-body-sm text-body-sm text-muted-foreground truncate">
                          {user.email}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="px-2 py-0.2 rounded-md bg-accent text-accent-foreground font-mono text-[11px] font-semibold">
                            {user.role}
                          </span>
                          <span className="px-2 py-0.2 rounded-md bg-surface-container text-on-surface-variant font-mono text-[11px]">
                            {user.teamName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 flex items-center justify-between bg-surface-container-low px-3 py-2 rounded-lg border border-border/40">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[17px] text-primary">
                        smartphone
                      </span>
                      <div className="flex flex-col">
                        <span className="font-mono text-[12px] text-on-surface leading-tight font-medium">
                          {resetSessions[user.id] ? "0 Sesi (Telah Direset)" : user.deviceInfo}
                        </span>
                      </div>
                    </div>
                    {resetSessions[user.id] ? (
                      <span className="text-[11px] font-mono text-success">Sesi Dicabut</span>
                    ) : (
                      <button
                        className="px-2.5 py-1 rounded-md bg-card text-destructive font-label-sm text-label-sm active:scale-95 shadow-xs transition-all border border-border hover:bg-destructive/10"
                        onClick={() => handleResetSession(user.id)}
                        type="button"
                      >
                        Reset Sesi
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ARCHIVED / SUSPENDED */}
      {activeTab === "archived" && (
        <div className="flex flex-col gap-3 mb-6">
          {suspendedUsersList.length === 0 ? (
            <div className="p-8 sm:p-10 text-center bg-card rounded-2xl border border-dashed border-border flex flex-col items-center justify-center space-y-3">
              <Illustration
                src="/illustrations/undraw_blocked_ldel.svg"
                alt="Tidak ada akun ditangguhkan"
                width={120}
                height={85}
              />
              <div>
                <p className="font-headline-sm text-base font-semibold text-on-surface">
                  Tidak Ada Akun yang Ditangguhkan
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                  Semua akun terdaftar dalam status tertib. Akun yang dinonaktifkan akan tercatat di sini.
                </p>
              </div>
            </div>
          ) : (
            suspendedUsersList.map((user) => (
              <div
                key={user.id}
                className="rounded-xl bg-card p-4 shadow-sm border border-border flex items-center justify-between"
              >
                <div>
                  <h4 className="font-headline-sm text-[16px] text-on-surface font-semibold">
                    {user.fullName}
                  </h4>
                  <p className="font-body-sm text-[12px] text-muted-foreground">
                    {user.email} • {user.teamName}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-error-container text-on-error-container font-label-sm text-[11px] font-semibold">
                  {user.status === "suspended" ? "Ditangguhkan (Suspended)" : "Nonaktif Permanen"}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* 4. Bottom Fast Actions Section (PRD-01 §3.2 Pathway B) */}
      <div className="flex flex-col gap-2.5 mt-2">
        <button
          className="w-full h-12 rounded-xl bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all hover:bg-primary-container"
          type="button"
          onClick={() => setIsManualModalOpen(true)}
        >
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          <span>Buat Akun Manual (Jalur B Admin)</span>
        </button>

        <div className="flex items-center justify-between gap-2">
          <button
            className="flex-1 h-11 rounded-xl bg-card text-on-surface-variant font-label-sm text-label-sm shadow-sm flex items-center justify-center gap-1.5 active:bg-muted transition-all border border-border hover:bg-surface-container"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Unduh Rekap Akun
          </button>
          <Link
            href="/admin/audit"
            className="flex-1 h-11 rounded-xl bg-card text-on-surface-variant font-label-sm text-label-sm shadow-sm flex items-center justify-center gap-1.5 active:bg-muted transition-all border border-border hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[18px]">history</span>
            Log Audit IAM
          </Link>
        </div>

        <p className="text-center font-mono text-[11px] text-muted-foreground mt-1">
          Pondok OS IAM Module v2.0 • Sesuai standar ISO/IEC 27001 Access Control
        </p>
      </div>

      {/* MODAL 1: Jalur B Manual Account Creation */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">person_add</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Buat Akun Santri (Jalur B Admin)
                </h3>
              </div>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {manualSuccessMsg ? (
              <div className="py-6 text-center text-success flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[36px]">check_circle</span>
                <p className="font-label-md text-label-md">{manualSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleCreateManual} className="space-y-3.5">
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface font-semibold block mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Contoh: Bilal bin Rabah"
                    className="w-full h-11 px-3 rounded-xl bg-surface-container border border-border text-[15px] focus:outline-none focus:ring-2 focus:ring-primary"
                    value={manualForm.fullName}
                    onChange={(e) => setManualForm({ ...manualForm, fullName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="font-label-sm text-label-sm text-on-surface font-semibold block mb-1">
                    Alamat Email (atau sintetis santri)
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="nama@pondok.id"
                    className="w-full h-11 px-3 rounded-xl bg-surface-container border border-border text-[15px] focus:outline-none focus:ring-2 focus:ring-primary"
                    value={manualForm.email}
                    onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="font-label-sm text-label-sm text-on-surface font-semibold block mb-1">
                    Nomor WhatsApp
                  </label>
                  <input
                    required
                    type="tel"
                    placeholder="08123456789"
                    className="w-full h-11 px-3 rounded-xl bg-surface-container border border-border text-[15px] focus:outline-none focus:ring-2 focus:ring-primary"
                    value={manualForm.phone}
                    onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="font-label-sm text-label-sm text-on-surface font-semibold block mb-1">
                    Penugasan Sentra
                  </label>
                  <select
                    className="w-full h-11 px-3 rounded-xl bg-surface-container border border-border text-[15px] focus:outline-none focus:ring-2 focus:ring-primary"
                    value={manualForm.teamName}
                    onChange={(e) => setManualForm({ ...manualForm, teamName: e.target.value })}
                  >
                    <option value="Sentra Digitalpreneur">Sentra Digitalpreneur</option>
                    <option value="Sentra Dakwah Media">Sentra Dakwah Media</option>
                    <option value="Sentra Agropreneur">Sentra Agropreneur</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsManualModalOpen(false)}
                    className="flex-1 h-11 rounded-xl bg-card border border-border text-on-surface-variant font-label-md"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-11 rounded-xl bg-primary text-white font-label-md shadow-sm"
                  >
                    Terbitkan Akun Aktif
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Rejection Reason Confirmation */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-5 space-y-3.5">
            <div className="flex items-center gap-2 text-destructive">
              <span className="material-symbols-outlined text-[24px]">warning</span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                Tolak Permohonan Akun
              </h3>
            </div>
            <p className="font-body-sm text-[13px] text-muted-foreground">
              Sesuai BR-IAM-02, setiap penolakan akun wajib disertai alasan yang dicatat ke log audit.
            </p>

            <div>
              <label className="font-label-sm text-label-sm text-on-surface font-semibold block mb-1">
                Alasan Penolakan
              </label>
              <textarea
                required
                rows={3}
                placeholder="Tuliskan alasan penolakan untuk arsip audit..."
                className="w-full p-3 rounded-xl bg-surface-container border border-border text-[14px] focus:outline-none focus:ring-2 focus:ring-primary"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="flex-1 h-11 rounded-xl bg-card border border-border text-on-surface-variant font-label-md"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="flex-1 h-11 rounded-xl bg-destructive text-white font-label-md shadow-sm"
              >
                Konfirmasi Tolak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
