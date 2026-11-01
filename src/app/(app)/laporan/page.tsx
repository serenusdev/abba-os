"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LaporanPage() {
  const [category, setCategory] = React.useState("tech");
  const [submitted, setSubmitted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <div className="flex flex-col w-full pb-8 space-y-4 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-card rounded-2xl p-4 sm:p-5 shadow-sm border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-[11px] uppercase tracking-wider text-primary font-semibold">
            Laporan Individu • PRD-04
          </span>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            Laporan Aktivitas Harian Santri
          </h2>
          <p className="font-body-sm text-[13px] text-muted-foreground mt-0.5">
            Batas pengiriman rutin: pukul 21.00 WIB setiap hari operasional
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high text-tertiary self-start sm:self-auto">
          <span className="material-symbols-outlined text-[16px]">timer</span>
          <span className="font-label-sm text-label-sm font-semibold">
            Batas: 21.00 WIB
          </span>
        </div>
      </div>

      {submitted ? (
        <div className="bg-card rounded-2xl p-6 sm:p-8 text-center border border-border shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-full bg-surface-container-low text-success flex items-center justify-center mx-auto border border-success/30">
            <span className="material-symbols-outlined text-[32px]">
              check_circle
            </span>
          </div>
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">
              Laporan Berhasil Disimpan &amp; Dikirim
            </h3>
            <p className="font-body-sm text-body-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Laporan telah masuk ke sistem antrean review pengurus. Anda dapat menyunting isi aktivitas selama belum disetujui reviewer.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setSubmitted(false)}
            className="mt-2"
          >
            Tulis Laporan Lain / Revisi
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-4 sm:p-6 shadow-sm border border-border space-y-4">
          {/* Category Chips */}
          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface">
              Kategori Bidang Aktivitas
            </label>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {[
                { id: "tech", label: "Koding & Tech" },
                { id: "media", label: "Media & Desain" },
                { id: "tahfidz", label: "Tahfidz & Diniyah" },
                { id: "ops", label: "Operasional Pondok" },
              ].map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-label-md text-label-sm transition-all ${
                    category === cat.id
                      ? "bg-primary text-white shadow-xs"
                      : "bg-surface-container text-on-surface-variant hover:bg-accent/40"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface">
              Ringkasan Capaian Hari Ini
            </label>
            <textarea
              required
              rows={3}
              placeholder="Jelaskan apa yang berhasil diselesaikan hari ini..."
              className="flex w-full rounded-xl border border-input-border bg-card p-3.5 text-[16px] text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-on-surface">
              Kendala atau Hambatan (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder="Tuliskan kendala teknis atau kebutuhan bantuan pengurus..."
              className="flex w-full rounded-xl border border-input-border bg-card p-3.5 text-[16px] text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <Input
            label="Tautan Bukti / Output (GitHub, Figma, Docs)"
            placeholder="https://github.com/... atau https://docs..."
            type="url"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            isLoading={isLoading}
          >
            Kirim Laporan Aktivitas
          </Button>
        </form>
      )}
    </div>
  );
}

