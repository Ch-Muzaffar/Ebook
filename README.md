# Premium 3D eBook Publishing & Digital Library Platform

Implementation of the product spec in PRD v2.0. Delivered phase by phase; each phase is reviewed by the owner before the next begins.

**Current status: Phase 8 — launched at https://digitaltraffic.blog (trial: Vercel Hobby + Lemon Squeezy test mode).** Phases 1–7 and the design pass approved.

> **Before each remaining phase**, the credentials it needs are requested up front (Phase 6: payment provider + Resend; Phase 7: Google Analytics / Search Console / AdSense).

## Running locally

Requires Node 20+ (tested on Node 24.19, npm 11) and a Supabase project (see `.env.example`).

```bash
npm install
cp .env.example .env.local        # fill in the Supabase values
npm run db:migrate                # create/upgrade tables, RLS policies, storage buckets
node scripts/db/create-admin.mjs  # first time only: creates the ADMIN_EMAIL admin account
npm run dev                       # http://localhost:3000
```

`create-admin` writes a temporary password to `.admin-initial-password.txt` (git-ignored). Sign in, change it under **My library → Change password**, then delete the file.

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | Regenerates route types, then `tsc --noEmit` |
| `npm run check` | lint + typecheck + production build |
| **`npm run test:e2e`** | **Recommended.** Runs every check against the live Supabase project, **data-safe**. Each check creates its own `qa-…` records and temporary `qa-…@example.test` users, tests those, then deletes them, even on failure. Your real content, settings and accounts are never modified. It builds into `.next-test`, so your build is untouched. Takes ~12 minutes, including a real scheduled-publishing wait. Run selected checks with `node scripts/e2e.mjs store-check auth-check`. |
| `npm run check:rls` | Row Level Security as an anonymous visitor: published/live content only; drafts, files, subscribers and profiles hidden; all writes refused. |
| `npm run check:auth` | Register (no email confirmation), reserved admin email, sign in/out, route protection, customer cannot write content or promote themselves, open-redirect protection. |
| `npm run check:store` | Store, search/filter/sort, bag (tamper-proof prices), admin book create/edit/publish/delete, cover upload, private eBook upload (verified not publicly downloadable). |
| `npm run check:blog` | Blog, categories, Markdown rendering + XSS safety, SEO metadata, drafts/preview, a real scheduled post going live, category rename/delete rules. |
| `npm run check:admin` | Settings (site-wide brand/contact/social, restored afterwards), customer roles + guard rails, newsletter sign-up/duplicates, subscriber list, CSV export, unsubscribe, password-reset UX. |
| `npm run db:migrate` / `npm run db:ping` | Apply database migrations / check connectivity (prints no secrets). |
| `npm run check:scene` | With a server on :3100: 3D homepage check using software WebGL. Covers screenshots of each scroll stage on desktop and phone (`docs/screenshots/phase2/`), idle rendering, layout shift, clicking a 3D book, the reduced-motion and no-WebGL fallbacks, and JS transferred per page. |
| `npm run check:visual` | With a server on :3100 (`npx next start -p 3100`): full-page screenshots into `docs/screenshots/`, horizontal-overflow check on every route at phone/tablet/desktop, mobile-menu, focus-ring and newsletter-validation checks. Uses the locally installed Edge/Chrome — no extra dependency. |

## Stack (Phase 1)

| Package | Version | Why |
|---|---|---|
| next | 16.4.5 | App Router, Cache Components + Partial Prefetching enabled (scaffold defaults) |
| react / react-dom | 19.3.0 | |
| tailwindcss + @tailwindcss/turbopack | 4.x | Styling; tokens defined in CSS via `@theme` |
| typescript, eslint, eslint-config-next | 5.x / 9.x / 16.4.5 | Tooling |

Added in Phase 2. All are pinned exact, and each version was at least two weeks old when installed:

| Package | Version | Why |
|---|---|---|
| three | 0.186.1 | WebGL engine |
| @react-three/fiber | 9.8.2 | React renderer for three.js (supports React ≥19 <19.4) |
| framer-motion | 14.6.0 | Scroll-linked parallax and section reveals for HTML content |
| @types/three (dev) | 0.186.0 | Types |

**Drei is not installed.** The PRD lists it, but nothing in the scene needs it. It was installed and then removed under the "avoid unnecessary dependencies" rule. Add it when a helper actually earns its place, for example `useTexture` for real cover images in Phase 3.

