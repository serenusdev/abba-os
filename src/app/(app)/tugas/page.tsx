"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function TugasPage() {
  const tasks = [
    {
      id: "tsk-01",
      title: "Integrasi API Autentikasi Supabase & RLS IAM",
      assignee: "Salman Al-Farisi",
      due: "20 Nov 2026",
      status: "Berjalan",
      priority: "Tinggi",
      team: "Tim IT",
    },
    {
      id: "tsk-02",
      title: "Desain Banner Pengumuman Kajian Akbar",
      assignee: "Ahmad Dahlan",
      due: "19 Nov 2026",
      status: "Selesai",
      priority: "Sedang",
      team: "Tim Media",
    },
    {
      id: "tsk-03",
      title: "Validasi Alamat IP & Lokasi Presensi Pondok",
      assignee: "Farhan Hakim",
      due: "22 Nov 2026",
      status: "Belum Dimulai",
      priority: "Sedang",
      team: "Tim IT",
    },
  ];

  return (
    <div className="flex flex-col w-full pb-8 space-y-4 max-w-4xl mx-auto">
      <div className="bg-card rounded-2xl p-4 sm:p-5 shadow-sm border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-[11px] uppercase tracking-wider text-primary font-semibold">
            Modul Kolaborasi • PRD-05
          </span>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            Tugas &amp; Proyek Operasional
          </h2>
          <p className="font-body-sm text-[13px] text-muted-foreground mt-0.5">
            Manajemen penugasan santri dan tim kerja pondok
          </p>
        </div>
        <Button variant="primary" size="default" className="gap-2">
          <span className="material-symbols-outlined text-[20px]">add</span>
          <span>Buat Tugas</span>
        </Button>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="bg-card rounded-xl p-4 border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-label-sm text-[11px] px-2 py-0.5 rounded-full bg-surface-container font-mono text-muted-foreground">
                  {task.id.toUpperCase()}
                </span>
                <span className="font-label-sm text-[11px] px-2 py-0.5 rounded-full bg-accent/60 text-accent-foreground font-semibold">
                  {task.team}
                </span>
              </div>
              <h4 className="font-headline-sm text-[16px] text-on-surface font-semibold">
                {task.title}
              </h4>
              <p className="font-body-sm text-[12px] text-muted-foreground">
                PIC: {task.assignee} • Tenggat: {task.due}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {task.status === "Selesai" ? (
                <Badge variant="disetujui" icon="check_circle">
                  Selesai
                </Badge>
              ) : task.status === "Berjalan" ? (
                <Badge variant="toleransi" icon="trending_flat">
                  Sedang Berjalan
                </Badge>
              ) : (
                <Badge variant="outline" icon="hourglass_empty">
                  Belum Dimulai
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

