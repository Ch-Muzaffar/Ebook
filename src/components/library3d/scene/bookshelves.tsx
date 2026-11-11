"use client";

import { useMemo } from "react";
import { HALL, type QualityTier, QUALITY, type ScenePalette } from "../scene-config";
import { InstancedBoxes, type BoxInstance } from "./instanced-boxes";
import type { SceneTextures } from "./scene-textures";
import { seededRandom } from "./seeded-random";

const UNIT_GAP = 0.3; // space for the columns between shelf units

/** z-centre of shelf unit k (0 = nearest the entrance). Shared with the architecture. */
export function unitCenterZ(k: number) {
  return HALL.front - 1.2 - k * (HALL.unitWidth + UNIT_GAP);
}

export function unitCount(tier: QualityTier) {
  const max = Math.floor((HALL.front - 1.2 - (HALL.back + 1.5)) / (HALL.unitWidth + UNIT_GAP)) + 1;
  return Math.min(QUALITY[tier].shelfUnitsPerSide, max);
}

/**
 * Two walls of bookshelves lining the aisle. Frames and books are generated
 * procedurally (deterministic) and drawn as two instanced meshes.
 */
export function Bookshelves({ tier, palette, textures }: { tier: QualityTier; palette: ScenePalette; textures: SceneTextures }) {
  const { frames, books } = useMemo(() => buildShelves(tier, palette.bookSpines), [tier, palette.bookSpines]);
  const shadows = QUALITY[tier].shadows;
  return (
    <group>
      <InstancedBoxes boxes={frames} color={palette.wood} roughness={0.7} receiveShadow={shadows} map={textures.wood} />
      {/* Leather spines: one texture (bands, gilt rules, grain) tinted per book. */}
      <InstancedBoxes boxes={books} roughness={0.62} castShadow={false} receiveShadow={shadows} map={textures.spine} />
    </group>
  );
}

function buildShelves(tier: QualityTier, spines: readonly string[]) {
  const rand = seededRandom(7);
  const { booksPerShelf } = QUALITY[tier];
  const frames: BoxInstance[] = [];
  const books: BoxInstance[] = [];
  const gap = HALL.shelfHeight / HALL.shelvesPerUnit;
  const units = unitCount(tier);

  for (const side of [-1, 1] as const) {
    // Inner face of the shelf: books stand between the wall and this plane.
    const wallX = side * HALL.halfWidth;
    const midX = wallX - side * (HALL.shelfDepth / 2);

    for (let k = 0; k < units; k++) {
      const zc = unitCenterZ(k);
      const halfW = HALL.unitWidth / 2;

      // Back panel, two side panels, horizontal boards.
      frames.push({ position: [wallX - side * 0.015, HALL.shelfHeight / 2, zc], scale: [0.03, HALL.shelfHeight, HALL.unitWidth] });
      for (const s of [-1, 1]) {
        frames.push({ position: [midX, HALL.shelfHeight / 2, zc + s * (halfW - 0.025)], scale: [HALL.shelfDepth, HALL.shelfHeight, 0.05] });
      }
      for (let j = 0; j <= HALL.shelvesPerUnit; j++) {
        frames.push({ position: [midX, Math.min(j * gap, HALL.shelfHeight - 0.02), zc], scale: [HALL.shelfDepth, 0.04, HALL.unitWidth - 0.05] });
      }

      // Books on each shelf, packed along z with occasional gaps and leaning volumes.
      for (let j = 0; j < HALL.shelvesPerUnit; j++) {
        const baseY = j * gap + 0.02;
        let z = zc - halfW + 0.07;
        const end = zc + halfW - 0.07;
        let placed = 0;
        while (z < end && placed < booksPerShelf) {
          const w = 0.05 + rand() * 0.06;
          if (z + w > end) break;
          if (rand() < 0.07) {
            z += 0.08 + rand() * 0.12; // deliberate gap
            continue;
          }
          const h = gap * (0.55 + rand() * 0.32);
          const d = 0.22 + rand() * 0.1;
          const lean = rand() < 0.04 ? side * 0.18 : 0;
          books.push({
            position: [wallX - side * (0.04 + d / 2), baseY + h / 2, z + w / 2],
            scale: [d, h, w],
            rotationZ: lean,
            color: spines[Math.floor(rand() * spines.length)],
          });
          z += w + 0.004;
          placed++;
        }
      }
    }
  }
  return { frames, books };
}
