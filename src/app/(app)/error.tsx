"use client";

import * as React from "react";
import { Illustration } from "@/components/ui/illustration";

/**
 * Next.js App Router error boundary for the (app) route group.
 * Shown when a server component or page throws an unhandled error.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("App error boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-background px-4 text-center">
      <Illustration
        src="/illustrations/undraw_bug-detected_71if.svg"
        alt="Terjadi kesalahan"
        width={160}
        height={110}
      />
      <div className="flex flex-col items-center gap-2 max-w-sm">
        <p className="font-headline-sm text-[18px] font-semibold text-on-surface">
          Terjadi Kesalahan
        </p>
        <p className="font-body-sm text-[13px] text-muted-foreground leading-relaxed">
          Halaman ini tidak dapat dimuat saat ini. Coba muat ulang, atau hubungi administrator jika masalah berlanjut.
        </p>
        {error?.digest && (
          <p className="font-mono text-[11px] text-muted-foreground/60 mt-1">
            Kode: {error.digest}
          </p>
        )}
      </div>
      <button
        onClick={reset}
        className="h-11 px-6 rounded-xl bg-primary text-on-primary font-label-md text-sm font-semibold flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity"
        type="button"
      >
        <span className="material-symbols-outlined text-[18px]">refresh</span>
        Muat Ulang Halaman
      </button>
    </div>
  );
}
