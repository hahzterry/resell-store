import type { ReactNode } from "react";
import { ArrowUpRightIcon, CheckIcon } from "@repo/ui/icons";
import { cn } from "@repo/ui/lib/utils";
import { docsUrl } from "../../lib/urls";
import { CheckDot, Container, SectionIntro } from "./parts";
import { PayPalLogo } from "./paypal-logo";

/*
 * The hackathon sponsors: what each one does here, why it helps, and its docs.
 * "In the app today" means the code calls it now; the rest are on the build
 * list. Move a sponsor up only once its integration lands.
 */

type Logo = {
  /** In public/sponsors, trimmed to the mark. */
  src: string;
  width: number;
  height: number;
  /** Display height in px, so wide and tall marks read the same size. */
  size: number;
};

type Sponsor = {
  name: string;
  logo: Logo;
  /** How resell.store uses it. */
  use: string;
  /** What that gets sellers and buyers. */
  benefit: string;
  docs: string;
  /** Our own write-up on the docs site. */
  notes?: string;
  /** Label for the notes link, when it's a guide rather than a build write-up. */
  notesLabel?: string;
};

const paypal = {
  use: "The money side of every sale. Sellers connect their own PayPal, buyers pay with PayPal or a card, and the payment waits at PayPal until the buyer has the item. Our fee comes off in the same payment, and refunds and disputes run through it too.",
  benefit:
    "Buyers only pay for what arrives, and sellers get paid automatically, straight to their own PayPal.",
  uses: [
    "Seller onboarding",
    "Guest checkout",
    "Held until it arrives",
    "Fee split",
    "Refunds and disputes",
    "Automatic payouts",
  ],
  docs: "https://developer.paypal.com/platforms/overview",
  notes: "/dev/stack/paypal",
};

const live: Sponsor[] = [
  {
    name: "Channel3",
    logo: { src: "/sponsors/channel3.png", width: 582, height: 112, size: 27 },
    use: "Takes your photo and the item's name and finds the product in a catalog of over 100 million, then pulls what it costs new, any second-hand offers from resale shops, and the maker's own photos.",
    benefit:
      "Listings start with the right product, the new price to anchor against and clean photos, with nothing to look up.",
    docs: "https://docs.trychannel3.com/",
    notes: "/dev/stack/channel3",
  },
  {
    name: "Kernel",
    logo: { src: "/sponsors/kernel.png", width: 400, height: 84, size: 24 },
    use: "Cloud browsers that search popular marketplaces side by side for the same item and read what each one is listed for, plus any product link you paste into the shopping sidekick.",
    benefit:
      "Prices come from what's for sale today, not a guess, and one slow site never holds up the rest.",
    docs: "https://www.kernel.sh/docs",
    notes: "/dev/stack/kernel",
  },
  {
    name: "Render",
    logo: { src: "/sponsors/render.png", width: 600, height: 115, size: 27 },
    use: "Runs the whole thing: the app on every shop's own address, Postgres with vector search, and the Workflows that release payouts and refunds on time.",
    benefit:
      "Money jobs retry until they go through, so sellers get paid and buyers get refunds without anyone watching a queue.",
    docs: "https://render.com/docs",
    notes: "/dev/stack/render",
  },
  {
    name: "Zapier",
    logo: { src: "/sponsors/zapier.png", width: 443, height: 120, size: 30 },
    use: "Nine triggers, from a new sale or offer to a payout or review, each one a Zap the moment it happens. Sellers connect with their API key and can pick a single shop; events arrive signed and are retried if Zapier misses them.",
    benefit:
      "Sellers log sales to a sheet, get a text for every offer or post reviews to Slack, without us building each one.",
    docs: "https://docs.zapier.com/",
    notes: "/api/zapier",
    notesLabel: "Start a Zap",
  },
  {
    name: "Postman",
    logo: { src: "/sponsors/postman.png", width: 403, height: 120, size: 36 },
    use: "A collection with every request in the seller API, built from the same definitions as the API so it never falls behind. Download it from the app with your key already filled in, or import it by link.",
    benefit:
      "Developers can try every call with their own key before writing any code.",
    docs: "https://learning.postman.com/docs/",
    notes: "/api/postman",
    notesLabel: "Try it in Postman",
  },
];

/** Hidden for now; flip to bring the build list back. */
const showNext = false;

const next: Sponsor[] = [
  {
    name: "Elastic",
    logo: { src: "/sponsors/elastic.png", width: 348, height: 120, size: 34 },
    use: "Marketplace search with filters and room for typos.",
    benefit:
      "So buyers find the thing they want even when they spell it wrong.",
    docs: "https://www.elastic.co/docs",
  },
  {
    name: "APIMatic",
    logo: { src: "/sponsors/apimatic.png", width: 574, height: 82, size: 22 },
    use: "SDKs in several languages and a developer portal, made from the same OpenAPI file.",
    benefit:
      "So other apps and agents plug in with a few lines instead of raw HTTP.",
    docs: "https://docs.apimatic.io/",
  },
  {
    name: "AG Grid",
    logo: { src: "/sponsors/ag-grid.png", width: 579, height: 104, size: 26 },
    use: "Big sortable, filterable tables for listings, offers and sales.",
    benefit:
      "So sellers with hundreds of items can sort and edit them in one place.",
    docs: "https://www.ag-grid.com/react-data-grid/getting-started/",
  },
  {
    name: "Bryntum",
    logo: { src: "/sponsors/bryntum.png", width: 582, height: 111, size: 26 },
    use: "A calendar of ship-by dates, pickups and offer deadlines.",
    benefit: "So sellers see what's due this week at a glance.",
    docs: "https://bryntum.com/docs/",
  },
  {
    name: "Astropods",
    logo: { src: "/sponsors/astropods.png", width: 600, height: 92, size: 24 },
    use: "A home for the seller agents, with a trace of every run and limits on what each can reach and spend.",
    benefit: "So sellers can see what their agent did and trust it with more.",
    docs: "https://docs.astropods.com/welcome",
  },
];

