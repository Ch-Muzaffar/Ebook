"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import type { Product } from "@/lib/content/types";
import { entrancePose, PALETTES, QUALITY, type QualityTier, type SceneTheme } from "../scene-config";
import type { SceneStateRef } from "../scroll-store";
import { Bookshelves } from "./bookshelves";
import { CameraRig } from "./camera-rig";
import { DustMotes } from "./dust-motes";
import { FeaturedBooks } from "./featured-books";
import { LibraryArchitecture } from "./library-architecture";
import { Lighting } from "./lighting";
import { useSceneTextures } from "./scene-textures";

export type LibraryCanvasProps = {
  stateRef: SceneStateRef;
  products: Product[];
  tier: QualityTier;
  layout: "wide" | "portrait";
  theme: SceneTheme;
  onSelect: (slug: string) => void;
  onReady: () => void;
  onContextLost: () => void;
};

/**
 * The WebGL canvas. Loaded with next/dynamic (ssr: false) so three.js never ships in the
 * initial bundle. Renders on demand only — frames are requested by scroll, pointer, the
 * camera rig while it is still moving, and the drifting dust while the hall is visible.
 */
export default function LibraryCanvas({ stateRef, products, tier, layout, theme, onSelect, onReady, onContextLost }: LibraryCanvasProps) {
  const q = QUALITY[tier];
  const palette = PALETTES[theme];
  return (
    <Canvas
      frameloop="demand"
      dpr={q.dpr}
      // "percentage" = PCFShadowMap; three r186 removed PCFSoftShadowMap (R3F's default for `true`).
      shadows={q.shadows ? "percentage" : false}
      flat // no tone mapping: keep the brand palette colours faithful
      gl={{ antialias: q.antialias, powerPreference: tier === "high" ? "high-performance" : "low-power", alpha: false }}
      camera={{ fov: layout === "wide" ? 40 : 50, near: 0.1, far: 45, position: entrancePose(layout).position }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          onContextLost();
        });
        // Fade in after the first frame has actually been drawn.
        requestAnimationFrame(() => requestAnimationFrame(onReady));
      }}
    >
      <color attach="background" args={[palette.background]} />
      <fog attach="fog" args={[palette.background, theme === "dark" ? 7 : 9, tier === "high" ? 30 : 22]} />
      <FrameBridge stateRef={stateRef} theme={theme} />
      <Scene stateRef={stateRef} products={products} tier={tier} layout={layout} theme={theme} onSelect={onSelect} />
    </Canvas>
  );
}

function Scene({
  stateRef,
  products,
  tier,
  layout,
  theme,
  onSelect,
}: Pick<LibraryCanvasProps, "stateRef" | "products" | "tier" | "layout" | "theme" | "onSelect">) {
  const textures = useSceneTextures();
  const palette = PALETTES[theme];
  return (
    <>
      <Lighting tier={tier} theme={theme} palette={palette} />
      <LibraryArchitecture tier={tier} palette={palette} theme={theme} textures={textures} />
      <Bookshelves tier={tier} palette={palette} textures={textures} />
      <DustMotes tier={tier} palette={palette} textures={textures} stateRef={stateRef} />
      <FeaturedBooks products={products} stateRef={stateRef} tier={tier} onSelect={onSelect} />
      <CameraRig stateRef={stateRef} layout={layout} bookCount={Math.min(products.length, 3)} />
    </>
  );
}

/** Exposes the canvas's `invalidate` to the DOM-side scroll controller; redraws on theme change. */
function FrameBridge({ stateRef, theme }: { stateRef: SceneStateRef; theme: SceneTheme }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const state = stateRef.current;
    state.requestFrame = () => invalidate();
    invalidate();
    return () => {
      state.requestFrame = () => {};
    };
  }, [stateRef, invalidate, theme]);
  return null;
}
