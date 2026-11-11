import type { Metadata } from "next";
import { CodeBlock } from "../../../../components/docs/code";
import { A, C, Callout, DocPage, H2, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";

export const metadata: Metadata = { title: "Project structure · Developers" };

export default async function Structure() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/dev/structure"
      eyebrow="Developers"
      title="Project structure"
      lead="A Turborepo with pnpm: one Next.js app and five packages. Here's where things live and the habits the code follows."
      toc={[
        { id: "monorepo", title: "The monorepo" },
        { id: "routes", title: "The app's routes" },
        { id: "actions", title: "Server actions" },
        { id: "server", title: "Server modules" },
        { id: "components", title: "Components" },
        { id: "live", title: "Live components" },
        { id: "conventions", title: "Conventions" },
      ]}
    >
      <H2 id="monorepo" className="mt-0">
        The monorepo
      </H2>
      <CodeBlock
        title="Layout"
        tone="paper"
        code={`apps/app                    the Next.js app: marketplace, stores, seller app, API, docs, MCP
packages/db                 Drizzle schema, migrations (drizzle/), client, migrate helpers
packages/email              React Email templates (emails/) and render helpers
packages/mcp                the MCP servers: tools, API client, stdio CLI
packages/ui                 the design system: tokens (styles.css), components, icons
packages/eslint-config      shared ESLint configs
packages/typescript-config  shared tsconfig files
render.yaml                 the Render Blueprint
docker-compose.yml          local Postgres 17 + pgvector on port 5433`}
      />
      <P>
        Packages are imported by name: <C>@repo/db</C>, <C>@repo/email</C>, <C>@repo/mcp</C>, and design system pieces as{" "}
        <C>@repo/ui/button</C>, <C>@repo/ui/icons</C> and so on. They export their TypeScript source, so there&apos;s no build step
        between changing a package and seeing it in the app. Only <C>@repo/mcp</C> has a build, for its stand-alone <C>dist/stdio.js</C>.
      </P>

      <H2 id="routes">The app&apos;s routes</H2>
      <P>
        Inside <C>apps/app/app</C>, route groups (the folders in brackets) share a layout without adding to the URL.
      </P>
      <Table
        head={["Folder", "What it is"]}
        rows={[
          [<C key="a">(marketing)</C>, "The landing page at /"],
          [<C key="b">(flow)</C>, "Sign-up and onboarding (/welcome, /welcome/start), no app shell"],
          [<C key="c">(app)</C>, "The seller app inside the shell: home, inbox, listings, offers, sales, shops, stats, tools, me. The layout calls requireUser()"],
          [<C key="d">(workspace)</C>, "The listing workspace, /list/[id]/research → details → photos → words → publish, with the agent chat beside it"],
          [<C key="e">(market)</C>, "The public marketplace on the root domain: discover, stores, agent, account, messages"],
          [<C key="f">(checkout)</C>, "/checkout/[listing] and /offer/[listing]"],
          [<C key="g">store/[store]</C>, "One seller's store. proxy.ts rewrites maya.broresell.com/x onto /store/maya/x"],
          [<C key="h">docs</C>, "This site (docs.resell.store, or /docs)"],
          [<C key="j">design-system</C>, "Every foundation and component from @repo/ui on one page"],
          [<C key="l">api/v1</C>, "The public API; the routes themselves are in lib/server/api"],
          [<C key="m">api/mcp</C>, "The hosted MCP servers"],
          [<C key="n">api/auth</C>, "Better Auth's handler"],
          [<C key="o">api/paypal</C>, "Checkout and onboarding returns, and the webhook"],
          [<C key="p">api/*</C>, "Also: cron/sweep, files/[id], listings/[id]/research and chat, session handoff, track (views), dev/magic-link"],
        ]}
      />

      <H2 id="actions">Server actions</H2>
      <P>
        <C>app/actions/*.ts</C> are the <C>&quot;use server&quot;</C> entry points the screens call: <C>listings</C>,{" "}
        <C>listing-media</C>, <C>listing-words</C>, <C>listing-publish</C>, <C>commerce</C> (buying, offers, shipping),{" "}
        <C>after-sale</C> (cancellations, problems, refunds), <C>paypal</C>, <C>messages</C>, <C>shops</C>, <C>profile</C>,{" "}
        <C>account</C>, <C>follows</C>, <C>likes</C>, <C>reviews</C>, <C>sidekick</C>, <C>developer</C> (keys, agent links,
        webhooks) and <C>market</C>. They check who&apos;s signed in, validate input with zod, call <C>lib/server</C>, and return{" "}
        <C>{"{ ok: false, error }"}</C> for anything a person can fix instead of throwing.
      </P>

      <H2 id="server">Server modules</H2>
      <P>
        <C>apps/app/lib/server</C> is where the work happens. Actions, API routes, pages and the workflow all call the same
        functions, so there is one place to change a rule.
      </P>
      <Table
        head={["Area", "Files"]}
        rows={[
          ["Auth and people", <><C key="a">auth.ts</C>, <C>session.ts</C>, <C>dev-links.ts</C>, <C>viewer.ts</C>, <C>account-visit.ts</C></>],
          ["Shops and listings", <><C key="b">shops.ts</C>, <C>listings.ts</C>, <C>listing-chat.ts</C>, <C>words.ts</C>, <C>files.ts</C></>],
          ["Research and agents", <><C key="c">ai.ts</C>, <C>research.ts</C>, <C>channel3.ts</C>, <C>comps.ts</C>, <C>kernel.ts</C>, <C>sidekick.ts</C>, <C>store-agent.ts</C>, <C>negotiator.ts</C></>],
          ["Marketplace", <><C key="d">market.ts</C> (browse and search), <C>embeddings.ts</C>, <C>follows.ts</C>, <C>likes.ts</C>, <C>activity.ts</C>, <C>stats.ts</C></>],
          ["Money", <><C key="e">commerce.ts</C>, <C>payout-policy.ts</C>, <C>paypal.ts</C>, <C>paypal-sellers.ts</C>, <C>paypal-webhook.ts</C>, <C>disputes.ts</C>, <C>reviews.ts</C></>],
          ["Messages and email", <><C key="f">messages.ts</C>, <C>notify.ts</C>, <C>notify-after-sale.ts</C>, <C>digests.ts</C>, <C>email.ts</C></>],
          ["Timing", <><C key="g">sweeps.ts</C> (the timed jobs), <C>later.ts</C> (run after the response)</>],
          ["Share images", <><C key="h">share.ts</C>, <C>og-images.tsx</C>, <C>og-render.tsx</C>, <C>og-photos.ts</C>, <C>og-fonts.ts</C></>],
          ["Public API", <><C key="i">api/</C>: <C>router.ts</C>, <C>routes/*</C>, <C>keys.ts</C>, <C>http.ts</C>, <C>serialize.ts</C>, <C>webhooks.ts</C>, <C>log.ts</C></>],
        ]}
      />
      <P>
        <C>market-logins.ts</C> (signed-in marketplace accounts through Kernel) exists with its table, but nothing calls it yet.
        Outside <C>lib/server</C>: <C>lib/urls.ts</C> builds every cross-zone URL, <C>lib/money.ts</C> converts dollars and cents,{" "}
        <C>lib/docs</C> holds this site&apos;s nav, and <C>lib/mock*.ts</C> the types and sample data from the original prototype.
      </P>

      <H2 id="components">Components</H2>
      <P>
        <C>apps/app/components</C> is grouped by screen or zone: <C>market/</C> (header, store, listing, discover, checkout, buyer
        account, agent), <C>listing/</C> and <C>workspace/</C> (the listing flow), <C>shell/</C> (the app shell), <C>home/</C>,{" "}
        <C>inbox/</C>, <C>offers/</C>, <C>shops/</C>, <C>tools/</C>, <C>after-sale/</C>, <C>reviews/</C>, <C>me/</C>,{" "}
        <C>welcome/</C>, <C>landing/</C>, <C>empty/</C> and <C>loading/</C>, plus <C>docs/</C> for this site. Generic, reusable
        pieces belong in <C>@repo/ui</C> instead.
      </P>

      <H2 id="live">Live components</H2>
      <P>
        Many screens were first built as a front-end prototype. Pages pass real data and server actions as props to those
        components. Where the live version needed a different shape, it has its own folder next to the original:{" "}
        <C>listing-live</C> beside <C>listing-later</C>, <C>inbox-live</C> beside <C>inbox</C>, <C>tools-live</C> beside{" "}
        <C>tools</C>, and <C>seller-live</C> for sales and offers.
      </P>

      <H2 id="conventions">Conventions</H2>
      <UL>
        <li>
          Every <C>lib/server</C> file starts with <C>import &quot;server-only&quot;</C>, so it can&apos;t end up in a browser bundle.
        </li>
        <li>
          Pages check auth themselves. <C>requireUser()</C> sends signed-out people to <C>/welcome</C> and people who haven&apos;t
          onboarded to <C>/welcome/start</C>; <C>getCurrentUser()</C> returns null instead. The proxy never checks auth.
        </li>
        <li>
          Money is whole cents in the database (<C>price_cents</C>, <C>total_cents</C>…) and on the server. Screens show and type
          dollars (<C>toCents</C>, <C>formatCents</C> in <C>lib/money.ts</C>), and the public API takes and returns dollars, never
          cents.
        </li>
        <li>
          Import Drizzle helpers (<C>eq</C>, <C>and</C>, <C>sql</C>…) from <C>@repo/db</C>, not <C>drizzle-orm</C>.
        </li>
        <li>
          Links between zones use <C>SiteLink</C> / <C>StoreLink</C> or <C>siteUrl()</C> / <C>storeUrl()</C>, never a hard-coded
          host. See <A href={`${base}/dev/routing`}>Domains and routing</A>.
        </li>
        <li>
          Slow or optional work (agents, emails) runs after the response with <C>after()</C> or <C>runAfterResponse()</C>, and never
          fails the action that started it.
        </li>
        <li>Tests sit next to the file they test, as <C>*.test.ts</C>.</li>
        <li>
          Comments explain why, in plain words, and screen codes from the design file (C2, P4, B3) mark which screen a piece
          belongs to.
        </li>
      </UL>
      <Callout tone="note">
        Every outside service is optional and checked with a flag like <C>aiConfigured</C>, <C>channel3Configured</C> or{" "}
        <C>paypalEnabled()</C>. New code that calls a service should do the same and give the screen something sensible without it.
      </Callout>
    </DocPage>
  );
}
