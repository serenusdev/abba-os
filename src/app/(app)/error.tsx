"use client";

import * as React from "react";
import { ErrorState } from "@/components/ui/error-state";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log error to console (or Sentry in production)
    console.error("Application Error:", error);
  }, [error]);

  return (
    <div className="py-8 max-w-lg mx-auto">
      <ErrorState
        title="Terjadi Kesalahan Sistem"
        description={
          error.message ||
          "Sistem gagal memproses data operasional. Silakan muat ulang atau periksa kembali koneksi internet Anda."
        }
        onRetry={() => reset()}
      />
    </div>
  );
}

