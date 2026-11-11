import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { LinkButton } from "@/components/ui/button";
import { Heading, Text } from "@/components/ui/typography";
import { getSiteSettings } from "@/lib/settings/queries";

export const metadata: Metadata = {
  title: "About",
  description: "Who we are, what we publish and how we work — an independent digital publisher of books and articles.",
  alternates: { canonical: "/about" },
};

const PRINCIPLES = [
  {
    title: "Useful first",
    body: "Every book and article should leave you with something you can apply — a clearer idea, a better habit, a practical next step.",
  },
  {
    title: "Carefully made",
    body: "We edit for clarity and design for calm reading. No filler, no clickbait, no padding to hit a page count.",
  },
  {
    title: "Fair and transparent",
    body: "Clear prices in USD, secure checkout, instant downloads and a library that keeps your purchases in one place.",
  },
];

/** Publisher identity page — clear ownership details also support the AdSense review (PRD §11). */
export default async function AboutPage() {
  const s = await getSiteSettings();
  const publisher = s.publisherName || s.brandName;
  return (
    <>
      <PageHeader eyebrow="About" title="A library for curious minds" description={s.tagline} />

      <Container width="prose" className="flex flex-col gap-6 py-section">
        <Heading as="h2" size="h3">
          Who we are
        </Heading>
        <Text>
          {s.brandName} is an independent digital publisher
          {s.publisherName && (
            <>
              {" "}
              founded and run by <strong className="font-semibold">{s.publisherName}</strong>
            </>
          )}
          {s.businessCountry && <> in {s.businessCountry}</>}. We publish eBooks and long-form articles on the
          ideas that shape how we live and work — money and business, personal growth, technology and more.
        </Text>
        <Text>
          The journal is free to read. Our books go deeper: complete, carefully structured guides that you buy once,
          download instantly and keep in your personal library.
        </Text>

        <Heading as="h2" size="h3" className="mt-8">
          What we believe
        </Heading>
        <ul className="grid gap-6 sm:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <li key={p.title} className="glass flex flex-col gap-2 rounded-lg p-6">
              <p className="font-serif text-h4">{p.title}</p>
              <p className="text-small text-muted">{p.body}</p>
            </li>
          ))}
        </ul>

        <Heading as="h2" size="h3" className="mt-8">
          Publisher information
        </Heading>
        <dl className="grid gap-x-8 gap-y-4 rounded-lg bg-beige p-6 text-small sm:grid-cols-[auto_1fr]">
          <dt className="text-muted">Publisher</dt>
          <dd className="font-medium">{publisher}</dd>
          {s.businessCountry && (
            <>
              <dt className="text-muted">Country</dt>
              <dd className="font-medium">{s.businessCountry}</dd>
            </>
          )}
          {s.contactEmail && (
            <>
              <dt className="text-muted">Email</dt>
              <dd className="font-medium">
                <a href={`mailto:${s.contactEmail}`} className="underline decoration-gold underline-offset-4 hover:text-gold-deep">
                  {s.contactEmail}
                </a>
              </dd>
            </>
          )}
          <dt className="text-muted">Payments</dt>
          <dd className="font-medium">Processed securely by Lemon Squeezy (merchant of record)</dd>
        </dl>

        <div className="mt-8 flex flex-wrap gap-3">
          <LinkButton href="/books">Explore books</LinkButton>
          <LinkButton href="/contact" variant="secondary">
            Contact us
          </LinkButton>
        </div>
      </Container>
    </>
  );
}
