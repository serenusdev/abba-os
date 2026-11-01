"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("salman.alfarisi@pondok.id");
  const [password, setPassword] = React.useState("••••••••");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    // Simulate login delay
    setTimeout(() => {
      setIsLoading(false);
      router.push("/");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white font-bold text-xl shadow-sm mb-3">
            P
          </div>
          <h2 className="font-headline-sm text-[22px] text-on-surface font-bold">
            Pondok OS
          </h2>
          <p className="font-body-sm text-[13px] text-muted-foreground mt-1">
            Platform Operasional Santri &amp; Pengurus
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-error-container text-on-error-container text-[13px] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Alamat Email"
            type="email"
            placeholder="nama@pondok.id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Kata Sandi"
            type="password"
            placeholder="Masukkan kata sandi"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            isLoading={isLoading}
          >
            Masuk ke Sistem
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-border flex flex-col items-center gap-3">
          <p className="font-body-sm text-[13px] text-muted-foreground text-center">
            Belum memiliki akses?{" "}
            <Link
              href="/register"
              className="text-primary font-label-md hover:underline"
            >
              Ajukan Akun Baru
            </Link>
          </p>

          <span className="text-[11px] font-mono text-muted-foreground">
            Yayasan Pondok Quran Abdurrahman bin Auf • WIB
          </span>
        </div>
      </div>
    </div>
  );
}

