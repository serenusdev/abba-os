import * as React from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Terjadi Kendala Memuat Data",
  description = "Sistem tidak dapat terhubung ke server atau terjadi galat internal. Silakan coba kembali.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 rounded-xl bg-card border border-border min-h-[240px] shadow-sm",
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-error-container text-on-error-container flex items-center justify-center mb-3">
        <span className="material-symbols-outlined text-[28px]">error</span>
      </div>
      <h4 className="font-headline-sm text-headline-sm text-on-surface mb-1">
        {title}
      </h4>
      <p className="font-body-sm text-body-sm text-muted-foreground max-w-md mb-4">
        {description}
      </p>
      {onRetry && (
        <Button variant="outline" size="default" onClick={onRetry} className="gap-2">
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          <span>Muat Ulang Halaman</span>
        </Button>
      )}
    </div>
  );
}

