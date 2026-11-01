import * as React from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "w-7 h-7 text-[10px]",
  md: "w-8 h-8 text-[12px]",
  lg: "w-10 h-10 text-[14px]",
  xl: "w-12 h-12 text-[16px]",
};

export function Avatar({
  src,
  alt = "User",
  fallback = "U",
  size = "md",
  className,
  ...props
}: AvatarProps) {
  const [hasError, setHasError] = React.useState(false);

  const getInitials = (text: string) => {
    return text
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden flex items-center justify-center bg-accent text-accent-foreground font-label-md ring-1 ring-border flex-shrink-0 select-none",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {src && !hasError ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <span>{getInitials(fallback || alt)}</span>
      )}
    </div>
  );
}
