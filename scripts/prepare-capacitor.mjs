import { mkdir, writeFile } from "node:fs/promises";

// The Android build uses the deployed Next app through Capacitor's server.url.
// Capacitor still requires webDir to exist during sync, so keep a harmless
// local fallback shell for clean clones and offline native builds.
await mkdir("out", { recursive: true });
await writeFile(
  "out/index.html",
  "<!doctype html><html lang=\"id\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>IDAROH</title></head><body><p>IDAROH sedang memuat…</p></body></html>\n",
  "utf8"
);