> **Next.js 16 note:** this version differs from older Next.js. Its bundled docs live in `node_modules/next/dist/docs/` — read them before using an API. Notable here: error boundaries receive `retry` (not `reset`); `dynamicParams` is unavailable with Cache Components; a bare `new Date()` in prerendered output is a build error.

## Project structure

```
src/
├── app/
│   ├── layout.tsx              Root: <html>, fonts (Playfair Display + Inter), metadata
│   ├── globals.css             ★ DESIGN TOKENS (@theme) + base styles, focus ring, reduced motion
│   ├── global-error.tsx        Last-resort error boundary
│   ├── not-found.tsx           404 for unmatched URLs (adds site chrome itself)
│   ├── (site)/                 Public website — shares header/footer
│   │   ├── layout.tsx          Header, <main id="main">, footer
│   │   ├── loading.tsx / error.tsx / not-found.tsx
│   │   ├── page.tsx            Homepage: static version of the 6 PRD scenes
│   │   ├── books/ , books/[slug]/
│   │   ├── blog/ ,  blog/[slug]/
│   │   ├── cart/ checkout/ about/ contact/ login/ register/ dashboard/
│   │   └── privacy/ terms/ refund-policy/
│   └── admin/                  Separate admin shell (noindex) — NOT access-protected until Phase 5
├── components/
│   ├── ui/                     button (Button, LinkButton), typography (Heading, Text, Eyebrow), input, states (Loading/Empty/Error)
│   ├── layout/                 container (Container, Section), site-header, nav-links, mobile-menu, site-footer, logo, icons, page-header (PageHeader, PhasePlaceholder), legal-page, not-found-content
│   ├── cards/                  product-card, article-card, book-cover
│   ├── newsletter/             newsletter-form
│   └── auth/                   auth-form-preview (disabled preview)
├── config/site.ts              Brand name, navigation, footer links, the 8 categories
└── lib/
    ├── design/motion.ts        JS mirror of motion tokens (for Framer Motion / R3F)
    ├── content/types.ts        Product / Article types (mirror planned DB tables)
    ├── content/placeholder-data.ts   SAMPLE data only — replaced in Phases 3–4
    ├── format.ts               Price (USD), date, category helpers
    └── cn.ts                   Class-name joiner
scripts/visual-check.mjs        Dev-only browser check (see above)
docs/screenshots/               Latest visual-check output
```

## Design tokens

All design values live in one place: the `@theme static` block in `src/app/globals.css`. Tailwind turns each into utilities (`--color-gold-deep` → `text-gold-deep`, `--spacing-gutter` → `px-gutter`, `--container-prose` → `max-w-prose`). Components use only these utilities.

- **Colour:** the five PRD colours, plus derived accessibility tokens.
  - **Muted Gold (`gold`, `#B49A67`) is decorative only.** It is 2.6:1 on ivory, which fails WCAG for text. Text accents use `gold-deep` (`#7A6640`, 5.4:1).
  - Secondary text uses `muted` (`#5E5A52`, 6.4:1).
