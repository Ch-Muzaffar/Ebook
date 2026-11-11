import { ImageResponse } from "next/og";

/** App icon, served at /icon — also the logo in the homepage Organization structured data. */
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#252522",
          color: "#f8f5ef",
          fontFamily: "serif",
          fontSize: 300,
          borderRadius: 96,
        }}
      >
        D
      </div>
    ),
    size,
  );
}
