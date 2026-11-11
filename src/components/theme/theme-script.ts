/** Storage key for the visitor's explicit theme choice (shared by the script and the toggle). */
export const THEME_KEY = "dt-theme";

/**
 * Inline <head> script: sets <html data-theme> before first paint (stored choice, else the OS
 * setting), so the dark theme never flashes light. Kept in a plain module — a "use client"
 * file can't export a string to server components.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=d?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}})()`;
