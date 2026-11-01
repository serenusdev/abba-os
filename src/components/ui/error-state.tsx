import * as React from "react";
import { Button } from "./button";
import { Illustration } from "./illustration";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  illustration?: string;
  /** Accessible alt text for the illustration. If omitted, the illustration is
   *  treated as decorative (aria-hidden). Falls back to `title` when provided. */
  illustrationAlt?: string;
  size?: "sm" | "md" | "lg";
  align?: "left" | "center";
  className?: string;
}

const sizeMap = {
  sm: { illustration: { width: 90, height: 64 }, minHeight: "min-h-[200px]" },
  md: { illustration: { width: 130, height: 90 }, minHeight: "min-h-[280px]" },
  lg: { illustration: { width: 180, height: 128 }, minHeight: "min-h-[360px]" },
};

export function ErrorState({
  title = "Terjadi Kendala Memuat Data",
  description = "Sistem tidak dapat terhubung ke server atau terjadi galat internal. Silakan coba kembali.",
  onRetry,
  illustration = "/illustrations/undraw_connection-failed_obln.svg",
  illustrationAlt,
  size = "md",
  align = "center",
  className,
}: ErrorStateProps) {
  const { illustration: ilSize, minHeight } = sizeMap[size];
  const isCenter = align === "center";

  // If illustrationAlt is explicitly passed, use it (meaningful). Otherwise treat as decorative.
  const imgAlt =
    illustrationAlt !== undefined ? illustrationAlt : illustration ? "" : title ?? "";

  return (
    <div
      className={cn(
        "flex flex-col p-8 rounded-2xl bg-card border border-border shadow-sm",
        isCenter ? "items-center justify-center text-center" : "items-start justify-start text-left",
        minHeight,
        className
      )}
    >
      {illustration ? (
        <Illustration
          src={illustration}
          alt={imgAlt}
          width={ilSize.width}
          height={ilSize.height}
          className="mb-3"
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
