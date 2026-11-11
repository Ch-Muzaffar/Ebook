import { NoTracking } from "./no-tracking";

export { NoTracking };

/**
 * Google Tag Manager with Google Consent Mode v2 (the setup Google recommends):
 *
 * - The standard GTM snippet is in the page HTML on every public page, so Google Analytics /
 *   Tag Assistant can detect the container.
 * - BEFORE it loads, consent defaults are set to "denied" for analytics and advertising storage:
 *   Google tags set no cookies and store nothing until the visitor clicks "Accept" in the cookie
 *   banner, which sends a consent "update" to "granted" (see setConsent in consent.tsx). A visitor
 *   who accepted earlier is granted immediately on later page loads.
 * - Mounted only in the public site layout, so it never runs in /admin.
 *
 * GA4 itself is configured inside GTM (a "Google tag" with the G-… measurement ID).
 */
export function TagManager({ id }: { id?: string }) {
  if (!id) return null;
  const init = [
    "window.dataLayer=window.dataLayer||[];",
    "function gtag(){dataLayer.push(arguments);}window.gtag=gtag;",
    "gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'granted',security_storage:'granted',wait_for_update:500});",
    "try{if(localStorage.getItem('dt-consent-v1')==='granted')gtag('consent','update',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'});}catch(e){}",
    // Standard GTM snippet (inline, so it always runs AFTER the consent defaults above).
    "(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});",
    "var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;",
    "j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;j.setAttribute('data-gtm',i);f.parentNode.insertBefore(j,f);",
    `})(window,document,'script','dataLayer',${JSON.stringify(id)});`,
  ].join("");
  return (
    <>
      <script id="gtm-init" dangerouslySetInnerHTML={{ __html: init }} />
      <noscript>
        <iframe
          title="Google Tag Manager"
          src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(id)}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>
    </>
  );
}
