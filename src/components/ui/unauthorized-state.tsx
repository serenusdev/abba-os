import * as React from "react";
import Link from "next/link";
import { Button } from "./button";
import { Illustration } from "./illustration";
import { cn } from "@/lib/utils";

export interface UnauthorizedStateProps {
  requiredRole?: string;
  className?: string;
  title?: string;
  description?: string;
}

export function UnauthorizedState({
  requiredRole,
  className,
  title = "Akses Dibatasi",
  description,
}: UnauthorizedStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 rounded-2xl bg-card border border-border min-h-[360px] shadow-sm max-w-lg mx-auto my-6",
        className
      )}
    >
      <Illustration
        src="/illustrations/undraw_action-required_pplo.svg"
        alt="Akses Dibatasi"
        width={220}
        height={160}
        className="mb-5 max-h-[160px]"
      />
      <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-2">
        {title}
      </h3>
      <p className="font-body-sm text-body-sm text-muted-foreground mb-6 max-w-sm">
        {description ||
          `Halaman atau fitur ini membutuhkan kewenangan otorisasi khusus ${
            requiredRole ? `(peran: ${requiredRole})` : ""
          } yang tidak terdaftar pada akun Anda saat ini.`}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
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
