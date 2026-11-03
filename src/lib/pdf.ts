import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, type PDFPage } from "pdf-lib";
import * as fontkit from "@pdf-lib/fontkit";

/**
 * Builds a paginated PDF using an embedded Latin-ext Unicode font.
 * Keeping this outside an App Router route also avoids exporting non-handler
 * symbols that Next treats as invalid route configuration.
 */
export async function buildPdf(title: string, lines: string[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  // Resolve at runtime so Next.js keeps the binary font out of the webpack graph.
  const fontPath = path.join(
    process.cwd(),
    "node_modules",
    "@fontsource",
    "noto-sans",
    "files",
    "noto-sans-latin-ext-400-normal.woff2",
  );
  const font = await pdf.embedFont(await readFile(fontPath), { subset: true });
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 40;
  const fontSize = 9;
  const lineHeight = 14;
  const maxWidth = pageWidth - margin * 2;
  const wrapLine = (value: unknown): string[] => {
    const text = String(value ?? "");
    if (!text) return [""];
    const chunks: string[] = [];
    let chunk = "";
    for (const character of text) {
      const candidate = chunk + character;
      if (chunk && font.widthOfTextAtSize(candidate, fontSize) > maxWidth) {
        chunks.push(chunk);
        chunk = character;
      } else {
        chunk = candidate;
      }
    }
    if (chunk) chunks.push(chunk);
    return chunks;
  };

  let page: PDFPage = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin - fontSize;
  const drawLine = (text: string) => {
    if (y < margin) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin - fontSize;
    }
    page.drawText(text, { x: margin, y, size: fontSize, font });
    y -= lineHeight;
  };

  for (const line of [title, ...lines]) {
    for (const wrapped of wrapLine(line)) drawLine(wrapped);
  }

  return pdf.save();
}
