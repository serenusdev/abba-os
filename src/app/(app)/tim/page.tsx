"use client";

import * as React from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function TimPage() {
  const members = [
    {
      id: "mem-01",
      name: "Salman Al-Farisi",
      role: "Santri Digitalpreneur",
      team: "Tim Media & IT",
      email: "salman.alfarisi@pondok.id",
      status: "Aktif",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBCH3s1V5k5nvQ8WRQJE6gU9pCzSCvhXwpWSW4uUm4pJ2Xr6_DWoddnDbThs-MSH-RciThzPO6PU2B_OrPvozfhbFdaN-4ut-n8FD7fV7FWR_qD3Qry0XOnad54qj9QnoaMWUyWkl8L_OtBH8vtqsLcUPN2mlxzisFKs9vCTXstZUSvQ3XThF6zHhg2UQqDGfFXRn-EoAtjX2xWNET9wAUHs1HbECpc_lvrVsqThcM",
    },
    {
      id: "mem-02",
      name: "Ustadz Abdullah Robbani",
      role: "Pengurus & Reviewer",
      team: "Dewan Pengasuh",
      email: "abdullah@pondok.id",
      status: "Aktif",
      avatar: null,
    },
    {
      id: "mem-03",
      name: "Ahmad Dahlan",
      role: "Santri Digitalpreneur",
      team: "Tim Media & IT",
      email: "ahmad.dahlan@pondok.id",
      status: "Aktif",
      avatar: null,
    },
    {
      id: "mem-04",
      name: "H. Sudirman",
      role: "Yayasan",
      team: "Badan Pengawas",
      email: "sudirman@pondok.id",
      status: "Aktif",
      avatar: null,
    },
  ];

  return (
    <div className="flex flex-col w-full pb-8 space-y-4 max-w-4xl mx-auto">
      <div className="bg-card rounded-2xl p-4 sm:p-5 shadow-sm border border-border">
        <span className="font-label-sm text-[11px] uppercase tracking-wider text-primary font-semibold">
          Struktur &amp; Kontak • PRD-07
        </span>
        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Direktori Tim &amp; Orang
        </h2>
        <p className="font-body-sm text-[13px] text-muted-foreground mt-0.5">
          Daftar anggota komunitas, santri digitalpreneur, ustadz, dan pengurus yayasan
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {members.map((member) => (
          <div
            key={member.id}
            className="bg-card rounded-xl p-4 border border-border shadow-sm flex items-start gap-3.5"
          >
            <Avatar
              src={member.avatar}
              alt={member.name}
              fallback={member.name}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <h4 className="font-headline-sm text-[16px] text-on-surface font-semibold truncate">
                  {member.name}
                </h4>
                <Badge variant="tepat_waktu" className="text-[10px]">
                  {member.status}
                </Badge>
              </div>
              <p className="font-body-sm text-[12px] text-primary font-medium">
                {member.role}
              </p>
              <p className="font-body-sm text-[12px] text-muted-foreground truncate mt-0.5">
                {member.team} • {member.email}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
