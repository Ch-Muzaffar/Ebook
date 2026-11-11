"use client";

import { HALL, QUALITY, type QualityTier, type ScenePalette, type SceneTheme } from "../scene-config";
import { lampPositions } from "./library-architecture";

/**
 * Classic Library (light): bright daylight — hemisphere fill, a key light from the entrance side
 * and window light from the far end. Modern Luxury (dark): a dim, warm evening hall lit by the
 * brass pendants and the candle-gold window. Shadows only on the high tier.
 */
export function Lighting({ tier, theme, palette }: { tier: QualityTier; theme: SceneTheme; palette: ScenePalette }) {
  const shadows = QUALITY[tier].shadows;
  const dark = theme === "dark";
  const lamps = lampPositions(tier);
  return (
    <>
      <hemisphereLight args={dark ? ["#4a3a28", "#120d08", 0.55] : ["#fff6e8", "#c8b593", 1.35]} />
      <directionalLight
        position={[3.5, 6.5, 9]}
        intensity={dark ? 0.35 : 1.25}
        color={dark ? "#ffd9a0" : "#fff3e0"}
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={1}
        shadow-camera-far={40}
      />
      <directionalLight position={[0, 5, HALL.back + 1]} intensity={dark ? 0.5 : 0.55} color={dark ? palette.window : "#fffaf0"} />
      {/* Pendant lamps light the hall at night (no shadows); by day the bulbs just glow. Only the two
          nearest cast light. The lights exist in BOTH themes (intensity 0 by day): changing the number
          of lights makes three.js recompile every shader, which froze the page on theme switch. */}
      {lamps.slice(0, 2).map(([x, y, z]) => (
        <pointLight key={z} position={[x, y - 0.15, z]} color={palette.lampGlow} intensity={dark ? 3.6 : 0} distance={9} decay={1.5} />
      ))}
    </>
  );
}
