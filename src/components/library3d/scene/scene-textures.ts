"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import type { Texture } from "three";
import { dotTexture, floorTexture, plasterTexture, shaftTexture, spineTexture, woodTexture } from "./textures";

export type SceneTextures = Record<"wood" | "floor" | "spine" | "plaster" | "shaft" | "dot", Texture>;

/** Creates every procedural texture once per canvas and disposes them on unmount (PRD §14.19). */
export function useSceneTextures(): SceneTextures {
  const gl = useThree((s) => s.gl);
  const textures = useMemo(() => {
    const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
    return {
      wood: woodTexture(aniso),
      floor: floorTexture(aniso),
      spine: spineTexture(aniso),
      plaster: plasterTexture(),
      shaft: shaftTexture(),
      dot: dotTexture(),
    };
  }, [gl]);
  useEffect(() => () => Object.values(textures).forEach((t) => t.dispose()), [textures]);
  return textures;
}
