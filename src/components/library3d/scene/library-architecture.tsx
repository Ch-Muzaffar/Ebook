"use client";

import { useMemo } from "react";
import { AdditiveBlending, DoubleSide, Shape } from "three";
import { HALL, QUALITY, type QualityTier, type ScenePalette, type SceneTheme } from "../scene-config";
import { unitCenterZ, unitCount } from "./bookshelves";
import { InstancedBoxes, type BoxInstance } from "./instanced-boxes";
import type { SceneTextures } from "./scene-textures";

/** z positions of the brass pendant lamps hanging over the aisle. */
export function lampPositions(tier: QualityTier): [number, number, number][] {
  const zs = tier === "high" ? [3.4, -2.6, -8.6, -14.2] : [3.4, -4.6, -12];
  return zs.map((z) => [0, 3.55, z]);
}

/**
 * Floor (planked), patterned aisle runner, columns and beams (wood grain), plastered end wall,
 * the glowing arched window with light shafts falling through the hall, and pendant lamps.
 */
export function LibraryArchitecture({
  tier,
  palette,
  theme,
  textures,
}: {
  tier: QualityTier;
  palette: ScenePalette;
  theme: SceneTheme;
  textures: SceneTextures;
}) {
  const shadows = QUALITY[tier].shadows;
  const dark = theme === "dark";

  const timber = useMemo(() => {
    const boxes: BoxInstance[] = [];
    const units = unitCount(tier);
    for (let k = 0; k <= units; k++) {
      // Boundary between units k-1 and k.
      const z = unitCenterZ(k) + (HALL.unitWidth + 0.3) / 2;
      for (const side of [-1, 1]) {
        boxes.push({ position: [side * (HALL.halfWidth - 0.1), HALL.beamHeight / 2, z], scale: [0.26, HALL.beamHeight, 0.26] });
        // Carved capital + plinth on each column.
        boxes.push({ position: [side * (HALL.halfWidth - 0.1), HALL.beamHeight - 0.12, z], scale: [0.36, 0.1, 0.36] });
        boxes.push({ position: [side * (HALL.halfWidth - 0.1), 0.08, z], scale: [0.34, 0.16, 0.34] });
      }
      boxes.push({ position: [0, HALL.beamHeight, z], scale: [HALL.halfWidth * 2 + 0.2, 0.2, 0.24] });
    }
    return boxes;
  }, [tier]);

  const archShape = useMemo(() => {
    // Tall arched window: rectangle with a semicircular top.
    const w = 1.5;
    const h = 3.1;
    const s = new Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(w / 2, h);
    s.absarc(0, h, w / 2, 0, Math.PI, false);
    s.lineTo(-w / 2, 0);
    return s;
  }, []);

  const length = HALL.front - HALL.back + 8;
  const midZ = (HALL.front + HALL.back) / 2;

  return (
    <group>
      {/* Planked floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, midZ]} receiveShadow={shadows}>
        <planeGeometry args={[HALL.halfWidth * 2 + 6, length]} />
        <meshStandardMaterial color={palette.floor} roughness={dark ? 0.55 : 0.8} map={textures.floor} />
      </mesh>
      {/* Aisle runner with a gold border */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, midZ]} receiveShadow={shadows}>
        <planeGeometry args={[1.6, length]} />
        <meshStandardMaterial color="#b49a67" roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, midZ]} receiveShadow={shadows}>
        <planeGeometry args={[1.44, length]} />
        <meshStandardMaterial color={palette.runner} roughness={1} />
      </mesh>

      {/* Ceiling between the beams (faces down) — avoids an empty void above the hall. */}
      <mesh rotation-x={Math.PI / 2} position={[0, HALL.beamHeight + 0.1, midZ]}>
        <planeGeometry args={[HALL.halfWidth * 2 + 6, length]} />
        <meshStandardMaterial color={palette.ceiling} roughness={1} map={textures.plaster} />
      </mesh>

      <InstancedBoxes boxes={timber} color={palette.woodDark} roughness={0.6} castShadow={shadows} receiveShadow={shadows} map={textures.wood} />

      {/* End wall with a softly glowing arched window — the visual focal point. */}
      <mesh position={[0, HALL.beamHeight / 2, HALL.back]}>
        <planeGeometry args={[HALL.halfWidth * 2 + 2, HALL.beamHeight + 2]} />
        <meshStandardMaterial color={palette.wall} roughness={1} map={textures.plaster} />
      </mesh>
      <mesh position={[0, 0.5, HALL.back + 0.01]}>
        <shapeGeometry args={[archShape, 24]} />
        <meshBasicMaterial color={palette.window} toneMapped={false} />
      </mesh>
      {/* Window mullions */}
      <mesh position={[0, 2.05, HALL.back + 0.02]}>
        <boxGeometry args={[0.05, 3.1, 0.02]} />
        <meshStandardMaterial color={palette.woodDark} />
      </mesh>
      <mesh position={[0, 2.3, HALL.back + 0.02]}>
        <boxGeometry args={[1.5, 0.05, 0.02]} />
        <meshStandardMaterial color={palette.woodDark} />
      </mesh>

      {/* Light shafts from the window, falling toward the entrance (additive, no depth write). */}
      {[-0.42, 0, 0.42].map((x, i) => (
        <mesh key={x} position={[x * 1.4, 2.0, HALL.back + 5.5]} rotation={[-0.32, 0, x * 0.18]}>
          <planeGeometry args={[1.1 - i * 0.12, 11]} />
          <meshBasicMaterial
            map={textures.shaft}
            color={palette.shaft}
            transparent
            opacity={dark ? 0.16 : 0.22}
            blending={AdditiveBlending}
            depthWrite={false}
            side={DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* Brass pendant lamps over the aisle — glowing warmly in the dark theme. */}
      {lampPositions(tier).map(([x, y, z]) => (
        <group key={z} position={[x, y, z]}>
          <mesh position={[0, (HALL.beamHeight - y) / 2, 0]}>
            <cylinderGeometry args={[0.008, 0.008, HALL.beamHeight - y, 6]} />
            <meshStandardMaterial color="#2a2018" />
          </mesh>
          <mesh>
            <coneGeometry args={[0.24, 0.22, 24, 1, true]} />
            <meshStandardMaterial color="#b49a67" metalness={0.85} roughness={0.32} side={DoubleSide} />
          </mesh>
          <mesh position={[0, -0.08, 0]}>
            <sphereGeometry args={[0.07, 16, 12]} />
            <meshBasicMaterial color={palette.lampGlow} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