- **Type:** Playfair Display (`font-serif`) for headings, Inter (`font-sans`) for UI and body. Fluid `clamp()` sizes: `display`, `h1`–`h4`, `lead`, `body`, `small`, `caption`, `eyebrow`.
- **Spacing:** 4px base, plus `section` (vertical rhythm), `gutter` (page side padding) and `header` (72px).
- **Widths:** `prose` 760px (PRD reading width), `narrow`, `content`, `wide`.
- **Breakpoints:** `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536.
- **Radii, shadows, motion:** easing utilities `ease-editorial` / `ease-standard`. Durations are used as `duration-(--duration-base)`. Keep `lib/design/motion.ts` in sync with these.

## Architectural decisions

1. **Route group `(site)`** keeps public pages under one header/footer layout, while `/admin` gets its own functional shell. The URLs are unchanged.
2. **Book and article detail pages** use `generateStaticParams` and `ensureStatic = "navigation"`:
   - They are public content, so they should be fully static.
   - Under Cache Components, unknown slugs would otherwise stream a **200** "not found" page. With this setting they return a real **404**, which matters for SEO and AdSense.
   - The page component itself stays static and reads `params` only inside a `<Suspense>`-wrapped child. Next 16's Instant Navigation check in `next dev` reports an error otherwise ("encountered URL data during prerendering").
7. **`suppressHydrationWarning` on `<html>`** prevents hydration warnings when browser extensions inject attributes onto `<html>` (e.g. `data-theme`). It only affects that one element.
3. **No fake functionality:**
   - The newsletter form validates input, then says plainly that nothing was saved.
   - Add-to-bag and auth submit buttons are disabled.
   - Every placeholder is labelled with the phase that replaces it.
4. **Solid header background:** `backdrop-filter` would make the header the containing block for the fixed mobile-menu panel and clip it.
5. **Typographic placeholder covers** (2:3 ratio) render when a product has no cover image, so there is no layout shift and no stock imagery.
6. **The homepage is a static editorial version of the six scenes.** In Phase 2 the 3D library is layered in, and this markup remains as the no-WebGL / reduced-motion fallback.

## Phase 2: 3D library architecture

```
src/components/library3d/
├── library-stage.tsx          DOM side of Scenes 1–2: sticky stage, scroll→focus controller,
│                              pointer parallax, hero + featured-book HTML steps, mode switching
├── use-scene-environment.ts   Client-only: 3D vs static (reduced motion / no WebGL / Save-Data),
│                              quality tier (low on phones and weak devices), wide vs portrait layout
├── scene-config.ts            Pure data: palette, hall dimensions, book stations, camera poses, quality tiers
├── scroll-store.ts            Mutable per-frame state shared DOM ↔ scene (passed as a ref, no re-renders)
├── scene-error-boundary.tsx   Any 3D failure → static fallback
├── static-backdrop.tsx        CSS-only hall + arched window: first paint, loading placeholder, fallback
└── scene/
    ├── library-canvas.tsx     <Canvas> (lazy via next/dynamic, ssr:false), demand frameloop, context-loss handling
    ├── camera-rig.tsx         Scroll-linked camera: damped interpolation between keyframe poses
    ├── featured-books.tsx     Books rise, turn and scale into focus with scroll; hover lift; click → product page
    ├── book-model.tsx         Hardcover model (boards, spine, page block) + disposal
    ├── cover-texture.ts       Typographic cover painted to a canvas texture (no image downloads)
    ├── bookshelves.tsx        Procedural shelves + books (deterministic), 2 instanced meshes
    ├── library-architecture.tsx  Floor, runner, ceiling, columns/beams (instanced), end wall + arched window
    ├── lighting.tsx           Hemisphere fill + key + window light; shadows on high tier only
    ├── instanced-boxes.tsx    Reusable "many boxes, one draw call" primitive
    └── seeded-random.ts
