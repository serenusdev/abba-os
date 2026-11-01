import * as React from "react";
import { Button } from "./button";
import { Illustration } from "./illustration";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: string;
  illustration?: string;
  /** Accessible alt text for the illustration. If omitted the illustration is
   *  treated as decorative (aria-hidden). Falls back to `title` when provided. */
  illustrationAlt?: string;
  title: string;
  description?: string;
  /** Optional action button. */
  action?: { label: string; onClick: () => void };
  /** @deprecated Use `action` instead. */
  actionLabel?: string;
  /** @deprecated Use `action` instead. */
  onAction?: () => void;
  size?: "sm" | "md" | "lg";
  align?: "left" | "center";
  className?: string;
}

const sizeMap = {
  sm: { illustration: { width: 90, height: 64 }, minHeight: "min-h-[180px]" },
  md: { illustration: { width: 130, height: 90 }, minHeight: "min-h-[260px]" },
  lg: { illustration: { width: 180, height: 128 }, minHeight: "min-h-[320px]" },
};

export function EmptyState({
  icon = "inbox",
  illustration,
  illustrationAlt,
  title,
  description,
  action,
  // legacy props
  actionLabel,
  onAction,
  size = "md",
  align = "center",
  className,
}: EmptyStateProps) {
  // Resolve action from either the new `action` prop or the legacy pair.
  const resolvedAction =
    action ??
    (actionLabel && onAction ? { label: actionLabel, onClick: onAction } : undefined);

  const { illustration: ilSize, minHeight } = sizeMap[size];
  const isCenter = align === "center";

  // Illustration alt: if illustrationAlt is provided it's meaningful; if omitted use empty
  // string so the img is hidden from AT (decorative fallback).
  const imgAlt =
    illustrationAlt !== undefined ? illustrationAlt : illustration ? "" : title;

  return (
    <div
      className={cn(
        "flex flex-col p-8 rounded-2xl bg-card border border-dashed border-border",
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
        <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-primary mb-3">
          <span className="material-symbols-outlined text-[28px]">{icon}</span>
        </div>
      )}
      <h4 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-1">
        {title}
      </h4>
      {description && (
        <p className="font-body-sm text-body-sm text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
      )}
      {resolvedAction && (
        <Button variant="primary" size="default" onClick={resolvedAction.onClick}>
          {resolvedAction.label}
        </Button>
      )}
    </div>
  );
}
