"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, type Points } from "three";
import { HALL, type QualityTier, type ScenePalette } from "../scene-config";
import type { SceneStateRef } from "../scroll-store";
import type { SceneTextures } from "./scene-textures";
import { seededRandom } from "./seeded-random";

/**
 * Dust drifting in the window light. Animated only on the high tier, while the hall is on screen and
 * the visitor is interacting (each animated frame requests the next until shortly after input
 * stops), so idle pages draw nothing. The low tier shows the same motes, still.
 */
export function DustMotes({
  tier,
  palette,
  textures,
  stateRef,
}: {
  tier: QualityTier;
  palette: ScenePalette;
  textures: SceneTextures;
  stateRef: SceneStateRef;
}) {
  const ref = useRef<Points>(null);
  const count = tier === "high" ? 260 : 120;
  const animate = tier === "high";

  const { geometry, seeds } = useMemo(() => {
    const rand = seededRandom(91);
    const pos = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand() - 0.5) * (HALL.halfWidth * 1.6);
      pos[i * 3 + 1] = 0.3 + rand() * 3.6;
      pos[i * 3 + 2] = HALL.back + 1 + rand() * (HALL.front - HALL.back);
      seeds[i] = rand() * Math.PI * 2;
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    return { geometry: g, seeds };
  }, [count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock, invalidate }) => {
    if (!animate) return;
    const state = stateRef.current;
    // Drift only while the visitor is scrolling/moving (plus a short tail) — then the scene idles.
    if (!state.visible || performance.now() > state.activeUntil) return;
    const pts = ref.current;
    if (!pts) return;
    const t = clock.getElapsedTime();
    const attr = pts.geometry.getAttribute("position") as BufferAttribute;
    const a = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const s = seeds[i];
      a[i * 3] += Math.sin(t * 0.21 + s) * 0.0009;
      a[i * 3 + 1] += 0.0011 + Math.cos(t * 0.17 + s) * 0.0007;
      if (a[i * 3 + 1] > 4) a[i * 3 + 1] = 0.3;
    }
    attr.needsUpdate = true;
    invalidate(); // keep drifting while visible
  });

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        map={textures.dot}
        color={palette.dust}
        size={tier === "high" ? 0.035 : 0.045}
        sizeAttenuation
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
