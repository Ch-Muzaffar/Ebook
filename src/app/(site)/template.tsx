import { ViewTransition } from "react";

/**
 * A template (unlike a layout) re-mounts on every navigation, so this ViewTransition plays an
 * exit for the old page and an enter for the new one: a soft fade-and-rise between pages.
 * Other updates (forms, bag changes) don't animate (default="none"). Browsers without the
 * View Transitions API simply navigate without the animation. CSS lives in globals.css.
 */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