function SponsorLogo({ name, logo }: { name: string; logo: Logo }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small static marks, sized by height
    <img
      src={logo.src}
      alt={name}
      width={logo.width}
      height={logo.height}
      loading="lazy"
      className="block w-auto max-w-full"
      style={{ height: logo.size }}
    />
  );
}

/** Opens in a new tab, with an arrow to say so. */
function OutLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 rounded-sm font-bold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current",
        className,
      )}
    >
      {children}
      <ArrowUpRightIcon size={16} aria-hidden />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function NotesLink({
  path,
  label = "How we built it",
  className,
}: {
  path: string;
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={docsUrl(path)}
      className={cn(
        "rounded-sm font-bold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current",
        className,
      )}
    >
      {label}
    </a>
  );
}

function GroupHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="pt-6 font-display text-2xl font-extrabold tracking-tight md:text-[28px]">
      {children}
    </h3>
  );
}

export function Sponsors() {
  return (
    <Container
      id="sponsors"
      className="flex scroll-mt-6 flex-col gap-6 py-24 md:py-32"
    >
      <SectionIntro
        className="pb-6"
        title="Made in a hackathon, built on good company"
        aside="Resell.store was built for the PayPal AI Hackathon, on tools its sponsors put on the table. Here is what each one does for it."
      />

      <div className="flex flex-col gap-8 rounded-[32px] bg-secondary px-6 py-10 text-white md:rounded-[40px] md:px-14 md:py-12 lg:flex-row lg:gap-16">
        <div className="flex flex-col gap-4 lg:w-[300px] lg:shrink-0">
          <p className="text-base font-semibold text-lemon-300">Lead sponsor</p>
          <h3>
            <PayPalLogo className="h-11 w-auto md:h-12" />
          </h3>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <p className="text-lg font-medium md:text-xl md:leading-8">
            {paypal.use}
          </p>
          <p className="flex items-start gap-3 text-base font-semibold md:text-lg">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-lemon-300 text-leaf-900">
              <CheckIcon size={14} strokeWidth={3.4} />
            </span>
            {paypal.benefit}
          </p>
          <ul className="flex flex-wrap gap-2">
            {paypal.uses.map((use, i) => (
              <li key={use}>
                <div className="flex h-8 items-center rounded-full bg-leaf-900 px-3.5 text-sm font-semibold">
                  {use}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1 text-base text-lemon-300">
            <OutLink href={paypal.docs}>PayPal docs</OutLink>
            <NotesLink path={paypal.notes} />
          </div>
        </div>
      </div>

      <GroupHeading>Working in the app today</GroupHeading>
      <ul className="grid gap-3 md:grid-cols-6 md:gap-4">
        {live.map((s, i) => (
          // Three across, then the rest share the last row.
          <li
            key={s.name}
            className={i < 3 ? "md:col-span-2" : "md:col-span-3"}
          >
            <div className="flex h-full flex-col gap-5 rounded-[24px] border border-border bg-surface px-6 py-7 md:px-7 md:py-8">
              <h4 className="flex h-9 items-center">
                <SponsorLogo name={s.name} logo={s.logo} />
              </h4>
              <p className="text-base">{s.use}</p>
              <p className="flex flex-1 items-start gap-3 text-base font-semibold">
                <CheckDot size={24} />
                {s.benefit}
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-5 text-sm text-secondary">
                <OutLink href={s.docs}>{s.name} docs</OutLink>
                {s.notes && <NotesLink path={s.notes} label={s.notesLabel} />}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {showNext && (
        <>
          <GroupHeading>Next on the build list</GroupHeading>
          <div className="rounded-[24px] border border-border bg-surface px-6 md:px-8">
            <ul className="divide-y divide-border">
              {next.map((s) => (
                <li
                  key={s.name}
                  className="flex flex-col gap-3 py-6 md:grid md:grid-cols-[200px_minmax(0,1fr)_150px] md:items-center md:gap-8"
                >
                  <h4 className="flex h-9 items-center">
                    <SponsorLogo name={s.name} logo={s.logo} />
                  </h4>
                  <div className="flex flex-col gap-1">
                    <p className="text-base font-semibold">{s.use}</p>
                    <p className="text-base text-text-muted">{s.benefit}</p>
                  </div>
                  <OutLink
                    href={s.docs}
                    className="self-start text-sm text-secondary md:self-center md:justify-self-end"
                  >
                    {s.name} docs
                  </OutLink>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </Container>
  );
}