"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { browserDb } from "@/lib/supabase/browser";

/**
 * Header link: "Sign in" or "Account". Reads the local session in the browser so public pages
 * stay fully static. Re-checks on every navigation, because sign-in/out happen on the server
 * (Server Actions) and don't trigger the browser client's auth events.
 */
export function AccountLink() {
  const [signedIn, setSignedIn] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const db = browserDb();
    let active = true;
    db.auth.getSession().then(({ data }) => active && setSignedIn(Boolean(data.session)));
    const { data } = db.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session)));
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [pathname]);

  return (
    <Link
      href={signedIn ? "/dashboard" : "/login"}
      aria-label={signedIn ? "Your account" : "Sign in"}
      className="inline-flex size-11 items-center justify-center rounded-pill text-charcoal hover:bg-charcoal/8"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
        <circle cx="12" cy="8.5" r="3.5" />
        <path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5" />
        {signedIn && <circle cx="18.5" cy="5.5" r="2" fill="currentColor" stroke="none" className="text-gold" />}
      </svg>
    </Link>
  );
}
