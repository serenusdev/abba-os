import * as React from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon = "inbox",
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 rounded-xl bg-card border border-dashed border-border min-h-[220px]",
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-primary mb-3">
        <span className="material-symbols-outlined text-[28px]">{icon}</span>
      </div>
      <h4 className="font-headline-sm text-headline-sm text-on-surface mb-1">
        {title}
      </h4>
      <p className="font-body-sm text-body-sm text-muted-foreground max-w-sm mb-4">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="default" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
