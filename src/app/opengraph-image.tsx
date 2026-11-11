import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

/** Default social-share image for every page that doesn't set its own (books/articles use their cover). */
export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #f8f5ef 0%, #efe7da 100%)",
          color: "#252522",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 260,
            height: 360,
            position: "absolute",
            top: 90,
            borderTopLeftRadius: 130,
            borderTopRightRadius: 130,
            border: "2px solid rgba(184,146,74,0.45)",
          }}
        />
        <div style={{ fontSize: 28, letterSpacing: 8, textTransform: "uppercase", color: "#8a6a2f", display: "flex" }}>
          Books &amp; Ideas
        </div>
        <div style={{ fontSize: 96, marginTop: 24, display: "flex" }}>{siteConfig.name}</div>
        <div style={{ fontSize: 34, marginTop: 24, color: "#6b675f", display: "flex" }}>{siteConfig.tagline}</div>
      </div>
    ),
    size,
  );
}
