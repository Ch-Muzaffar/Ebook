"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { MeshStandardMaterial } from "three";
import { BOOK_SIZE, PALETTE } from "../scene-config";
import { createCoverTexture, type CoverSpec } from "./cover-texture";

const BOARD = 0.014;

/**
 * A hardcover book: front/back boards, spine and a cream page block. The front board shows a
 * typographic cover texture. Origin is the book's centre; the cover faces +z, spine on -x.
 */
export function BookModel({ cover, castShadow = false }: { cover: CoverSpec; castShadow?: boolean }) {
  const gl = useThree((s) => s.gl);
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
