"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Illustration } from "@/components/ui/illustration";
import { createClient } from "@/lib/supabase/client";
import { ensureSuperAdminAccountAction } from "@/modules/iam/actions";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("serenusdev.op@gmail.com");
  const [password, setPassword] = React.useState("Anzhaer_25");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const supabase = createClient();
      let { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      // Auto-provision fallback for super admin on first login attempt
      if (error && email.trim().toLowerCase() === "serenusdev.op@gmail.com") {
        const provisionRes = await ensureSuperAdminAccountAction();
        if (provisionRes.success) {
          const retry = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          data = retry.data;
          error = retry.error;
        }
      }

      if (error) {
        if (
          error.message.includes("Invalid login credentials") ||
          error.message.includes("invalid_grant")
        ) {
          setErrorMessage("Email atau password yang Anda masukkan salah.");
        } else if (error.message.includes("Email not confirmed")) {
          setErrorMessage("Email Anda belum dikonfirmasi. Silakan periksa inbox email Anda.");
        } else {
          setErrorMessage(error.message);
        }
        setIsLoading(false);
        return;
      }

      if (data.user) {
        router.push("/");
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat masuk ke sistem.";
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-12 max-w-4xl">
        {/* Decorative side illustration — desktop only */}
        <div className="hidden lg:flex flex-col items-center justify-center gap-4 shrink-0" aria-hidden="true">
          <Illustration
            src="/illustrations/undraw_private-data_934y.svg"
            alt=""
            width={220}
            height={205}
          />
          <p className="text-sm text-muted-foreground text-center max-w-[220px] leading-relaxed">
            Platform operasional santri yang aman dan terpercaya.
          </p>
        </div>

        {/* Login card */}
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
          <div className="mb-4 p-3 rounded-xl bg-error/15 border border-error/30 text-error text-[13px] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Alamat Email"
            type="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <div className="space-y-1.5">
            <Input
              label="Kata Sandi"
              type="password"
              placeholder="Masukkan kata sandi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            disabled={isLoading}
          >
            {isLoading ? "Memproses Autentikasi..." : "Masuk ke Sistem"}
          </Button>
        </form>

        {/* Temporary Super Admin Info Box */}
        <div className="mt-4 p-3 rounded-xl bg-surface-container border border-border text-[12px] flex items-center justify-between">
          <div className="flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
            <div>
              <p className="font-semibold text-primary">Kredensial Super Admin Sementara</p>
              <p className="text-muted-foreground font-mono">serenusdev.op@gmail.com</p>
            </div>
          </div>
          <span className="text-[11px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            Auto-fill
          </span>
        </div>

        {/* Pathway to registration */}
        <div className="mt-6 pt-6 border-t border-border text-center">
          <p className="font-body-sm text-[13px] text-muted-foreground">
            Belum memiliki akun santri atau pengurus?{" "}
            <Link
              href="/register"
              className="text-primary font-semibold hover:underline"
            >
              Ajukan Akun Baru
            </Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
