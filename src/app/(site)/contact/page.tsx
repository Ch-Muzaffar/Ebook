import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Text } from "@/components/ui/typography";
import { getSiteSettings } from "@/lib/settings/queries";

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions about a book, an order or a download? Get in touch.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const { contactEmail, brandName, publisherName, businessCountry } = await getSiteSettings();
  return (
    <>
      <PageHeader eyebrow="Contact" title="Get in touch" description={`Questions about a book, an order or ${brandName}? We're happy to help.`} />
      <Container width="narrow" className="py-section">
        {contactEmail ? (
          <div className="glass flex flex-col gap-3 rounded-lg p-8">
            <Text muted>Email us at</Text>
            <a href={`mailto:${contactEmail}`} className="font-serif text-h3 text-charcoal underline decoration-gold underline-offset-8 hover:text-gold-deep">
              {contactEmail}
            </a>
            <Text size="small" muted>
              We usually reply within two working days.
            </Text>
            {publisherName && (
              <Text size="small" muted>
                {brandName} is published by {publisherName}
                {businessCountry && <>, {businessCountry}</>}.
              </Text>
            )}
          </div>
        ) : (
          <Text muted>Contact details will be published here soon.</Text>
        )}
      </Container>
    </>
  );
}
