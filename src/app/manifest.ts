import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Le Petit Monde d’Isabelle",
    short_name: "Petit Monde",
    description: "Le petit univers tout doux d’Isabelle 🎀",
    start_url: "/home",
    display: "standalone",
    background_color: "#FFF0F6",
    theme_color: "#FF8DC0",
    lang: "fr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
