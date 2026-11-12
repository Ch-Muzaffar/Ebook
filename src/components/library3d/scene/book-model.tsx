"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { CanvasTexture, MeshStandardMaterial, SRGBColorSpace } from "three";
import { BOOK_SIZE, PALETTE } from "../scene-config";
import { createCoverTexture, type CoverSpec } from "./cover-texture";

const BOARD = 0.014;
const COVER_W = 512;
const COVER_H = 768;

// Cover images still loading, exposed as <html data-covers-pending> so scripts/scene-check.mjs
// knows when the scene can legitimately go idle.
let pendingCovers = 0;
function trackCoverLoad(delta: number) {
  pendingCovers = Math.max(0, pendingCovers + delta);
  document.documentElement.dataset.coversPending = String(pendingCovers);
}

/**
 * A hardcover book: front/back boards, spine and a cream page block. The front board shows a
 * typographic cover texture, replaced by the real cover image (if any) once it has loaded.
 * Origin is the book's centre; the cover faces +z, spine on -x.
 */
export function BookModel({ cover, castShadow = false }: { cover: CoverSpec; castShadow?: boolean }) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const { width: w, height: h, depth: d } = BOOK_SIZE;

  const materials = useMemo(() => {
    const texture = createCoverTexture(cover, gl.capabilities.getMaxAnisotropy());
    const board = new MeshStandardMaterial({ color: cover.background, roughness: 0.7 });
    const front = new MeshStandardMaterial({ map: texture, roughness: 0.65 });
    const pages = new MeshStandardMaterial({ color: PALETTE.pages, roughness: 1 });
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z
    return { texture, board, pages, frontFaces: [board, board, board, board, front, board], front };
  }, [cover, gl]);

  // Textures/materials created imperatively must be disposed manually (PRD §14.19).
  useEffect(
    () => () => {
      materials.texture.dispose();
      materials.board.dispose();
      materials.front.dispose();
      materials.pages.dispose();
    },
    [materials],
  );

  // Real cover image: load it (CORS-enabled storage URL or site path), draw it down to the
  // typographic texture's size (uploaded covers can be multi-MB, 1600×2400+; a full-size texture
  // is slow to upload and wastes GPU memory), and swap it onto the front board. The typographic
  // texture stays as the placeholder, and as the fallback if loading fails.
  useEffect(() => {
    if (!cover.image) return;
    let cancelled = false;
    let loaded: CanvasTexture | undefined;
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      trackCoverLoad(-1);
    };
    trackCoverLoad(1);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onerror = settle;
    img.onload = () => {
      settle();
      if (cancelled) return;
      const canvas = document.createElement("canvas");
      canvas.width = COVER_W;
      canvas.height = COVER_H;
      canvas.getContext("2d")!.drawImage(img, 0, 0, COVER_W, COVER_H);
      const tex = new CanvasTexture(canvas);
      tex.colorSpace = SRGBColorSpace;
      tex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
      loaded = tex;
      materials.front.map = tex;
      materials.front.needsUpdate = true;
      invalidate();
    };
    img.src = cover.image;
    return () => {
      cancelled = true;
      img.onload = img.onerror = null;
      settle();
      loaded?.dispose();
    };
  }, [cover.image, materials, gl, invalidate]);

  return (
    <group>
      <mesh position={[0, 0, d / 2 - BOARD / 2]} material={materials.frontFaces} castShadow={castShadow}>
        <boxGeometry args={[w, h, BOARD]} />
      </mesh>
      <mesh position={[0, 0, -d / 2 + BOARD / 2]} material={materials.board} castShadow={castShadow}>
        <boxGeometry args={[w, h, BOARD]} />
      </mesh>
      <mesh position={[-w / 2 + BOARD / 2, 0, 0]} material={materials.board}>
        <boxGeometry args={[BOARD, h, d]} />
      </mesh>
      <mesh position={[0.006, 0, 0]} material={materials.pages}>
        <boxGeometry args={[w - BOARD * 2, h - 0.03, d - BOARD * 2]} />
      </mesh>
    </group>
  );
}
