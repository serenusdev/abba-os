import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildPdf } from "@/lib/pdf";

describe("PDF export", () => {
  it("embeds Unicode text and paginates long exports", async () => {
    const pdfBytes = await buildPdf(
      "Ekspor IDAROH — Uji Unicode",
      Array.from({ length: 100 }, (_, index) => `Baris ${index + 1}: Fájar — perubahan presensi`),
    );
    const document = await PDFDocument.load(pdfBytes);

    expect(pdfBytes.byteLength).toBeGreaterThan(1_000);
    expect(document.getPages().length).toBeGreaterThan(1);
  });
});