src/components/motion/reveal.tsx   MotionProvider (honours reduced motion) + Reveal (scroll-in fade/lift)
```

**How scrolling works:**
- The 3D canvas sits in a sticky, viewport-tall layer. Normal HTML steps scroll over it: the hero, then one step per featured book.
- The page only *reads* the scroll position. Nothing hijacks or snaps scrolling.
- Scroll position becomes a `focus` value: 0 is the entrance, and 1–3 are featured books 1–3. The camera eases between keyframe poses toward that value.
- All text, prices and links are real HTML, so they're accessible and indexable. The empty parts of the overlay pass clicks through to the canvas, which keeps the 3D books clickable.

**Performance:**
- **Demand rendering:** `frameloop="demand"` draws frames only on scroll, pointer movement or hover, and while the camera is still settling. Measured: **0 draw calls while idle**.
- **Lazy loading:** three.js loads only on the homepage, after first paint (~240 kB compressed). Inner pages don't download it.
- **Few draw calls:** roughly 1,900 shelf books and shelf parts draw in 2 instanced meshes. The whole scene is about 20 draw calls.
- **No asset downloads:** no models, textures or HDR files. Everything is procedural or drawn on a canvas.
- **Low tier** (phones, ≤4 cores, ≤4 GB memory): no shadows, no antialiasing, pixel ratio ≤1.5, fewer shelf units and books, shorter fog distance.
- **Zero layout shift:** the static covers occupy exactly the space the 3D books appear in, so the swap moves nothing. Measured CLS: 0.

**Fallbacks:**
- **Reduced motion, no WebGL, or Save-Data:** no canvas is created. The CSS hall and static covers show instead, with identical content and links.
- **Runtime failure:** a 3D error or lost WebGL context switches to the static version.

**Phase 2 decisions:**
- **Book covers:** typographic textures drawn on a canvas (Playfair/Inter). Phase 3 can swap in real cover images.
- **Resting books:** unfocused books rest low and to one side so the entrance headline stays clear. Scroll lifts each one into place, which delivers "books moving into focus".
- **Phone layout:** portrait screens use their own camera poses, with the book in the upper half and the text card as a bottom sheet.
- **Stage overflow:** the stage uses `overflow-x: clip`, not `hidden`. Decorative halos can't widen the page on phones, and sticky positioning keeps working.

## Phase 3: store, bag and product management

> **Superseded in Phase 5:**
> - The JSON-file storage (`data/*.json`, `product-file-store`, `json-collection`) has been replaced by Supabase.
> - The HTTP Basic admin password (`ADMIN_PASSWORD`) has been replaced by Supabase Auth with admin roles.
> - The rest of this section still describes the store and bag behaviour accurately.

```
data/products.json                  INTERIM catalog storage (JSON file) — Supabase replaces it in Phase 5
src/lib/catalog/
├── product-file-store.ts           read / insert / update / patch / delete (atomic writes, serialised)
├── queries.ts                      public reads ("use cache" + cacheTag "products"; published only) + admin reads (uncached)
├── validation.ts                   server-side form validation, slugify, form ⇄ product mapping
└── actions.ts                      Server Actions: create / update / publish-toggle / delete (each checks admin access)
src/lib/cart/cart-store.ts          bag in localStorage (slugs only), cross-tab sync, useSyncExternalStore
src/lib/admin/auth.ts + src/proxy.ts  interim admin protection (HTTP Basic via ADMIN_PASSWORD)
src/components/store/store-browser.tsx  search / category / sort, URL-synced (?q=&category=&sort=)
src/components/cart/                add-to-bag button, header bag count, cart view
src/components/admin/               nav, page header, product form, row actions
src/app/admin/                      overview, books list, new, edit
```

**Store:**
- The `/books` page loads the published catalog, which is cached and statically rendered.
- Filtering happens instantly in the browser, and the URL keeps the search, category and sort so filtered views can be shared.
- The prerendered fallback is the full, unfiltered grid, so search engines see every book.

**Product pages:**
- Full description, table of contents, a details panel (format, pages, language, publish date), breadcrumb and related books (same category first).
- Pages are fully static, and unknown or draft slugs return a real 404.

**Bag:**
- Only book *slugs* are stored in the browser. Titles and prices always come from the catalog.
- Unknown or unpublished entries are dropped, so a tampered bag can't change prices. The real charge will be computed server-side in Phase 6.
- One copy per book: eBooks are single-licence, so there are no quantities.

**Admin (books):**
- Create, edit, publish/unpublish and delete (with a two-step confirm).
- Validation runs on the server, including duplicate-slug detection, and errors keep everything you typed.
- Drafts never appear publicly. Changes show on the public site immediately.

**Admin protection (interim, until Supabase Auth in Phase 5):**
- `src/proxy.ts` gates every `/admin` request, and every Server Action re-checks access itself.
- **No `ADMIN_PASSWORD`:** admin is open in development only and disabled (403) in production.
- **With a password:** the browser shows a username/password prompt.

## Phase 4: blog and CMS

```
data/articles.json, data/categories.json   INTERIM storage (Supabase in Phase 5)
src/lib/data/json-collection.ts            shared JSON-file collection (atomic, serialised writes)
src/lib/blog/                              queries (public cached + admin fresh), validation, actions
src/lib/categories/                        categories shared by books and articles: queries, actions
src/components/blog/                       ArticleBody (safe Markdown), ArticleView (shared by page + preview), category nav
src/components/categories/                 CategoriesProvider + <CategoryName> for client components
src/app/(site)/blog/                       index, [slug] article, category/[slug]
src/app/admin/articles/, admin/categories/ article list/editor/preview, category manager
```

**Public blog:**
- `/blog` shows a lead article and a grid.
- `/blog/category/[slug]` pages are real, statically generated pages, so search engines can index them.
- Article pages use the 760px reading column, with no 3D behind long text.
- Article pages show category links, author, date, reading time, featured image, Markdown body, tags, an author box and related articles (scored by shared categories, then shared tags).
- Each article has its own SEO title/description, a canonical URL and Open Graph article metadata.

**Publishing:**
- **Statuses:** Draft, Publish now, or Schedule.
- **Scheduling:** the time is entered in the author's local time zone and stored in UTC. Public pages re-check every minute, so a scheduled article goes live within a few minutes of its time without anyone touching it. This was verified with a real 2-minute schedule in the tests.
- **Drafts and future posts** return 404 publicly. The admin preview shows them using the exact public layout.

**Editor:**
- Write and Preview tabs, using the same renderer as the site.
- Up to three categories, comma-separated tags, a featured image with required alt text, author name and bio.
- SEO fields with character counters and a search-result preview.
- Reading time is calculated automatically.

**Markdown safety:** `react-markdown` never renders raw HTML, and unsafe URLs such as `javascript:` are stripped. This was tested with `<script>`, `<img onerror>` and `javascript:` links; none executed.

**Categories:**
- Add, rename, describe and reorder categories.
- A category's slug is fixed once created, because books and articles reference it.
- Deleting is blocked while any book or article uses the category.
- Renames show across the whole site immediately (category data is cached under its own tag).

## Phase 5: Supabase, authentication, roles and storage

```
supabase/migrations/          SQL migrations (tables, RLS, functions, buckets) — applied by scripts/db/migrate.mjs
scripts/db/                   migrate, ping, rls-check, create-admin, import-json (one-time JSON → DB import)
src/lib/supabase/             public (cached anon reads) · server (session, RLS) · service (server-only) · browser · mappers · resilient fetch
src/lib/auth/                 session (getCurrentUser / requireUser / requireAdmin / safeNext), actions, rate limiter
src/lib/server/network.ts     DNS cache + longer connect timeout for slow networks (loaded by src/instrumentation.ts)
src/proxy.ts                  session refresh + protection of /admin (admins only), /dashboard, /account
src/app/api/revalidate        POST with REVALIDATE_SECRET → refresh cached pages after out-of-band DB edits
data/pre-supabase-backup/     the JSON content as it was before migration (kept as an archive; not used)
```

**Tables:**
- `profiles`, with role `customer` or `admin`.
- `categories`, `products`, plus `product_files` (private).
- `articles`, plus `article_categories`.
- `subscribers` and `site_settings`.
- Two storage buckets: `public-media` (covers and article images) and `ebook-files` (**private**).

**Security model:** defence in depth.
1. **Row Level Security** on every table, so the database itself decides what each visitor may read or write:
   - The public sees only published books, live articles, categories and settings.
   - Customers can read and edit only their own profile name; the role column can't be written by users at all.
   - Only admins can change content.
2. **Proxy:** `src/proxy.ts` sends signed-out visitors to `/login` and non-admins away from `/admin`.
3. **Server Actions:** every admin action calls `requireAdmin()`, which validates the session with Supabase Auth.
4. **Service-role key:** server-only, used for a few validated operations: creating accounts without email confirmation, newsletter sign-ups, signed upload URLs and role changes.

**Accounts:**
- Registration without email confirmation (owner's choice). Users are signed in immediately.
- Passwords: at least 8 characters, including a letter and a number.
- The **ADMIN_EMAIL address is reserved**: it can't self-register. Otherwise anyone could claim it, since emails aren't confirmed.
- Rate limits: sign-in 10 per 15 minutes per IP and email; registration 5 per hour; password reset and newsletter limits too. A honeypot field catches bots.
- Password reset by email, through `/auth/callback`.
- `?next=` redirects are restricted to this site.

**Admin additions:**
- **Books:** cover upload, plus a **private eBook file upload**. Files go straight to Supabase Storage through one-time signed URLs.
- **Articles:** featured-image upload and inline image insertion.
- **Customers:** search and role changes. You can't change your own role, and the last admin can't be removed.
- **Subscribers:** list, delete, and CSV export protected against spreadsheet-formula injection.
- **Settings:** brand name, tagline, description, contact email and social links, applied site-wide immediately.

**Newsletter:**
- Real sign-ups, validated, rate-limited and protected by a honeypot.
- Duplicate addresses get the same reply, so the form can't reveal who is subscribed.
- Unsubscribing requires clicking a confirm button, so email link scanners can't unsubscribe people.

## Phase 6: payments, orders, delivery and email

```
supabase/migrations/0003_orders.sql   orders, order_items, downloads (entitlements), payment_events + RLS
supabase/migrations/0004_…            purchased books can't be deleted (buyers keep access)
src/lib/payments/lemonsqueezy.ts      checkout creation, refunds, webhook signature verification
src/lib/orders/                       service (fulfil/refund/receipts), checkout + status actions, admin queries/actions
src/app/api/webhooks/lemonsqueezy     the ONLY place an order becomes "paid"
src/app/api/download/[productId]      entitlement check → 60-second signed URL to the private file
src/lib/email/send.ts                 Resend (receipts, password resets) — test domains are never emailed
scripts/payments/setup.mjs            find the product variant; register/replace the webhook via API
scripts/payment-check.mjs             42 checks with simulated, correctly signed webhooks
```

**How a purchase works:**
1. **Checkout:** the customer signs in and clicks **Pay** on `/checkout`. The browser sends only book IDs; prices are read from the database, and books they already own are skipped.
2. **Order and payment:** we create a *pending* order, then a Lemon Squeezy checkout with a custom price equal to our subtotal and our order ID attached. The customer pays on Lemon Squeezy's page, which adds any tax.
3. **Webhook:** Lemon Squeezy sends `order_created`, signed with the shared secret. We verify:
   - the signature, using a constant-time HMAC check on the raw body;
   - the store, product variant, currency, **subtotal = our price**, `paid` status, and test/live mode.

   Only then is the order marked paid, downloads granted, and a receipt emailed through Resend. Each delivery is processed once; replays are acknowledged and ignored.
4. **Confirmation:** the confirmation page **waits for that webhook**. Returning from checkout never unlocks anything.
5. **Downloads:** each download checks ownership, then redirects to a **60-second signed URL** for the private file.
6. **Refunds:** issued from Admin → Orders through the Lemon Squeezy API. The verified `order_refunded` webhook marks the order refunded and **revokes download access**; partial refunds keep access.

**Revenue** (Admin overview and Orders) counts only webhook-confirmed payments, excluding full refunds. Test-mode and live payments are reported separately.

**Password-reset emails** now go through Resend from your domain, so they reach every customer, not just Supabase team members.

### Going live with payments (later)

1. Activate the store in Lemon Squeezy (identity and payout verification).
2. In **live** mode, create a live API key and the same "eBook order" product.
3. In `.env.local`:
   - replace `LEMONSQUEEZY_API_KEY`;
   - set `LEMONSQUEEZY_TEST_MODE=false`;
   - run `node scripts/payments/setup.mjs` to pick up the live variant.
4. Register the live webhook: `node scripts/payments/setup.mjs --webhook https://your-domain`.

## Phase 7: SEO, legal pages, analytics and advertising

```
src/app/sitemap.ts, robots.ts         sitemap.xml (published books, live articles, categories) and robots.txt
src/app/opengraph-image.tsx, icon.tsx default social-share image and app icon (generated)
src/components/seo/json-ld.tsx        escaped JSON-LD: Organization + WebSite (home), Book/Product + Offer, BlogPosting, breadcrumbs
src/lib/legal/content.ts              Privacy, Terms, Refund texts, filled from Admin → Settings (publisher, country, email)
src/components/consent/               cookie banner, "Cookie settings" footer link, consent-gated Google Tag Manager
src/components/ads/                   AdSense placements: home, article (in-content), article sidebar (2xl screens)
src/app/ads.txt/route.ts              ads.txt, published automatically once a publisher ID is saved
src/app/admin/advertising             publisher ID, ad unit IDs, on/off switch
src/app/admin/analytics               revenue, orders, sales by book, customer and subscriber growth (30d / 90d / 12m, live / test)
```

- **SEO:** every public page has a title, description and canonical URL. Canonical and sitemap URLs use `NEXT_PUBLIC_SITE_URL`, falling back to `https://digitaltraffic.blog` in production builds. Private areas are disallowed in robots.txt and marked noindex.
- **Consent:** nothing from Google loads until the visitor clicks **Accept**. Essential cookies (sign-in, bag) need no consent. The choice is stored in the visitor's browser and can be changed from the footer at any time. Withdrawing consent reloads the page so loaded scripts are gone. Tag Manager never runs on `/admin`.
- **Google Analytics** is configured inside Tag Manager (container `NEXT_PUBLIC_GTM_ID`), not in code.
- **Ads** are off by default and can only be switched on once a publisher ID and at least one ad unit are saved. Ads never render on checkout, bag, account, download or admin pages, and load only after consent.
- **Analytics** uses only webhook-verified payments, excluding full refunds. Live and test mode are never mixed.
- **Tests:** `node scripts/e2e.mjs seo-check` covers 54 checks. It saves the site settings first and restores them afterwards. Google scripts are blocked in the test browser.

### Setup checklist

1. **Tag Manager → GA4:** at tagmanager.google.com, open container GTM-5Z9D2GPC → *Tags → New → Google tag*. Paste your GA4 Measurement ID (`G-…`), set the trigger to *Initialization – All Pages*, then click **Submit → Publish**.
2. **Search Console:** add a *Domain* property for `digitaltraffic.blog`, verified by DNS TXT record. Then submit `https://digitaltraffic.blog/sitemap.xml`. Alternatively, set `GOOGLE_SITE_VERIFICATION` for the HTML-tag method.
3. **AdSense (after launch):** apply with the live site, then fill in **Admin → Advertising** once approved.
4. **Legal texts** are a solid template, not legal advice. Have them reviewed for your state.

## Design pass: themes, glass, 3D and motion (before Phase 8)

- **Themes:** there are two themes, Classic Library (light) and Modern Luxury (dark), toggled from the sun/moon pill in the header.
  - Without a saved choice, the OS setting is followed.
  - `src/components/theme/theme-script.ts` sets `<html data-theme>` before first paint, so the page never flashes the wrong theme.
  - Dark mode re-points the same semantic tokens in `globals.css`. Printed objects (book covers) use fixed tokens: `ink`, `paper`, `parchment` and `brass`.
- **Glass:**
  - The `glass`, `glass-strong` and `glass-layer` utilities give frosted surfaces over a warm ambient light set on `body`.
  - `glass-layer` puts the frosting on a `::before` layer, so it's safe around `position: fixed` children such as the mobile menu.
  - **Performance rule:** `glass` (cards and panels) has **no** `backdrop-filter`; real blur is only on the header pills, the mobile menu and the cookie banner. The ambient light is a fixed GPU layer (`.ambient-light`), not `background-attachment: fixed`, and the paper grain uses no blend mode. Each of these, done the other way, made scrolling lag.
- **Header:**
  - The logo, the navigation and each action sit in their own glass pills.
  - On the homepage the bar is fully transparent and the 3D hall runs under it (the stage opts in with `data-overlay-header`).
  - On small phones the account link moves into the menu.
- **3D:**
  - The hall follows the theme: daylight vs evening, with brass pendant lamps lit at night only.
  - It has procedural wood, floorboard, leather-spine and plaster textures (`scene/textures.ts`, no downloads), plus window light shafts.
  - Dust drifts only while the visitor scrolls or moves, then rendering stops completely.
- **Book covers:** `Book3D` is a CSS 3D hardcover with a spine, page edges, pointer tilt and glare. A cover morphs from its card into the book page via React `<ViewTransition>`.
- **Motion** (`src/components/motion/`):
  - Native scrolling (the Lenis smooth-scroll library was removed because it made scrolling feel laggy), plus page fade/rise transitions in `(site)/template.tsx`.
  - `SplitText` headline reveals (`<Heading reveal>`), `Magnetic` calls to action, `Parallax`, `CountUp`, and a cursor ring.
  - Gold-foil text (`text-foil`) and a paper-grain overlay.
  - With reduced motion, everything falls back to static.
- **Theme switch:** one View-Transition cross-fade of the page. The 3D lamp lights always exist (intensity 0 by day), so switching never forces three.js to recompile its shaders.
- **Performance probe:** `node scripts/perf-check.mjs https://digitaltraffic.blog` reports scroll frame times and theme-switch time. Add `WEBGL=1` to include software 3D, which is much slower than a real GPU.
- **Tests:** `scripts/design-check.mjs` covers themes, toggle persistence, the no-flash script, 3D books, reveals, counters and phone overflow, and saves screenshots of both themes to `docs/screenshots/theme-*.png`.

## Phase 8: launch (trial on the free tier)

**Live:** https://digitaltraffic.blog. Vercel project `digital-traffic` (Hobby plan, region `iad1`, next to Supabase in us-east-1). Lemon Squeezy is still in **test mode**. `www` redirects (308) to the main domain.

| Task | Command |
|---|---|
| Deploy the current code to production | `npx vercel deploy --prod` |
| Copy settings from `.env.local` to Vercel (values never printed), then redeploy | `node scripts/deploy/sync-env.mjs` |
| Read-only launch smoke test (headers, pages, redirects, protections) | `node scripts/deploy/smoke.mjs https://digitaltraffic.blog` |
| Run real checks against the live site (qa-* data only, cleaned up) | `node scripts/auth-check.mjs https://digitaltraffic.blog` (likewise `store-check`, `payment-check`) |

- **DNS (Hostinger, nameservers unchanged):**
  - `A @ 216.198.79.1` and `A @ 64.29.17.1`;
  - `CNAME www ebd2f32f4e369f68.vercel-dns-017.com`.
  - The Resend email records are untouched.
- **Security headers** (`next.config.ts`):
  - HSTS, nosniff, Referrer-Policy and Permissions-Policy;
  - framing blocked (`X-Frame-Options` plus CSP `frame-ancestors`);
  - `form-action` limited to the site and Lemon Squeezy checkout;
  - no `X-Powered-By`.
- **Payments webhook:** test-mode webhook #150773 posts to `https://digitaltraffic.blog/api/webhooks/lemonsqueezy`.

### Going fully live (when you're ready)

1. **Vercel Pro:** the Hobby plan is for non-commercial use. Upgrade the project's team to Pro before taking real sales.
2. **Lemon Squeezy:**
   - Activate the store, then in **live mode** create a new API key and put it in `.env.local`. This also retires the key that was pasted in chat.
   - Set `LEMONSQUEEZY_TEST_MODE=false` and run `node scripts/payments/setup.mjs`, which creates or finds the live "eBook order" product and variant.
   - Run `node scripts/payments/setup.mjs --webhook https://digitaltraffic.blog`.
   - Run `node scripts/deploy/sync-env.mjs`, then `npx vercel deploy --prod`.
   - Make one real low-price purchase and refund it.
3. **Google:**
   - In Tag Manager (GTM-5Z9D2GPC), add a *Google tag* with your GA4 ID (`G-…`) and publish.
   - In Search Console, add a *Domain* property for `digitaltraffic.blog` (DNS TXT record in Hostinger), then submit `https://digitaltraffic.blog/sitemap.xml`.
4. **AdSense:** apply once there are several articles, then fill in Admin → Advertising.
5. **Optional:**
   - **Upstash Redis:** add `UPSTASH_REDIS_REST_URL`/`TOKEN` for shared rate-limit counts across Vercel instances.
   - **Supabase:** in Auth → URL Configuration, set Site URL to `https://digitaltraffic.blog`. The password-reset links already use the site address, so this is housekeeping.
6. **Real-device check:** open the homepage on a real phone and a laptop with a GPU, in both themes, and try one purchase flow.

## Known gaps (by design, later phases)

- **Password-reset email delivery:** the reset flow works, but Supabase's built-in email sender only delivers to your Supabase team's addresses and is heavily rate-limited. Real customer emails need custom SMTP, which comes with Resend in Phase 6.
- **Rate limiting:** without Upstash, the limiter keeps counts in memory on each Vercel instance, so limits are per instance. Add `UPSTASH_REDIS_REST_URL`/`TOKEN` (free tier) to share them; no code change needed.
- **Slow DNS on the development machine:** measured at ~10 s. The app now caches DNS lookups and reuses connections, so it copes. Switching Windows DNS to 1.1.1.1 or 8.8.8.8 would make local development much faster.


- **Console warning:** `THREE.Clock … deprecated` appears once per page load. It comes from inside @react-three/fiber 9.8.2 with three 0.186. It's harmless and needs an upstream R3F update.
- **Test coverage:** 3D was tested in headless Edge with software WebGL (SwiftShader) at phone and desktop sizes. It has **not yet been tested on a real phone or a real GPU**, which is worth doing before launch (Phase 8).

- **Admin routes:** `/admin` and `/dashboard` have **no access control yet**. They contain no data; protection lands in Phase 5 before any data does.
- **Category links:** these point to `/blog?category=…`, which is not yet filtered. Category pages arrive in Phase 4.
- **Cart:** there is no cart state or bag count. That arrives in Phase 3.
- **Not under version control:** `git init` has not been run.
