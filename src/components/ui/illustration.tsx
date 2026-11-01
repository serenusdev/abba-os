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
  width = 240,
  height = 180,
  priority = false,
}: IllustrationProps) {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="w-auto h-auto max-w-full max-h-full object-contain select-none pointer-events-none"
        priority={priority}
        unoptimized
      />
    </div>
  );
}

