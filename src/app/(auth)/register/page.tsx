"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const [submitted, setSubmitted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    fullName: "",
    email: "",
    phone: "",
    roleRequested: "santri",
    teamName: "Tim Media & IT",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSubmitted(true);
    }, 700);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-lg bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white font-bold text-xl shadow-sm mb-3">
            P
          </div>
          <h2 className="font-headline-sm text-[22px] text-on-surface font-bold">
            Pengajuan Akun Pondok OS
          </h2>
          <p className="font-body-sm text-[13px] text-muted-foreground mt-1">
            Pendaftaran santri baru atau pengurus wajib melalui verifikasi Super Admin (BR-OPS-08)
          </p>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-surface-container-low text-success flex items-center justify-center border border-success/30">
              <span className="material-symbols-outlined text-[32px]">check_circle</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                Pengajuan Berhasil Dikirim
              </h3>
              <p className="font-body-sm text-body-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Data Anda telah masuk ke antrean verifikasi IAM. Admin akan meninjau dan mengaktifkan akun Anda.
              </p>
            </div>
            <Link href="/login" className="w-full pt-2">
              <Button variant="primary" size="lg" className="w-full">
                Kembali ke Halaman Masuk
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nama Lengkap"
              placeholder="Contoh: Salman Al-Farisi"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              required
            />

            <Input
              label="Alamat Email Aktif"
              type="email"
              placeholder="nama@pondok.id"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />

            <Input
              label="Nomor WhatsApp"
              type="tel"
              placeholder="08123456789"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              required
            />

            <div className="flex flex-col space-y-1.5">
              <label className="font-label-md text-label-md text-on-surface">
                Peran yang Diajukan
              </label>
              <select
                className="flex h-12 w-full rounded-xl border border-input-border bg-card px-3.5 py-2 text-[16px] text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={formData.roleRequested}
                onChange={(e) =>
                  setFormData({ ...formData, roleRequested: e.target.value })
                }
              >
                <option value="santri">Santri Digitalpreneur</option>
                <option value="pengurus">Pengurus / Reviewer</option>
                <option value="koordinator">Koordinator Tim</option>
              </select>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              Kirim Pengajuan Akun
            </Button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-border text-center">
          <Link
            href="/login"
            className="text-primary font-label-md text-[13px] hover:underline"
          >
            Sudah memiliki akun? Masuk di sini
          </Link>
        </div>
      </div>
    </div>
  );
}
