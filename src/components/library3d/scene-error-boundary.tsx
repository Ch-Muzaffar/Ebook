"use client";

import { Component, type ReactNode } from "react";

/** Catches any 3D failure (shader compile, driver bug, chunk load) and switches to the static fallback. */
export class SceneErrorBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("3D library disabled, using static fallback:", error);
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
