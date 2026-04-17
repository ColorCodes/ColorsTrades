import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ColorsTrades",
    short_name: "ColorsTrades",
    description: "Self-hosted prop-firm trading journal",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0b1120",
    theme_color: "#0b1120",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
