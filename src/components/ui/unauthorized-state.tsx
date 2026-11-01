import * as React from "react";
import Link from "next/link";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export interface UnauthorizedStateProps {
  requiredRole?: string;
  className?: string;
}

export function UnauthorizedState({
  requiredRole,
  className,
}: UnauthorizedStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 rounded-xl bg-card border border-border min-h-[300px] shadow-sm max-w-lg mx-auto my-6",
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-surface-container-high text-tertiary flex items-center justify-center mb-3">
        <span className="material-symbols-outlined text-[32px]">lock</span>
      </div>
      <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1">
        Akses Terbatas
      </h3>
      <p className="font-body-sm text-body-sm text-muted-foreground mb-4">
        Halaman atau fitur ini membutuhkan kewenangan otorisasi khusus{" "}
        {requiredRole ? `(peran: ${requiredRole})` : ""} yang tidak terdaftar pada akun Anda saat ini.
      </p>
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="primary">Kembali ke Beranda</Button>
        </Link>
        <Link href="/login">
          <Button variant="outline">Ganti Akun</Button>
        </Link>
      </div>
    </div>
  );
}
