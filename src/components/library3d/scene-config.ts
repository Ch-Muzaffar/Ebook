/**
 * Static layout + tuning for the 3D library. Pure data — no React, no three.js imports —
 * so it can be shared by the scene, the scroll controller and tests.
 *
 * World units ≈ metres. The library is a corridor running into -z:
 *   x ∈ [-HALL.halfWidth, +HALL.halfWidth], floor at y = 0, entrance near z = +HALL.front.
 */

export type SceneTheme = "light" | "dark";

export type ScenePalette = {
  background: string;
  floor: string;
  runner: string;
  wood: string;
  woodDark: string;
  wall: string;
  ceiling: string;
  window: string;
  pages: string;
  shaft: string;
  dust: string;
  lampGlow: string;
  bookSpines: readonly string[];
};

/** Classic Library (light) and Modern Luxury (dark) — the 3D hall follows the site theme. */
export const PALETTES: Record<SceneTheme, ScenePalette> = {
  light: {
    background: "#f8f5ef", // ivory — also fog colour, so depth dissolves into the page
    floor: "#cdb99a",
    runner: "#8f3b2e",
    wood: "#8a6c4b",
    woodDark: "#5c4632",
    wall: "#efe8dc",
    ceiling: "#e8dfd0",
    window: "#fffaf0",
    pages: "#f3ecdf",
    shaft: "#fff6e2",
    dust: "#fff3da",
    lampGlow: "#ffe2a8",
    bookSpines: ["#252522", "#3a3a36", "#b49a67", "#8c7a55", "#eae3d8", "#d6ccbb", "#5e5a52", "#6b4f3a", "#7a6640", "#6e2a24", "#2f4a3a", "#2b3550"],
  },
  dark: {
    background: "#11100e",
    floor: "#3a2c1e",
    runner: "#4a1612",
    wood: "#4f3925",
    woodDark: "#2a1c11",
    wall: "#1c1813",
    ceiling: "#14110d",
    window: "#f5c77e",
    pages: "#e8dcc4",
    shaft: "#e8b86a",
    dust: "#ffd28a",
    lampGlow: "#ffc26b",
    bookSpines: ["#5a1f1f", "#1f3a2c", "#1d2a44", "#252522", "#b49a67", "#6b4f3a", "#3a3a36", "#7a2e22", "#2e4a3c", "#8c7a55", "#4a2c3a", "#c9a96a"],
  },
};

/** Light palette — kept for code that doesn't care about the theme. */
export const PALETTE = PALETTES.light;

export const HALL = {
  halfWidth: 3,
  front: 7,
  back: -19,
  shelfHeight: 4.2,
  shelfDepth: 0.42,
  unitWidth: 2.2,
  shelvesPerUnit: 6,
  beamHeight: 4.7,
} as const;

/** Featured book stations along the aisle. Index i corresponds to featured product i. */
export const BOOK_STATIONS: readonly [number, number, number][] = [
  [0, 1.6, 2.2],
  [0, 1.6, -3.8],
  [0, 1.6, -9.8],
];

export const BOOK_SIZE = { width: 0.62, height: 0.9, depth: 0.12 } as const;

export type CameraPose = { position: [number, number, number]; target: [number, number, number] };

/**
 * Camera at the library entrance (scroll focus = 0). Portrait screens see much more vertically,
 * so they stand closer and tilt up less (otherwise the view is mostly ceiling beams).
 */
export function entrancePose(layout: "wide" | "portrait"): CameraPose {
  return layout === "wide"
    ? { position: [0, 1.75, 8.6], target: [0, 2.4, -6] }
    : { position: [0, 1.5, 7.6], target: [0, 1.75, -6] };
}

/**
 * Where an unfocused book rests: lower and off to one side, so the entrance headline is clear.
 * Scroll lifts each book from here to its station as it comes into focus.
 */
export function restingOffset(i: number): [number, number, number] {
  return [i % 2 === 0 ? 0.55 : -0.55, -0.85, 0];
}

/**
 * Pose that frames featured book `i`. Desktop places the book right of centre (text sits left);
 * portrait/mobile places it in the upper half (text card sits below).
 */
export function bookPose(i: number, layout: "wide" | "portrait"): CameraPose {
  const [x, y, z] = BOOK_STATIONS[i];
  return layout === "wide"
    ? { position: [x - 0.75, y + 0.08, z + 2.7], target: [x - 0.85, y, z] }
    : { position: [x, y - 0.3, z + 3.3], target: [x, y - 0.62, z] };
}

/** Quality tiers — "low" is used on phones / weak devices (PRD §14.18). */
export type QualityTier = "low" | "high";

export const QUALITY: Record<
  QualityTier,
  { dpr: [number, number]; shadows: boolean; shelfUnitsPerSide: number; booksPerShelf: number; antialias: boolean }
> = {
  low: { dpr: [1, 1.25], shadows: false, shelfUnitsPerSide: 7, booksPerShelf: 9, antialias: false },
  // dpr capped at 1.5: on retina screens 2x meant ~78% more pixels per frame for little visible gain.
  high: { dpr: [1, 1.5], shadows: true, shelfUnitsPerSide: 11, booksPerShelf: 14, antialias: true },
};

/** Larger = snappier camera. Damping keeps scroll-linked motion smooth without lagging behind. */
export const CAMERA_DAMPING = 4.5;
