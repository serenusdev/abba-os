import Image from "next/image";
import { cn } from "@/lib/utils";

export interface IllustrationProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export function Illustration({
  src,
  alt,
  className,
  width = 160,
  height = 110,
  priority = false,
}: IllustrationProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center shrink-0 mx-auto select-none pointer-events-none",
        className
      )}
      style={{
        width: width,
        height: height,
        maxWidth: "100%",
      }}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        style={{
          width: "auto",
          height: "100%",
          maxHeight: `${height}px`,
          maxWidth: `${width}px`,
          objectFit: "contain",
        }}
        priority={priority}
        unoptimized
      />
    </div>
  );
}
