"use client";

import { useSyncExternalStore } from "react";

/**
 * Shopping bag, persisted in localStorage and synced across tabs.
 *
 * Stores product SLUGS only. Titles and prices are always looked up from the catalog when
 * displayed, and payment amounts will be computed server-side at checkout (Phase 6) —
 * a tampered localStorage value can never change what a customer pays.
 * eBooks are single-licence digital items, so each book appears at most once (no quantities).
 */
const KEY = "bag:v1";
const MAX_ITEMS = 50;
const EMPTY: readonly string[] = Object.freeze([]);

let items: readonly string[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    items = Array.isArray(parsed)
      ? [...new Set(parsed.filter((s): s is string => typeof s === "string" && /^[a-z0-9-]{1,80}$/.test(s)))].slice(0, MAX_ITEMS)
      : EMPTY;
  } catch {
    items = EMPTY;
  }
}

function commit(next: readonly string[]) {
  items = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked — bag still works for this page view */
  }
  listeners.forEach((l) => l());
}

export const bag = {
  add(slug: string) {
    load();
    if (!items.includes(slug) && items.length < MAX_ITEMS) commit([...items, slug]);
  },
  remove(slug: string) {
    load();
    if (items.includes(slug)) commit(items.filter((s) => s !== slug));
  },
  clear() {
    commit(EMPTY);
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    loaded = false;
    load();
    listeners.forEach((l) => l());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  load();
  return items;
}

/** Slugs in the bag. Empty during server render and hydration, then the stored value. */
export function useBagItems(): readonly string[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}
