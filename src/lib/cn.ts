/** Join class names, skipping falsy values. Tiny local helper to avoid an extra dependency. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
