import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hibrit Vakit",
    short_name: "Hibrit Vakit",
    description: "Hibrit namaz vakitleri — Fazilet & Diyanet",
    lang: "tr",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f3ea",
    theme_color: "#0d6b5e",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
