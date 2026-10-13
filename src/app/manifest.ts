import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Health Zzang",
    short_name: "헬스짱",
    description: "운동 크루 인증 & 벌금 집계",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f7",
    theme_color: "#2563eb",
    icons: [
      { src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
