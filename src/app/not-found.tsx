import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center text-primary mb-4 shadow-xs">
        <span className="material-symbols-outlined text-[36px]">travel_explore</span>
      </div>
      <h2 className="font-headline-md text-headline-md text-on-surface mb-1">
        Halaman Tidak Ditemukan
      </h2>
      <p className="font-body-sm text-body-sm text-muted-foreground max-w-sm mb-6">
        Tautan operasional yang Anda tuju tidak tersedia atau telah dipindahkan ke modul lain.
      </p>
      <Link href="/">
        <Button variant="primary" size="default">
          Kembali ke Beranda
        </Button>
      </Link>
    </div>
  );
}
