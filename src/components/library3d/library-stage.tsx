"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Book3D } from "@/components/cards/book-3d";
import { BookCover } from "@/components/cards/book-cover";
import { Magnetic } from "@/components/motion/effects";
import { useTheme } from "@/components/theme/theme";
import { LinkButton } from "@/components/ui/button";
import { Eyebrow, Heading, Text } from "@/components/ui/typography";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/content/types";
import { ease } from "@/lib/design/motion";
import { CategoryName } from "@/components/categories/categories-provider";
import { formatPrice } from "@/lib/format";
import { SceneErrorBoundary } from "./scene-error-boundary";
import { BOOK_STATIONS } from "./scene-config";
import { createSceneScrollState } from "./scroll-store";
import { StaticLibraryBackdrop } from "./static-backdrop";
import { useSceneEnvironment } from "./use-scene-environment";

// three.js + R3F load only on the client, only when 3D is actually going to be shown.
const LibraryCanvas = dynamic(() => import("./scene/library-canvas"), { ssr: false });

/**
 * Homepage Scenes 1–2 (PRD §6.3): the library entrance and the featured books.
 *
 * Layout: a sticky, viewport-tall "stage" holds the 3D canvas (or the static backdrop), and
 * ordinary scrolling HTML steps pass over it. Native scrolling is never hijacked — scroll
 * position is only *read* to drive the camera. All text, prices and links are real HTML,
 * so they are accessible, indexable and work without WebGL.
 */
