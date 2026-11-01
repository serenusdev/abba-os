"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminUsersPage() {
  const [pendingUsers, setPendingUsers] = React.useState([
    {
      id: "reg-01",
      name: "Fadhil Muhammad",
      email: "fadhil.m@gmail.com",
      role: "Santri Digitalpreneur",
      phone: "081298765432",
      appliedAt: "01 Nov 2026, 09:15 WIB",
    },
    {
      id: "reg-02",
      name: "Ustadz Hanafi",
      email: "hanafi@al-quran.sch.id",
      role: "Pengurus & Reviewer",
      phone: "085678901234",
      appliedAt: "31 Okt 2026, 14:20 WIB",
    },
  ]);

  const handleApprove = (id: string) => {
    setPendingUsers(pendingUsers.filter((u) => u.id !== id));
  };

  return (
    <div className="flex flex-col w-full pb-8 space-y-4 max-w-4xl mx-auto">
      <div className="bg-card rounded-2xl p-4 sm:p-5 shadow-sm border border-border">
        <span className="font-label-sm text-[11px] uppercase tracking-wider text-primary font-semibold">
          Administrasi &amp; Akses • PRD-01
        </span>
        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Kelola Pengguna IAM &amp; Persetujuan Akun
        </h2>
        <p className="font-body-sm text-[13px] text-muted-foreground mt-0.5">
          Verifikasi pengajuan pendaftaran akun baru sesuai kebijakan persetujuan admin (BR-OPS-08)
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-headline-sm text-[17px] text-on-surface">
            Antrean Pengajuan Akun ({pendingUsers.length})
          </h3>
        </div>

        {pendingUsers.length === 0 ? (
          <div className="p-8 text-center bg-card rounded-xl border border-dashed border-border">
            <span className="material-symbols-outlined text-success text-[32px] mb-2">
              task_alt
            </span>
            <p className="font-label-md text-label-md text-on-surface">
              Semua Pengajuan Telah Ditinjau
            </p>
            <p className="font-body-sm text-[12px] text-muted-foreground mt-0.5">
              Tidak ada antrean persetujuan akun yang menunggu saat ini.
            </p>
          </div>
        ) : (
          pendingUsers.map((user) => (
            <div
              key={user.id}
              className="bg-card rounded-xl p-4 border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-headline-sm text-[16px] text-on-surface font-semibold">
                    {user.name}
                  </h4>
                  <Badge variant="menunggu" icon="hourglass_top">
                    Menunggu Verifikasi
                  </Badge>
                </div>
                <p className="font-body-sm text-[12px] text-primary font-medium">
                  Peran diajukan: {user.role}
                </p>
                <p className="font-body-sm text-[12px] text-muted-foreground">
                  {user.email} • WA: {user.phone} • {user.appliedAt}
                </p>
              </div>

              <div className="flex gap-2 self-start sm:self-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleApprove(user.id)}
                >
                  Tolak
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleApprove(user.id)}
                >
                  Setujui &amp; Aktifkan
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
