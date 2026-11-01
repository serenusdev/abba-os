import { cn } from "@/lib/utils";

export interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function LoadingSpinner({
  className,
  size = "md",
  label = "Memuat data...",
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-9 h-9 border-3",
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 gap-3">
      <div
        className={cn(
          "rounded-full border-primary border-t-transparent animate-spin",
          sizeMap[size],
          className
        )}
      />
      {label && (
        <p className="font-body-sm text-[13px] text-muted-foreground animate-pulse">
          {label}
        </p>
      )}
    </div>
  );
}

