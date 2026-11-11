/** Storage key for the visitor's explicit theme choice (shared by the script and the toggle). */
export const THEME_KEY = "dt-theme";

/**
 * Inline <head> script, runs before React starts:
 *
 * 1. Removes HTML comments that the hosting platform injects into <head> (Netlify's free plan adds
 *    a "This site is hosted on Netlify…" comment right after <meta charset>). React hydrates <head>
 *    node by node, so an unexpected comment there causes a hydration mismatch (React error #418):
 *    React then re-renders the whole page in the browser and the theme attribute below is lost.
 * 2. Sets <html data-theme> before first paint (stored choice, else the OS setting), so the dark
 *    theme never flashes light.
 *
 * Kept in a plain module — a "use client" file can't export a string to server components.
 */
// (Netlify inserts " <!-- … -->" — the leading space becomes a text node, which React rejects too, so
// whitespace-only text nodes in <head> are removed as well; React never renders text into <head>.)
export const THEME_SCRIPT = `(function(){try{for(var n=document.head.firstChild;n;){var x=n.nextSibling;if((n.nodeType===8&&/netlify/i.test(n.data))||(n.nodeType===3&&!/\\S/.test(n.data)))n.parentNode.removeChild(n);n=x}}catch(e){}try{var t=localStorage.getItem('${THEME_KEY}');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=d?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}})()`;
