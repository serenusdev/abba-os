import * as React from "react";
import { Button } from "./button";
import { Illustration } from "./illustration";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  illustration?: string;
  className?: string;
}

export function ErrorState({
  title = "Terjadi Kendala Memuat Data",
  description = "Sistem tidak dapat terhubung ke server atau terjadi galat internal. Silakan coba kembali.",
  onRetry,
  illustration = "/illustrations/undraw_connection-failed_obln.svg",
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 rounded-2xl bg-card border border-border min-h-[280px] shadow-sm",
        className
      )}
    >
      {illustration ? (
        <Illustration
          src={illustration}
          alt={title}
          width={180}
          height={130}
          className="mb-4 max-h-[140px]"
        />
      ) : (
        <div className="w-12 h-12 rounded-2xl bg-error-container text-on-error-container flex items-center justify-center mb-3">
          <span className="material-symbols-outlined text-[28px]">error</span>
        </div>
      )}
      <h4 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-1">
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
