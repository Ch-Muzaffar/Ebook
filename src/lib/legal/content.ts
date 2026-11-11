import type { SiteSettings } from "@/lib/settings/queries";
import { siteUrl } from "@/lib/site-url";

/**
 * Policy texts, written in Markdown and filled from Admin → Settings (brand, publisher,
 * country, contact email) so they stay correct when those details change.
 */
function who(s: SiteSettings) {
  const brand = s.brandName || "Digital Traffic";
  const publisher = s.publisherName || brand;
  const country = s.businessCountry || "the United States";
  const email = s.contactEmail;
  const contact = email ? `[${email}](mailto:${email})` : "the [contact page](/contact)";
  const domain = siteUrl().replace(/^https?:\/\//, "");
  return { brand, publisher, country, contact, domain };
}

export function privacyPolicy(s: SiteSettings) {
  const { brand, publisher, country, contact, domain } = who(s);
  return `
${brand} (“we”, “us”) is a digital publishing website at ${domain}, operated by ${publisher}, based in ${country}. This policy explains what personal information we collect, why, who we share it with, and the choices you have.

## Information we collect

- **Account details** — your name, email address and a securely hashed password when you create an account.
- **Purchase records** — the books you buy, order amounts, dates and order status. **We never see or store your card details**: payments are handled entirely by our payment provider (see below).
- **Newsletter** — your email address if you subscribe, and the date you subscribed or unsubscribed.
- **Messages** — anything you send us by email or through the contact page.
- **Technical data** — basic server logs (IP address, browser type, pages requested) used for security and to keep the site running.
- **Analytics and advertising data** — only if you accept cookies (see [Cookies](#cookies)).

## How we use your information

- To create and secure your account and give you access to the books you've purchased.
- To process orders, deliver download links and send receipts and account emails (for example, password resets).
- To send the newsletter you asked for — every email includes an unsubscribe link.
- To answer your questions and provide support.
- To understand, with your consent, how the site is used so we can improve it.
- To prevent fraud and abuse, and to meet legal and tax obligations.

We do not sell your personal information, and we do not share it for cross-context behavioral advertising without your consent.

## Payments

Checkout is provided by **Lemon Squeezy**, which acts as the *merchant of record* for every sale. Lemon Squeezy (and its card processors) collects your payment details, billing address and tax information directly, under [its own privacy policy](https://www.lemonsqueezy.com/privacy). We receive only what we need to fulfil your order: your name, email, the items purchased, the amount and the payment status.

## Service providers

We rely on a small number of trusted providers that process data on our behalf:

| Provider | Purpose |
| --- | --- |
| Supabase | Database, user accounts and secure file storage |
| Lemon Squeezy | Checkout, payment processing, sales tax and invoicing |
| Resend | Sending transactional emails (receipts, password resets) |
| Google Tag Manager / Google Analytics | Visit statistics — only with your consent |
| Google AdSense | Advertising — only if ads are enabled and you consent |
| Our hosting provider | Serving the website |

These providers may store data in the United States or other countries. Where required, transfers are protected by appropriate safeguards such as standard contractual clauses.

## Cookies

**Essential cookies** keep you signed in and remember your shopping bag. They are necessary for the site to work and are always on.

**Analytics and advertising cookies** are off until you choose **Accept** in the cookie banner. If you accept, we load Google Tag Manager, which runs Google Analytics to measure visits, and — once advertising is enabled — Google AdSense, which may use cookies to show and measure ads. Google's use of data is described in [How Google uses information from sites that use its services](https://policies.google.com/technologies/partner-sites). You can opt out of personalized advertising at [Google Ads Settings](https://adssettings.google.com).

You can change your choice at any time using **Cookie settings** at the bottom of every page. Your choice is stored in your own browser.

## How long we keep data

- Account data — for as long as your account is open.
- Order records — as long as required for accounting and tax purposes (typically up to 7 years), and so you keep access to your purchases.
- Newsletter — until you unsubscribe.
- Server logs — for a limited period for security purposes.

## Your rights

Depending on where you live (including under the GDPR, UK GDPR and U.S. state laws such as the California Consumer Privacy Act), you may have the right to access, correct, delete or receive a copy of your personal information, to object to or restrict certain processing, to withdraw consent, and to opt out of the sale or sharing of personal information. We will not discriminate against you for exercising these rights.

To make a request, contact us at ${contact}. We may need to verify your identity before acting. You may also lodge a complaint with your local data protection authority.

## Security

Passwords are hashed, data is encrypted in transit, book files are stored privately and served only through short-lived links to verified buyers, and access to customer data is restricted. No system is perfectly secure, but we work to protect your information.

## Children

This website is not directed at children under 13, and we do not knowingly collect personal information from them. If you believe a child has given us information, contact us and we will delete it.

## Changes to this policy

We may update this policy from time to time. The “Last updated” date above shows when it last changed; significant changes will be highlighted on the site.

## Contact

${publisher}, ${brand} — ${country}. Email: ${contact}.
`;
}

export function termsOfService(s: SiteSettings) {
  const { brand, publisher, country, contact, domain } = who(s);
  return `
These terms govern your use of ${brand} at ${domain}, operated by ${publisher} (“we”, “us”), based in ${country}. By using the website or buying a book you agree to them.

## Using the website

You may browse, read articles and buy books for your personal use. You agree not to misuse the website — for example, by attempting to access other users' accounts or private files, interfering with its operation, or scraping content at scale.

## Accounts

You are responsible for keeping your password confidential and for activity under your account. Give accurate information and keep your email address up to date, since that is where receipts and download access are sent. We may suspend accounts that break these terms.

## Purchases and payment

Prices are shown in U.S. dollars. Orders are processed by **Lemon Squeezy**, our merchant of record, which handles payment, applicable sales tax/VAT and invoicing; its [terms](https://www.lemonsqueezy.com/buyer-terms) also apply to your payment. An order is complete once payment is confirmed, after which the book appears in your library.

We may correct pricing errors and may cancel an order affected by an obvious error, in which case any payment is refunded in full.

## Digital licence

When you buy an eBook you receive a **personal, non-exclusive, non-transferable licence** to download it and read it on your own devices. You may not resell, share, publicly post, redistribute or remove copyright notices from any book. All books, articles, designs and other content on the website remain the property of ${publisher} or their respective authors and are protected by copyright.

## Downloads

Download links are available from your library and are generated securely each time. Please keep your own copy of purchased files; we aim to keep purchases available, but cannot guarantee indefinite availability.

## Refunds

All sales are final, except as described in our [Refund Policy](/refund-policy).

## Content and advertising

Articles are provided for general information and do not constitute professional (for example financial, legal or medical) advice. The website may show third-party advertising and links; we are not responsible for third-party websites or products.

## Disclaimers and liability

The website and books are provided “as is”. To the fullest extent permitted by law, we disclaim implied warranties and are not liable for indirect, incidental or consequential damages. Our total liability for any claim relating to a purchase is limited to the amount you paid for it. Nothing in these terms limits rights you have under consumer protection laws that cannot be excluded.

## Changes

We may update these terms; the version on this page applies from its “Last updated” date. Continued use of the website after changes means you accept them.

## Governing law

These terms are governed by the laws of ${country}, without regard to conflict-of-law rules, except where the consumer laws of your country of residence give you additional protection.

## Contact

Questions about these terms: ${contact}.
`;
}

export function refundPolicy(s: SiteSettings) {
  const { contact } = who(s);
  return `
Our books are digital products delivered instantly, so **all sales are final** and we do not offer refunds for change of mind, or once a book has been downloaded — please read each book's description and table of contents before buying.

## When we will refund you

We will always make it right if something went wrong on our side. You are entitled to a full refund when:

- **You were charged twice** for the same order, or charged for an order that was never completed.
- **The file is faulty** — it won't open, is corrupted, or is substantially different from its description — and we cannot provide a working replacement within a reasonable time.
- **You never received access** to your book and we are unable to resolve the problem.
- **A refund is required by law** in your country of residence.

## How to request help

Email ${contact} within **14 days** of purchase with your order number (shown in your receipt and in your library) and a short description of the problem. We usually reply within two business days and will first try to fix the issue — for example by sending a working file.

## How refunds are paid

Approved refunds are issued through our payment provider, Lemon Squeezy, to your original payment method. Depending on your bank, it can take 5–10 business days to appear. When an order is refunded, access to the book is removed from your library.

## Chargebacks

If there's a problem, please contact us first — we're happy to help. Opening a chargeback without contacting us may result in your account being suspended while it is resolved.
`;
}
