import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} — Random video chat`,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/chat",
    display: "standalone",
    background_color: "#1a1027",
    theme_color: "#1a1027",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
