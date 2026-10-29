import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const alt = `${siteConfig.name} — Random video chat with strangers`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social share card (Facebook, X, WhatsApp, Discord, iMessage…). */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#1a1027",
          color: "#f4eeff",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 640 }}>
          <div style={{ fontSize: 40, fontWeight: 800 }}>{siteConfig.name}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 0.95, letterSpacing: -3 }}>Say hi to someone new.</div>
            <div style={{ fontSize: 32, color: "#a898c2", marginTop: 28 }}>Free random video chat. One tap to start.</div>
          </div>
        </div>
        <div style={{ display: "flex", position: "relative", width: 420, marginLeft: 20 }}>
          <div style={{ position: "absolute", left: 20, top: 10, width: 340, height: 420, borderRadius: 48, background: "#2a1b3d", display: "flex" }}>
            <div style={{ position: "absolute", left: 70, bottom: 0, width: 200, height: 170, borderTopLeftRadius: 100, borderTopRightRadius: 100, background: "#ff5a7a" }} />
            <div style={{ position: "absolute", left: 115, bottom: 140, width: 110, height: 110, borderRadius: 999, background: "#ff5a7a" }} />
          </div>
          <div style={{ position: "absolute", right: 0, bottom: 20, width: 160, height: 200, borderRadius: 32, background: "#46e3d0", border: "10px solid #1a1027" }} />
        </div>
      </div>
    ),
    size,
  );
}
