"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { MathUtils, type Group } from "three";
import type { Product } from "@/lib/content/types";
import { BOOK_STATIONS, QUALITY, restingOffset, type QualityTier } from "../scene-config";
import type { SceneStateRef } from "../scroll-store";
import { BookModel } from "./book-model";
import type { CoverSpec } from "./cover-texture";

const COVER_TONES: Record<Product["coverTone"], Pick<CoverSpec, "background" | "ink" | "rule">> = {
  charcoal: { background: "#252522", ink: "#f8f5ef", rule: "#b49a67" },
  gold: { background: "#b49a67", ink: "#252522", rule: "#252522" },
  beige: { background: "#eae3d8", ink: "#252522", rule: "#b49a67" },
};

/**
 * The featured books floating along the aisle. Each turns toward the viewer and lifts slightly
 * as scroll brings it into focus (controlled rotation — PRD §7.2), and responds to hover/tap.
 */
type BookProps = {
  stateRef: SceneStateRef;
  tier: QualityTier;
  onSelect: (slug: string) => void;
};

export function FeaturedBooks({ products, ...rest }: BookProps & { products: Product[] }) {
  return (
    <>
      {products.slice(0, BOOK_STATIONS.length).map((p, i) => (
        <FeaturedBook key={p.slug} product={p} index={i} {...rest} />
      ))}
    </>
  );
}

function FeaturedBook({ product, index, stateRef, tier, onSelect }: BookProps & { product: Product; index: number }) {
  const ref = useRef<Group>(null);
  const hover = useRef(0);
  const cover = useMemo<CoverSpec>(
    () => ({ title: product.title, author: product.author, ...COVER_TONES[product.coverTone], image: product.coverImage }),
    [product],
  );
  const [x, y, z] = BOOK_STATIONS[index];
  const offset = restingOffset(index);

  useFrame((_, rawDelta) => {
    const g = ref.current;
    if (!g) return;
    const state = stateRef.current;
    const delta = Math.min(rawDelta, 0.1);
    // closeness: 1 when this book is the scroll focus, 0 when a full step away.
    const closeness = MathUtils.clamp(1 - Math.abs(state.focus - (index + 1)), 0, 1);
    const eased = closeness * closeness * (3 - 2 * closeness);
    hover.current = MathUtils.damp(hover.current, state.hovered === index ? 1 : 0, 10, delta);

    // Resting books are turned toward the aisle; the focused one turns to present its cover.
    g.rotation.y = MathUtils.lerp(index % 2 === 0 ? -0.55 : 0.5, -0.16, eased) + hover.current * 0.12;
    g.rotation.x = MathUtils.lerp(0.04, -0.03, eased) - hover.current * 0.04;
    // Rise from the resting spot to the station as the book comes into focus.
    const rest = 1 - eased;
    g.position.set(
      x + rest * offset[0],
      y + rest * offset[1] + eased * 0.06 + hover.current * 0.04,
      z + rest * offset[2] + eased * 0.12,
    );
    const s = 1 + eased * 0.04 + hover.current * 0.03;
    g.scale.setScalar(s);

    if (Math.abs(hover.current - (state.hovered === index ? 1 : 0)) > 0.002) state.requestFrame();
  });

  return (
    <group
      ref={ref}
      position={[x + offset[0], y + offset[1], z + offset[2]]}
      onPointerOver={(e) => {
        e.stopPropagation();
        stateRef.current.hovered = index;
        document.body.style.cursor = "pointer";
        stateRef.current.requestFrame();
      }}
      onPointerOut={() => {
        if (stateRef.current.hovered === index) stateRef.current.hovered = -1;
        document.body.style.cursor = "";
        stateRef.current.requestFrame();
      }}
      onClick={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "";
        onSelect(product.slug);
      }}
    >
      <BookModel cover={cover} castShadow={QUALITY[tier].shadows} />
    </group>
  );
}
