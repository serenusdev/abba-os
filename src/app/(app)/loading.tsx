import { Illustration } from "@/components/ui/illustration";

/**
 * Next.js App Router automatic Suspense fallback for the (app) route group.
 * Shown while server components in this group are resolving.
 */
export default function AppLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-background px-4">
      <Illustration
        src="/illustrations/undraw_in-progress_2mox.svg"
        alt="Menyiapkan data sistem"
        width={180}
        height={125}
        priority
      />
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="font-headline-sm text-[16px] font-semibold text-on-surface">
          Menyiapkan data sistem...
        </p>
        <p className="font-body-sm text-[13px] text-muted-foreground max-w-xs">
          Mohon tunggu sebentar sementara kami memuat informasi Anda.
        </p>
      </div>
      <div className="flex items-center gap-1.5" aria-label="Memuat">
        <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 rounded-full bg-primary animate-bounce" />
      </div>
    </div>
  );
}
