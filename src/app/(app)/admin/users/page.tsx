"use client";

import * as React from "react";
import Link from "next/link";
import {
  approveAccountApplicationAction,
  rejectAccountApplicationAction,
  createManualAccountAction,
  resetUserSessionAction,
} from "@/modules/iam/actions";

export default function AdminUsersPage() {
  const [activeTab, setActiveTab] = React.useState<"queue" | "active" | "archived">("queue");
  const [selectedRoleFilter, setSelectedRoleFilter] = React.useState("Semua");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isManualModalOpen, setIsManualModalOpen] = React.useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = React.useState(false);
  const [rejectionTargetId, setRejectionTargetId] = React.useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");

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
  const [applicantRoles, setApplicantRoles] = React.useState<Record<string, string>>({
    "applicant-card-1": "Santri • Sentra Digitalpreneur",
    "applicant-card-2": "Pengurus • Ustadz Pembina",
  });

  const handleApprove = async (cardId: string) => {
    const role = applicantRoles[cardId] || "Santri";
    const res = await approveAccountApplicationAction(cardId, role);
    if (res.success) {
      setApprovedCards((prev) => ({ ...prev, [cardId]: role }));
    }
  };

  const openRejectDialog = (cardId: string) => {
    setRejectionTargetId(cardId);
    setRejectionReason("");
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectionTargetId) return;
    const res = await rejectAccountApplicationAction(rejectionTargetId, rejectionReason || "Persyaratan belum terpenuhi.");
    if (res.success) {
      setRejectedCards((prev) => ({ ...prev, [rejectionTargetId]: rejectionReason || "Ditolak" }));
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

  return (
    <div className="flex flex-col w-full pb-8 max-w-4xl mx-auto">
      {/* 1. Content Context Header */}
      <div className="flex flex-col gap-1 mb-4">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-mono text-[12px] tracking-tight font-semibold">
            PRD-01 • IAM &amp; ACCESS
          </span>
          <span className="flex items-center gap-1 text-on-surface-variant font-mono text-[12px]">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            v2.0 Enforced
          </span>
        </div>
        <h1 className="font-headline-lg-mobile text-[26px] md:text-[32px] font-bold text-on-surface tracking-tight mt-1">
          Kelola Pengguna &amp; Akun
        </h1>
        <p className="font-body-sm text-body-sm text-muted-foreground">
          Verifikasi permohonan santri baru, alokasi peran RBAC, dan audit akses operasional.
        </p>
      </div>

      {/* 2. Security Protocol Guard Infobox */}
      <div className="rounded-xl bg-surface-container-low p-3.5 mb-5 shadow-sm border border-border/40">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary mt-0.5">
            <span className="material-symbols-outlined text-[19px]">verified_user</span>
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
          <span className="px-1.5 py-0.2 rounded-full bg-error text-white font-mono text-[11px] leading-tight font-bold">
            2
          </span>
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
          <span className="text-muted-foreground font-mono text-[11px]">38</span>
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
          <span className="text-muted-foreground font-mono text-[11px]">2</span>
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
              <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            </div>
            <span className="font-mono text-[12px] text-muted-foreground">
              {Object.keys(approvedCards).length + Object.keys(rejectedCards).length === 2
                ? "Selesai ditinjau"
                : "2 Menunggu"}
            </span>
          </div>

          {/* Applicant Card 1 (Muhammad Ridwan Pratama) */}
          <div
            className={`rounded-xl bg-card p-4 shadow-sm flex flex-col gap-3.5 transition-all border border-border ${
              approvedCards["applicant-card-1"] ? "bg-accent/30 border-success/30" : ""
            } ${rejectedCards["applicant-card-1"] ? "bg-error-container/20 border-error/30" : ""}`}
            id="applicant-card-1"
          >
            {approvedCards["applicant-card-1"] ? (
              <div className="py-3 px-2 flex items-center justify-center gap-2 text-success font-label-md text-label-md">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                <span>Akun Berhasil Disetujui ({approvedCards["applicant-card-1"]})</span>
              </div>
            ) : rejectedCards["applicant-card-1"] ? (
              <div className="py-3 px-2 flex items-center justify-center gap-2 text-destructive font-label-md text-label-md">
                <span className="material-symbols-outlined text-[20px]">cancel</span>
                <span>Permohonan Ditolak: {rejectedCards["applicant-card-1"]}</span>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-headline-sm text-headline-sm flex-shrink-0 font-bold">
                      RP
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-label-md text-label-md text-on-surface font-semibold truncate">
                          Muhammad Ridwan Pratama
                        </span>
                      </div>
                      <span className="font-body-sm text-body-sm text-muted-foreground truncate">
                        m.ridwan@pondok.id
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[12px] text-muted-foreground">
                          +62 813-****-4421
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
                    <span className="text-on-surface font-semibold">
                      Santri (Sentra Digitalpreneur)
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[12px]">
                    <span className="text-muted-foreground">Waktu Pengajuan:</span>
                    <span className="text-on-surface-variant">18 Nov 2026, 06:30 WIB</span>
                  </div>
                  <div className="pt-1 mt-0.5">
                    <p className="font-body-sm text-[13px] text-on-surface-variant italic bg-card/60 p-2 rounded">
                      &quot;Santri baru angkatan 3 peminatan Fullstack Dev, telah lulus placement test kurikulum.&quot;
                    </p>
                  </div>
                </div>

                {/* Role Assignment Configuration (RBAC Quick Pick) */}
                <div className="flex flex-col gap-1.5">
                  <label
                    className="font-label-sm text-label-sm text-muted-foreground flex items-center gap-1 font-semibold"
                    htmlFor="role-select-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">badge</span>
                    Alokasi Peran RBAC &amp; Penugasan Sentra:
                  </label>
                  <div className="relative">
                    <select
                      className="w-full h-11 px-3 pr-8 rounded-lg bg-surface-container font-label-md text-label-md text-on-surface appearance-none focus:outline-none focus:ring-2 focus:ring-primary transition-all border border-border"
                      id="role-select-1"
                      value={applicantRoles["applicant-card-1"]}
                      onChange={(e) =>
                        setApplicantRoles({
                          ...applicantRoles,
                          "applicant-card-1": e.target.value,
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
                    onClick={() => openRejectDialog("applicant-card-1")}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                    Tolak
                  </button>
                  <button
                    className="h-11 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    onClick={() => handleApprove("applicant-card-1")}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    Setujui Akun
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Applicant Card 2 (Nurul Hidayat, S.Kom.) */}
          <div
            className={`rounded-xl bg-card p-4 shadow-sm flex flex-col gap-3 transition-all border border-border ${
              approvedCards["applicant-card-2"] ? "bg-accent/30 border-success/30" : ""
            } ${rejectedCards["applicant-card-2"] ? "bg-error-container/20 border-error/30" : ""}`}
            id="applicant-card-2"
          >
            {approvedCards["applicant-card-2"] ? (
              <div className="py-3 px-2 flex items-center justify-center gap-2 text-success font-label-md text-label-md">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                <span>Akun Berhasil Disetujui ({approvedCards["applicant-card-2"]})</span>
              </div>
            ) : rejectedCards["applicant-card-2"] ? (
              <div className="py-3 px-2 flex items-center justify-center gap-2 text-destructive font-label-md text-label-md">
                <span className="material-symbols-outlined text-[20px]">cancel</span>
                <span>Permohonan Ditolak: {rejectedCards["applicant-card-2"]}</span>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-headline-sm text-headline-sm flex-shrink-0 font-bold">
                      NH
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-label-md text-label-md text-on-surface font-semibold truncate">
                          Nurul Hidayat, S.Kom.
                        </span>
                      </div>
                      <span className="font-body-sm text-body-sm text-muted-foreground truncate">
                        nurul.hidayat@instansi.org
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[12px] text-muted-foreground">
                        <span>Kemarin, 21:15 WIB</span>
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-label-sm text-label-sm flex-shrink-0 font-semibold">
                    Ustadz / Pembina
                  </span>
                </div>

                <div className="rounded-lg bg-surface-container-low p-2.5 flex items-center justify-between border border-border/40">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-warning text-[20px]">
                      pending_actions
                    </span>
                    <span className="font-body-sm text-[13px] text-on-surface-variant">
                      Menunggu Verifikasi Berkas SK Yayasan
                    </span>
                  </div>
                  <span className="font-mono text-[12px] text-muted-foreground font-medium">
                    2 Dokumen
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    className="h-11 rounded-lg bg-error-container text-on-error-container font-label-md text-label-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    onClick={() => openRejectDialog("applicant-card-2")}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                    Tolak
                  </button>
                  <button
                    className="h-11 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    onClick={() => handleApprove("applicant-card-2")}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    Setujui Akun
                  </button>
                </div>
              </>
            )}
          </div>
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
            <button
              className="p-2 rounded-lg bg-surface-container text-primary active:scale-95 transition-all"
              type="button"
              title="Filter Lanjutan"
            >
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </button>
          </div>

          {/* Search and Quick Role Chips */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[20px]">
                search
              </span>
              <input
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-card font-body-sm text-body-sm text-on-surface placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all border border-border"
                placeholder="Cari nama, email, atau ID Santri..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {["Semua (38)", "Santri (28)", "Ustadz (6)", "Koordinator (4)"].map((chip) => {
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
            {/* Active User Item 1: Salman Al-Farisi */}
            <div className="rounded-xl bg-card p-3.5 shadow-sm flex flex-col gap-2.5 border border-border">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-headline-sm text-headline-sm flex-shrink-0 font-bold">
                    SA
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-label-md text-label-md text-on-surface font-semibold truncate">
                        Salman Al-Farisi
                      </span>
                      <span className="w-2 h-2 rounded-full bg-success" />
                    </div>
                    <span className="font-body-sm text-body-sm text-muted-foreground truncate">
                      salman.af@pondok.id
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="px-2 py-0.2 rounded-md bg-accent text-accent-foreground font-mono text-[11px] font-semibold">
                        Santri
                      </span>
                      <span className="px-2 py-0.2 rounded-md bg-surface-container text-on-surface-variant font-mono text-[11px]">
                        Koordinator Media
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  aria-label="Kelola Sesi Salman"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-on-surface active:bg-muted transition-all"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">more_vert</span>
                </button>
              </div>
              <div className="pt-2 flex items-center justify-between bg-surface-container-low px-3 py-2 rounded-lg border border-border/40">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[17px] text-primary">
                    smartphone
                  </span>
                  <div className="flex flex-col">
                    <span className="font-mono text-[12px] text-on-surface leading-tight font-medium">
                      {resetSessions["usr-salman"] ? "0 Sesi (Telah Direset)" : "1 Perangkat Aktif"}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground leading-tight">
                      Android 14 • Chrome Mobile
                    </span>
                  </div>
                </div>
                {resetSessions["usr-salman"] ? (
                  <span className="text-[11px] font-mono text-success">Sesi Dicabut</span>
                ) : (
                  <button
                    className="px-2.5 py-1 rounded-md bg-card text-destructive font-label-sm text-label-sm active:scale-95 shadow-xs transition-all border border-border hover:bg-destructive/10"
                    onClick={() => handleResetSession("usr-salman")}
                    type="button"
                  >
                    Reset Sesi
                  </button>
                )}
              </div>
            </div>

            {/* Active User Item 2: Ustadz Ahmad Fauzi */}
            <div className="rounded-xl bg-card p-3.5 shadow-sm flex flex-col gap-2.5 border border-border">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed font-headline-sm text-headline-sm flex-shrink-0 font-bold">
                    AF
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-label-md text-label-md text-on-surface font-semibold truncate">
                        Ustadz Ahmad Fauzi
                      </span>
                      <span className="material-symbols-outlined text-primary text-[17px]">
                        verified
                      </span>
                    </div>
                    <span className="font-body-sm text-body-sm text-muted-foreground truncate">
                      ahmad.fauzi@pondok.id
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="px-2 py-0.2 rounded-md bg-secondary-container text-on-secondary-container font-mono text-[11px] font-semibold">
                        Pengurus / Pereview
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  aria-label="Kelola Sesi Ahmad"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-on-surface active:bg-muted transition-all"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">more_vert</span>
                </button>
              </div>
              <div className="flex items-center justify-between bg-surface-container-low px-3 py-2 rounded-lg border border-border/40">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[17px] text-success">lock</span>
                  <div className="flex flex-col">
                    <span className="font-mono text-[12px] text-on-surface leading-tight font-medium">
                      MFA TOTP Aktif
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground leading-tight">
                      Audit Keamanan: Bersih
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-success/15 text-success font-label-sm text-label-sm font-semibold">
                  Terverifikasi
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ARCHIVED / SUSPENDED */}
      {activeTab === "archived" && (
        <div className="flex flex-col gap-3 mb-6">
          <div className="rounded-xl bg-card p-4 shadow-sm border border-border flex items-center justify-between">
            <div>
              <h4 className="font-headline-sm text-[16px] text-on-surface font-semibold">
                Zaidan Arsyad (Ex-Santri Angkatan 1)
              </h4>
              <p className="font-body-sm text-[12px] text-muted-foreground">
                zaidan@alumni.pondok.id • Dinonaktifkan: 01 Okt 2026
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-tertiary font-label-sm text-[11px] font-semibold">
              Nonaktif Permanen
            </span>
          </div>

          <div className="rounded-xl bg-card p-4 shadow-sm border border-border flex items-center justify-between">
            <div>
              <h4 className="font-headline-sm text-[16px] text-on-surface font-semibold">
                Akun Uji Coba Tamu
              </h4>
              <p className="font-body-sm text-[12px] text-muted-foreground">
                guest@pondok.id • Dibekukan oleh Super Admin (Audit #884)
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-error-container text-on-error-container font-label-sm text-[11px] font-semibold">
              Ditangguhkan (Suspended)
            </span>
          </div>
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
