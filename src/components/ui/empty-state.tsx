import * as React from "react";
import { Button } from "./button";
import { Illustration } from "./illustration";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: string;
  illustration?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon = "inbox",
  illustration,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 rounded-2xl bg-card border border-dashed border-border min-h-[260px]",
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
        <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-primary mb-3">
          <span className="material-symbols-outlined text-[28px]">{icon}</span>
        </div>
      )}
      <h4 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-1">
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
