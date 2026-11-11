"use client";

import { useLayoutEffect, useRef } from "react";
import { Color, Object3D, type InstancedMesh, type Texture } from "three";

export type BoxInstance = {
  position: [number, number, number];
  scale: [number, number, number];
  rotationZ?: number;
  color?: string;
};

/**
 * Draws many boxes in ONE draw call (InstancedMesh). Used for shelves, books on shelves,
 * columns and beams — hundreds of objects at the cost of one mesh.
 */
export function InstancedBoxes({
  boxes,
  color = "#ffffff",
  roughness = 0.85,
  castShadow = false,
  receiveShadow = false,
  map,
}: {
  boxes: BoxInstance[];
  /** Base colour; multiplied by per-instance colours when those are given (so keep white then). */
  color?: string;
  roughness?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  /** Surface texture (wood grain, leather…), tinted by the colour(s). */
  map?: Texture;
}) {
  const ref = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    const c = new Color();
    boxes.forEach((b, i) => {
      dummy.position.set(...b.position);
      dummy.rotation.set(0, 0, b.rotationZ ?? 0);
      dummy.scale.set(...b.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (b.color) mesh.setColorAt(i, c.set(b.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere(); // enables correct frustum culling for the whole batch
  }, [boxes]);

  return (
    <instancedMesh
      key={boxes.length}
      ref={ref}
      args={[undefined, undefined, boxes.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      <boxGeometry />
      <meshStandardMaterial color={color} roughness={roughness} map={map ?? null} />
    </instancedMesh>
  );
}
