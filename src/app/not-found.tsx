import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Illustration } from "@/components/ui/illustration";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <Illustration
        src="/illustrations/undraw_bug-detected_71if.svg"
        alt="Halaman Tidak Ditemukan"
        width={260}
        height={190}
        className="mb-6 max-h-[200px]"
      />
      <h2 className="font-headline-md text-headline-md font-semibold text-on-surface mb-2">
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