export function LibraryStage({ featured, tagline, description }: { featured: Product[]; tagline: string; description: string }) {
  const books = featured.slice(0, BOOK_STATIONS.length);
  const [env, forceStatic] = useSceneEnvironment();
  const theme = useTheme(); // the 3D hall follows the site theme (daylight library / evening luxury)
  const [ready, setReady] = useState(false);
  const stateRef = useRef(createSceneScrollState());
  const stageRef = useRef<HTMLElement>(null);
  const router = useRouter();
  const show3d = env.mode === "3d";

  // Scroll → focus (0 = entrance, i = book i). Reading only; never prevents/alters scrolling.
  useEffect(() => {
    if (!show3d) return;
    const stage = stageRef.current;
    const state = stateRef.current;
    if (!stage) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      // The stage starts at the very top of the page (under the transparent header); each step is one viewport tall.
      const rect = stage.getBoundingClientRect();
      state.focus = Math.min(Math.max(-rect.top / window.innerHeight, 0), books.length);
      state.activeUntil = performance.now() + 900;
      state.requestFrame();
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const io = new IntersectionObserver(([entry]) => {
      state.visible = entry.isIntersecting;
      if (entry.isIntersecting) onScroll();
    });
    io.observe(stage);
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [show3d, books.length]);

  // Subtle pointer parallax on devices with a fine pointer (mouse/trackpad) only.
  useEffect(() => {
    if (!show3d || !window.matchMedia("(pointer: fine)").matches) return;
    const state = stateRef.current;
    const onMove = (e: PointerEvent) => {
      state.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      state.pointerY = -((e.clientY / window.innerHeight) * 2 - 1);
      state.activeUntil = performance.now() + 900;
      if (state.visible) state.requestFrame();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [show3d]);

  return (
    <section
      ref={stageRef}
      aria-label="Library entrance and featured books"
      // data-overlay-header: the header turns fully transparent and the stage slides up beneath it,
      // so the 3D hall fills the whole first screen with only the glass pills floating above.
      data-overlay-header=""
      // overflow-x-clip (not hidden): stops decorative halos widening the page on phones
      // without creating a scroll container, so the sticky stage keeps working.
      className="relative -mt-header overflow-x-clip [--stage-h:100svh]"
    >
      {/* Sticky visual layer (decorative; all content is in the steps below). */}
      <div className="sticky top-0 h-(--stage-h) overflow-hidden" aria-hidden>
        <StaticLibraryBackdrop />
        {show3d && (
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-(--duration-scene) ease-editorial",
              ready ? "opacity-100" : "opacity-0",
            )}
          >
            <SceneErrorBoundary onError={forceStatic}>
              <LibraryCanvas
                stateRef={stateRef}
                products={books}
                tier={env.tier}
                layout={env.layout}
                theme={theme}
                onSelect={(slug) => router.push(`/books/${slug}`)}
                onReady={() => setReady(true)}
                onContextLost={forceStatic}
              />
            </SceneErrorBoundary>
          </div>
        )}
      </div>

      {/* Scrolling content steps, layered over the sticky stage. Pointer events pass through
          empty areas to the canvas (so the 3D books are clickable); cards re-enable them. */}
      <div className="pointer-events-none relative -mt-(--stage-h)">
        <HeroStep tagline={tagline} description={description} />
        <ol aria-label="Featured books">
          {books.map((p, i) => (
            <FeaturedStep key={p.slug} product={p} index={i} total={books.length} showCover={!show3d || !ready} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function HeroStep({ tagline, description }: { tagline: string; description: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  // Gentle parallax: copy drifts up and fades as the camera starts moving in.
  // Style-bound motion values bypass MotionConfig, so reduced motion is handled explicitly.
  const y = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -90]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, reduce ? 1 : 0]);

  return (
    <div ref={ref} className="relative flex h-(--stage-h) items-center justify-center pt-header">
      <motion.div style={{ y, opacity }} className="relative flex flex-col items-center gap-7 px-gutter text-center">
        {/* Soft ivory halo keeps the headline legible over the 3D hall. */}
        <div
          aria-hidden
          className="absolute -inset-x-16 -inset-y-20 -z-10 bg-[radial-gradient(closest-side,var(--halo),var(--halo-soft)_60%,transparent)]"
        />
        <Eyebrow>A digital library</Eyebrow>
        <Heading as="h1" size="display" className="max-w-4xl" reveal>
          {tagline}
        </Heading>
        <Text size="lead" muted className="max-w-xl motion-safe:animate-[menu-in_1s_var(--ease-editorial)_500ms_both]">
          {description}
        </Text>
        <Magnetic className="pointer-events-auto motion-safe:animate-[menu-in_1s_var(--ease-editorial)_700ms_both]">
          <LinkButton href="/books" size="lg">
            Explore Books
          </LinkButton>
        </Magnetic>
      </motion.div>
      <div aria-hidden className="absolute bottom-8 flex flex-col items-center gap-3 text-caption text-muted">
        Scroll
        <span className="relative block h-10 w-px overflow-hidden bg-line">
          <span className="absolute inset-x-0 top-0 h-1/2 bg-gold motion-safe:animate-[scroll-cue_2.4s_var(--ease-editorial)_3]" />
        </span>
      </div>
    </div>
  );
}

function FeaturedStep({
  product,
  index,
  total,
  showCover,
}: {
  product: Product;
  index: number;
  total: number;
  showCover: boolean;
}) {
  return (
    <li className="relative mx-auto grid h-(--stage-h) w-full max-w-content grid-rows-[1fr_auto] px-gutter pt-header pb-6 lg:grid-cols-2 lg:grid-rows-1 lg:items-center lg:pb-0">
      {/* Text card: left column on wide screens, bottom sheet on phones/tablets. */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ amount: 0.6 }}
        transition={{ duration: 0.7, ease: ease.editorial }}
        className="glass pointer-events-auto bg-(--glass-bg-strong) row-start-2 flex flex-col gap-4 rounded-lg p-6 sm:p-8 lg:row-start-1 lg:max-w-md"
      >
        <Eyebrow>
          Featured · {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")} ·{" "}
          <CategoryName slug={product.category} />
        </Eyebrow>
        <Heading as="h2" size="h2">
          {product.title}
        </Heading>
        <Text muted className="line-clamp-3">
          {product.description}
        </Text>
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <p className="text-foil font-serif text-h3">{formatPrice(product.priceCents)}</p>
          <LinkButton href={`/books/${product.slug}`} variant="secondary">
            View Book
          </LinkButton>
        </div>
      </motion.div>

      {/* Static cover: shown before 3D is ready and as the no-WebGL / reduced-motion fallback.
          Occupies the same space the 3D book appears in, so swapping causes no layout shift. */}
      <div className="row-start-1 flex items-center justify-center py-6 lg:col-start-2">
        <Link
          href={`/books/${product.slug}`}
          tabIndex={-1}
          aria-hidden
          className={cn(
            "w-[min(42vw,13rem)] transition-opacity duration-(--duration-slow) lg:w-[min(22vw,17rem)]",
            showCover ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <Book3D tone={product.coverTone} rest={index % 2 === 0 ? -18 : 18} interactive={showCover}>
            <BookCover product={product} sizes="(min-width: 1024px) 22vw, 42vw" />
          </Book3D>
        </Link>
      </div>
    </li>
  );
}
