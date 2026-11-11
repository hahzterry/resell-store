import type { Metadata } from "next";
import { ArrowUpRightIcon, CodeIcon, LinkIcon, ListIcon, PlugIcon, SettingsIcon, ShieldCheckIcon, SparkleIcon, StatsIcon, TagIcon, TruckIcon, HomeIcon } from "@repo/ui/icons";
import { A, C, CardGrid, DocPage, H2, LinkCard, P, Table, UL } from "../../../components/docs/page";
import { docsBase } from "../../../lib/docs/base";

export const metadata: Metadata = { title: "Overview · Developers" };

export default async function DevOverview() {
  const base = await docsBase();
  const icon = { size: 18, strokeWidth: 2.2 };
  return (
    <DocPage
      base={base}
      path="/dev"
      eyebrow="Developers"
      title="How resell.store is built"
      lead="What the pieces are, where a request ends up, and where to read next if you want to run it, change it or deploy your own."
      toc={[
        { id: "what", title: "What it is" },
        { id: "parts", title: "The moving parts" },
        { id: "map", title: "Where a request goes" },
        { id: "services", title: "Outside services" },
        { id: "next", title: "Where to go next" },
      ]}
    >
      <H2 id="what" className="mt-0">
        What it is
      </H2>
      <P>
        resell.store is a marketplace where every seller gets their own shop on a subdomain, like <C>maya.broresell.com</C>, and an AI
        agent that researches prices, writes listings, answers buyers and haggles within limits the seller sets. Buyers pay through
        PayPal, the money is held until the item arrives, and then it&apos;s released to the seller.
      </P>
      <P>
        It was built for the <A href="https://paypalaihackathon.devpost.com/">PayPal AI Hackathon</A>, and it&apos;s open source under
        the MIT license. The code is on <A href="https://github.com/impactvelocity/resell-store">GitHub</A>.
      </P>

      <H2 id="parts">The moving parts</H2>
      <P>It&apos;s deliberately small: one app, one database, one job runner.</P>
      <UL>
        <li>
          <strong>One Next.js app</strong> (<C>apps/app</C>) serves everything people and programs reach: the marketplace, every store
          subdomain, the seller app, checkout, the public API, these docs and the hosted MCP servers. <C>proxy.ts</C> looks at the
          host name and sends each request to the right part of the app.
        </li>
        <li>
          <strong>Postgres with pgvector</strong> holds all of it, including uploads when there&apos;s no object storage. The schema and
          migrations live in <C>packages/db</C> (Drizzle).
        </li>
        <li>
          <strong>A Render Workflow</strong> (<C>apps/app/workflows/main.ts</C>) runs the timed jobs: expiring offers, reminders,
          cancelling unshipped orders, releasing held money, digests and webhook retries. A Render Cron Job starts it every 15
          minutes. Without Render, one HTTP call runs the same jobs in-process.
        </li>
        <li>
          <strong>Work that shouldn&apos;t slow a page down</strong> (research, the store agent&apos;s answers, counter-offers, emails)
          runs in the web process after the response is sent.
        </li>
        <li>
          <strong>Packages</strong> beside the app: <C>@repo/db</C>, <C>@repo/ui</C> (the design system), <C>@repo/email</C> (React
          Email templates) and <C>@repo/mcp</C> (the MCP servers, built on the public API).
        </li>
      </UL>

      <H2 id="map">Where a request goes</H2>
      <P>
        One deployment answers on the root domain and a wildcard. The host decides which part of the app handles the request; the
        path does the rest.
      </P>
      <Table
        head={["Request", "Handled by"]}
        rows={[
          [<C key="a">resell.store/discover</C>, <><C>app/(market)</C>: the public marketplace</>],
          [<C key="b">resell.store/home</C>, <><C>app/(app)</C>: the seller app, behind sign-in</>],
          [<C key="c">resell.store/list/[id]/research</C>, <><C>app/(workspace)</C>: the listing workspace</>],
          [<C key="d">resell.store/checkout/[listing]</C>, <><C>app/(checkout)</C>: buying and offers</>],
          [<C key="e">maya.broresell.com/dutch-oven</C>, <><C>app/store/[store]/[listing]</C>, rewritten from the subdomain</>],
          [<C key="f">api.resell.store/v1/listings</C>, <><C>app/api/v1/[[...path]]</C> → <C>lib/server/api</C></>],
          [<C key="g">docs.resell.store/dev</C>, <><C>app/docs/dev</C> (also at <C>resell.store/docs/dev</C>)</>],
          [<C key="h">mcp.resell.store/u/[token]</C>, <><C>app/api/mcp/[[...path]]</C> → <C>@repo/mcp</C></>],
          [<C key="i">resell.store/api/paypal/webhook</C>, <>PayPal&apos;s webhook, <C>lib/server/paypal-webhook.ts</C></>],
        ]}
      />

      <H2 id="services">Outside services</H2>
      <P>
        Only Postgres and an auth secret are required. Every other service switches a feature on, and the app has a fallback
        without it, so you can run the whole thing locally with no keys at all.
      </P>
      <Table
        head={["Service", "What it does here"]}
        rows={[
          ["AI model (Anthropic by default, via the AI SDK)", "Identifies items, prices them, writes listings, runs the listing chat, the store agent and the negotiator's wording"],
          ["Channel3", "Product catalog: what an item is, what it costs new, second-hand offers"],
          ["Kernel", "Headless browsers that read public listings on popular marketplaces for comps and the Shopping sidekick"],
          ["Jina", "Embeddings for semantic search, stored in pgvector"],
          ["PayPal (sandbox)", "Checkout, the platform fee, held money, payouts, refunds and disputes"],
          ["Resend", "Email: sign-in links and notifications"],
          ["Cloudflare R2", "Photo and video uploads"],
          ["Render", "Hosting: the web service, Postgres, the workflow and the cron job"],
        ]}
      />

      <H2 id="next">Where to go next</H2>
      <CardGrid>
        <LinkCard href={`${base}/dev/local`} title="Run it locally" icon={<HomeIcon {...icon} />}>
          Postgres in Docker, a seeded marketplace and the dev server on port 5689, in about five commands.
        </LinkCard>
        <LinkCard href={`${base}/dev/structure`} title="Project structure" icon={<ListIcon {...icon} />}>
          The monorepo, the app&apos;s route groups, and where server code lives.
        </LinkCard>
        <LinkCard href={`${base}/dev/routing`} title="Domains and routing" icon={<LinkIcon {...icon} />}>
          Store subdomains, the api, docs and mcp hosts, and how sign-in follows you between them.
        </LinkCard>
        <LinkCard href={`${base}/dev/data`} title="Data model" icon={<TagIcon {...icon} />}>
          The 33 tables, their statuses, money in cents, and how to add a migration.
        </LinkCard>
        <LinkCard href={`${base}/dev/agents`} title="Research and agents" icon={<SparkleIcon size={18} />}>
          How items are identified and priced, and what the shop&apos;s agent may do.
        </LinkCard>
        <LinkCard href={`${base}/dev/payments`} title="Payments and payouts" icon={<ShieldCheckIcon {...icon} />}>
          PayPal multiparty checkout, held money, releases and refunds.
        </LinkCard>
        <LinkCard href={`${base}/dev/jobs`} title="Background jobs" icon={<TruckIcon {...icon} />}>
          Every timed job, what it does and when, and how it&apos;s started.
        </LinkCard>
        <LinkCard href={`${base}/dev/api`} title="API, docs and MCP" icon={<CodeIcon {...icon} />}>
          One route list behind the public API, its reference pages and the MCP tools.
        </LinkCard>
        <LinkCard href={`${base}/dev/testing`} title="Testing" icon={<StatsIcon {...icon} />}>
          Vitest against a real test database, with outside services mocked.
        </LinkCard>
        <LinkCard href={`${base}/dev/deploy`} title="Deploy to Render" icon={<ArrowUpRightIcon {...icon} />}>
          The blueprint, domains, keys and webhooks for your own copy.
        </LinkCard>
        <LinkCard href={`${base}/dev/env`} title="Environment variables" icon={<SettingsIcon {...icon} />}>
          Every variable, whether you need it, and what happens without it.
        </LinkCard>
        <LinkCard href={`${base}/dev/stack`} title="The stack" icon={<PlugIcon {...icon} />}>
          Each outside service in detail: what it unlocks and how it&apos;s called.
        </LinkCard>
      </CardGrid>
    </DocPage>
  );
}
