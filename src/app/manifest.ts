import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IDAROH — Platform Operasional Pondok",
    short_name: "IDAROH",
    description: "Platform operasional santri, pengurus, koordinator, dan yayasan.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f3ebdd",
    theme_color: "#185c45",
    lang: "id",
    icons: [
      {
        src: "/idaroh-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/idaroh-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
