"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password minimal 8 karakter dan harus mengandung huruf serta angka.");
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi password tidak sama.");
      return;
    }
    setLoading(true);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    if (updateError) setError("Tautan pemulihan tidak valid atau sudah kedaluwarsa.");
    else {
      setSuccess(true);
      setTimeout(() => router.replace("/login"), 1200);
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
        <Image src="/idaroh-logo.svg" alt="IDAROH" width={220} height={69} className="h-14 w-auto mx-auto object-contain" priority />
        <h1 className="text-xl font-bold text-on-surface text-center mt-5">Buat password baru</h1>
        {success ? <p className="mt-5 p-3 rounded-xl bg-success/15 text-success text-sm text-center">Password berhasil diperbarui. Mengarahkan ke login...</p> : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-5">
            {error && <p className="p-3 rounded-xl bg-error/15 text-error text-sm">{error}</p>}
            <Input label="Password baru" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
            <Input label="Ulangi password baru" type="password" required value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" />
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>{loading ? "Menyimpan..." : "Simpan password"}</Button>
          </form>
        )}
        <Link href="/login" className="block text-center text-sm text-primary font-semibold mt-5 hover:underline">Kembali ke login</Link>
      </div>
    </main>
  );
}
