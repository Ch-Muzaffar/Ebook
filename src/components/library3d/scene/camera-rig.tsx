"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { MathUtils, Vector3 } from "three";
import { bookPose, CAMERA_DAMPING, entrancePose, type CameraPose } from "../scene-config";
import type { SceneStateRef } from "../scroll-store";

const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * Scroll-linked camera. Scroll sets `focus` (0 = entrance, i = book i); the rig eases toward
 * the matching pose between keyframes and keeps requesting frames only until it settles
 * (frameloop="demand" — no continuous rendering while idle).
 */
export function CameraRig({
  stateRef,
  layout,
  bookCount,
}: {
  stateRef: SceneStateRef;
  layout: "wide" | "portrait";
  bookCount: number;
}) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  // All per-frame mutable values live in one ref (mutating refs in useFrame is allowed).
  const rig = useRef({
    focus: null as number | null,
    px: 0,
    py: 0,
    pos: new Vector3(),
    target: new Vector3(),
    a: new Vector3(),
    b: new Vector3(),
  });

  const poses = useMemo<CameraPose[]>(
    () => [entrancePose(layout), ...Array.from({ length: bookCount }, (_, i) => bookPose(i, layout))],
    [layout, bookCount],
  );

  // Layout change (rotation/resize) → re-render once with the new framing.
  useEffect(() => invalidate(), [poses, invalidate]);

  useFrame((_, rawDelta) => {
    const r = rig.current;
    const state = stateRef.current;
    // Cap the step so a frame after a long idle doesn't jump, but keep it generous so slow
    // devices still settle in a few frames (and rendering stops) rather than crawling.
    const delta = Math.min(rawDelta, 0.1);
    const goal = MathUtils.clamp(state.focus, 0, poses.length - 1);
    // First frame: start exactly where the page is scrolled to (no fly-in on reload mid-page).
    r.focus = r.focus === null ? goal : MathUtils.damp(r.focus, goal, CAMERA_DAMPING, delta);
    r.px = MathUtils.damp(r.px, state.pointerX, 3, delta);
    r.py = MathUtils.damp(r.py, state.pointerY, 3, delta);

    // With no featured books there is only the entrance pose; hold it.
    const i = Math.max(0, Math.min(Math.floor(r.focus), poses.length - 2));
    const t = smooth(MathUtils.clamp(r.focus - i, 0, 1));
    const from = poses[i];
    const to = poses[i + 1] ?? from;

    r.pos.lerpVectors(r.a.set(...from.position), r.b.set(...to.position), t);
    r.target.lerpVectors(r.a.set(...from.target), r.b.set(...to.target), t);
    // Subtle pointer parallax (desktop only — pointer stays 0 on touch).
    r.pos.x += r.px * 0.12;
    r.pos.y += r.py * 0.06;

    camera.position.copy(r.pos);
    camera.lookAt(r.target);

    const settled =
      Math.abs(r.focus - goal) < 0.001 && // ≈1 mm of camera travel — imperceptible
      Math.abs(r.px - state.pointerX) < 0.001 &&
      Math.abs(r.py - state.pointerY) < 0.001;
    if (!settled && state.visible) invalidate();
  });

  return null;
}
