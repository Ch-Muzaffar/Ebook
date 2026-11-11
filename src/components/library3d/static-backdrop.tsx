/**
 * Pure-CSS library backdrop: an arched window glowing at the end of a hall flanked by shelves.
 * It is the first paint (before 3D loads), the loading placeholder, and the full fallback when
 * WebGL is unavailable or reduced motion is requested. No images to download.
 */
export function StaticLibraryBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-ivory">
      {/* Warm floor glow */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_at_50%_100%,var(--color-beige),transparent_70%)]" />
      {/* Arched window */}
      <div className="absolute left-1/2 top-[18%] h-[46%] w-[min(22vw,11rem)] -translate-x-1/2 rounded-t-full bg-(--window-fill) shadow-[0_0_120px_40px_var(--window-glow)] ring-1 ring-line/50" />
      {/* Shelf walls receding toward the window */}
      <ShelfWall side="left" />
      <ShelfWall side="right" />
    </div>
  );
}

function ShelfWall({ side }: { side: "left" | "right" }) {
  const isLeft = side === "left";
  return (
    <div
      className="absolute inset-y-0 w-[34%] opacity-70"
      style={{
        [isLeft ? "left" : "right"]: 0,
        // Repeating horizontal shelves + vertical book spines, fading into the distance.
        backgroundImage: [
          "repeating-linear-gradient(to bottom, transparent 0 calc(16.66% - 3px), var(--color-line) calc(16.66% - 3px) 16.66%)",
          "repeating-linear-gradient(to right, color-mix(in oklab, var(--color-charcoal) 6%, transparent) 0 6px, transparent 6px 9px, color-mix(in oklab, var(--color-gold) 14%, transparent) 9px 14px, transparent 14px 18px)",
        ].join(","),
        maskImage: `linear-gradient(to ${isLeft ? "right" : "left"}, black, transparent)`,
        clipPath: isLeft ? "polygon(0 0, 100% 22%, 100% 78%, 0 100%)" : "polygon(0 22%, 100% 0, 100% 100%, 0 78%)",
      }}
    />
  );
}
