import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-label-sm font-label-sm transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-accent-foreground",
        tepat_waktu:
          "bg-[#eaf7f0] text-success border border-success/20",
        toleransi:
          "bg-[#fdf7e7] text-[#9b6c00] border border-warning/30",
        terlambat:
          "bg-[#fdedee] text-destructive border border-destructive/20",
        menunggu:
          "bg-surface-container-high text-tertiary",
        disetujui:
          "bg-surface-container-low text-success border border-success/20",
        perlu_tindakan:
          "bg-error-container text-on-error-container",
        outline:
          "border border-border text-foreground bg-card",
        secondary:
          "bg-secondary-container text-on-secondary-container",
        tag:
          "bg-accent/60 text-accent-foreground text-[10px] uppercase tracking-wider font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: string;
}

function Badge({ className, variant, icon, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {icon && (
        <span className="material-symbols-outlined text-[13px] leading-none">
          {icon}
        </span>
      )}
      <span>{children}</span>
    </div>
  );
}

export { Badge, badgeVariants };

