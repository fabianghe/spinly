import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#1a1027", display: "flex", position: "relative" }}>
        <div style={{ position: "absolute", left: 26, top: 40, width: 84, height: 100, borderRadius: 22, background: "#ff5a7a" }} />
        <div
          style={{
            position: "absolute",
            left: 76,
            top: 68,
            width: 78,
            height: 84,
            borderRadius: 22,
            background: "#46e3d0",
            border: "10px solid #1a1027",
          }}
        />
      </div>
    ),
    size,
  );
}
