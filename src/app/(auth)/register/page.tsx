"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitAccountApplicationAction } from "@/modules/iam/actions";

export default function RegisterPage() {
  const [submitted, setSubmitted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [formData, setFormData] = React.useState({
    fullName: "",
    email: "",
    phone: "",
    roleRequested: "santri",
    teamName: "Sentra Santri",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    const res = await submitAccountApplicationAction({
      fullName: formData.fullName,
      email: formData.email,
      phoneNumber: formData.phone,
      roleRequested: formData.roleRequested,
      teamRequested: formData.teamName,
      notes: formData.notes,
    });

    setIsLoading(false);
    if (res.success) {
      setSubmitted(true);
    } else {
      setErrorMessage(res.message);
    }
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
            Pendaftaran santri baru atau pengurus wajib melalui verifikasi Super Admin
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-error/15 border border-error/30 text-error text-[13px] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {submitted ? (
          <div className="flex flex-col items-center text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-success/15 text-success flex items-center justify-center border border-success/30">
              <span className="material-symbols-outlined text-[32px]">check_circle</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                Pengajuan Berhasil Dikirim
              </h3>
              <p className="font-body-sm text-body-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Permohonan akun Anda telah masuk ke antrean verifikasi IAM. Administrator pondok akan meninjau dan mengaktifkan akun Anda.
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
              type="text"
              placeholder="Contoh: Ahmad Zaki"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              required
            />

            <Input
              label="Alamat Email"
              type="email"
              placeholder="nama@email.com"
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-label-sm text-label-sm text-on-surface block">
                  Peran yang Diajukan
                </label>
                <select
                  value={formData.roleRequested}
                  onChange={(e) =>
                    setFormData({ ...formData, roleRequested: e.target.value })
                  }
                  className="w-full h-11 px-3 rounded-xl bg-surface-container text-on-surface font-body-md text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="santri">Santri</option>
                  <option value="koordinator">Koordinator Tim</option>
                  <option value="pengurus">Pengurus Harian</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-label-sm text-label-sm text-on-surface block">
                  Penempatan Tim / Sentra
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Tim Media / IT"
                  value={formData.teamName}
                  onChange={(e) =>
                    setFormData({ ...formData, teamName: e.target.value })
                  }
                  className="w-full h-11 px-3 rounded-xl bg-surface-container text-on-surface font-body-md text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-label-sm text-label-sm text-on-surface block">
                Catatan Permohonan (Opsional)
              </label>
              <textarea
                rows={2}
                placeholder="Alasan pendaftaran atau rekomendasi ustadz..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full p-3 rounded-xl bg-surface-container text-on-surface font-body-md text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              disabled={isLoading}
            >
              {isLoading ? "Mengirimkan Permohonan..." : "Kirim Pengajuan Akun"}
            </Button>

            <div className="pt-4 border-t border-border text-center">
              <p className="font-body-sm text-[13px] text-muted-foreground">
                Sudah memiliki akun?{" "}
                <Link
                  href="/login"
                  className="text-primary font-semibold hover:underline"
                >
                  Masuk ke Sistem
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
