/**
 * Minimal mutable store shared between the DOM scroll controller and the R3F scene.
 * The scene reads it every frame inside useFrame (no React re-renders); the controller
 * writes to it on scroll and asks the canvas to render a frame via `requestFrame`.
 */
export type SceneScrollState = {
  /** 0 = entrance, 1..N = featured book N in focus (continuous). */
  focus: number;
  /** Normalised pointer position [-1, 1] for subtle parallax; 0 on touch devices. */
  pointerX: number;
  pointerY: number;
  /** Whether the stage is on screen — when false the scene skips rendering entirely. */
  visible: boolean;
  /** Set by the canvas once mounted; called to schedule a render (frameloop="demand"). */
  requestFrame: () => void;
  /** Book index currently hovered in 3D, or -1. */
  hovered: number;
  /** performance.now() until which ambient motion (dust) may keep requesting frames — extended by
   *  scroll/pointer input, so the scene still goes fully idle shortly after the visitor stops. */
  activeUntil: number;
};

/** Passed down as a ref: mutating `ref.current` in effects/handlers/frames is the sanctioned pattern. */
export type SceneStateRef = { readonly current: SceneScrollState };

export function createSceneScrollState(): SceneScrollState {
  return { focus: 0, pointerX: 0, pointerY: 0, visible: true, requestFrame: () => {}, hovered: -1, activeUntil: 0 };
}
