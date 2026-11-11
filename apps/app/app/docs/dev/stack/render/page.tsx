import type { Metadata } from "next";
import { CodeBlock } from "../../../../../components/docs/code";
import { A, C, Callout, DocPage, H2, P, Table, UL } from "../../../../../components/docs/page";
import { docsBase } from "../../../../../lib/docs/base";

export const metadata: Metadata = { title: "Render · Developers" };

const fanOut = `// apps/app/workflows/main.ts
const moneyRetry = { maxRetries: 6, waitDurationMs: 60_000, backoffScaling: 2 };

export const releaseOrderTask = task(
  { name: "releaseOrder", retry: moneyRetry, timeoutSeconds: 120 },
  async function releaseOrder(_ctx: TaskContext, orderId: string) {
    return { orderId, released: await releaseDue(orderId) };   // throws if PayPal won't release yet
  },
);

export const orderSweep = task({ name: "orderSweep", retry: sweepRetry, timeoutSeconds: 1800 },
  async function orderSweep(ctx: TaskContext) {
    // ship reminders, arrival checks, escalations…
    const [cancel, release] = await Promise.all([dueCancellations(), dueReleases()]);
    await Promise.allSettled([
      ...cancel.map((id) => ctx.run(cancelOrderTask, id)),
      ...release.map((id) => ctx.run(releaseOrderTask, id)),
    ]);
  });`;

export default async function RenderPage() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/dev/stack/render"
      eyebrow="Built with"
      title="Render"
      lead="Render runs all of resell.store: the Next.js app on every subdomain, Postgres with pgvector, and the Workflows that release sellers' money and refund buyers on time, retrying until it works."
      toc={[
        { id: "what", title: "What runs there" },
        { id: "web", title: "Web service" },
        { id: "postgres", title: "Postgres" },
        { id: "workflows", title: "Workflows" },
        { id: "why", title: "Why durable tasks for money" },
        { id: "cron", title: "Cron starts them" },
        { id: "local", title: "Running it locally" },
        { id: "unlocks", title: "What it unlocks" },
      ]}
    >
      <H2 id="what" className="mt-0">
        What runs there
      </H2>
      <P>
        Everything is in one Blueprint, <C>render.yaml</C> at the repo root.
      </P>
      <Table
        head={["Name", "Type", "Does"]}
        rows={[
          [<C key="a">resell-store</C>, "Web service (Node 24, starter)", "The Next.js app: marketplace, stores, seller app, API, MCP and docs"],
          [<C key="b">resell-db</C>, "Postgres 17 (basic-256mb)", "All data, with pgvector for listing embeddings"],
          [<C key="c">resell-sweeps</C>, "Workflow", "The timed side of offers and orders, including moving money"],
          [<C key="d">resell-sweeps-cron</C>, "Cron Job, every 15 minutes", "Starts the sweep tasks"],
        ]}
      />
      <P>
        Steps to deploy it are on <A href={`${base}/dev/deploy`}>Deploy to Render</A>, and what each sweep does on{" "}
        <A href={`${base}/dev/jobs`}>Background jobs</A>.
      </P>

      <H2 id="web">Web service</H2>
      <UL>
        <li>
          Build: <C>corepack enable &amp;&amp; pnpm install --frozen-lockfile &amp;&amp; pnpm --filter app build</C>. Start:{" "}
          <C>pnpm --filter app start</C>. Health check <C>/</C>.
        </li>
        <li>
          <C>preDeployCommand: pnpm db:migrate</C> runs the Drizzle migrations before each new version takes traffic, so the code and
          the schema always match.
        </li>
        <li>
          Two custom domains: <C>resell.store</C> and <C>*.resell.store</C>. The wildcard is what lets every shop have its own
          address (<C>maya.broresell.com</C>), and it also covers <C>api.</C>, <C>docs.</C> and <C>mcp.</C>, which <C>proxy.ts</C>{" "}
          rewrites to <C>/api/v1</C>, <C>/docs</C> and <C>/api/mcp</C>. One service serves them all, and the sign-in cookie is shared
          on <C>.resell.store</C>.
        </li>
      </UL>

      <H2 id="postgres">Postgres</H2>
      <P>
        Render&apos;s managed Postgres 17 has pgvector available. The first migration (<C>0000_enable-pgvector</C>) switches it on;
        listings get a <C>vector(1024)</C> column with an HNSW cosine index, which search uses next to Postgres full text. The web
        service and the workflow both get <C>DATABASE_URL</C> from the database in the Blueprint.
      </P>

      <H2 id="workflows">Workflows</H2>
      <P>
        <C>apps/app/workflows/main.ts</C> defines tasks with <C>@renderinc/sdk/workflows</C>. They call the same functions as the app
        (<C>lib/server/sweeps.ts</C>), so there&apos;s one copy of every rule. The service starts with <C>pnpm --filter app workflows</C>{" "}
        (<C>tsx</C>, with a stub for Next&apos;s <C>server-only</C>).
      </P>
      <Table
        head={["Task", "Does", "Retries", "Timeout"]}
        rows={[
          [<C key="a">offerSweep</C>, "Expires lapsed offers; reminds whoever's turn it is 12 hours before", "2, from 30 s, doubling", "10 min"],
          [<C key="b">orderSweep</C>, "Ship reminders, arrival checks, escalating quiet problems; fans out cancellations and releases", "2, from 30 s, doubling", "30 min"],
          [<C key="c">digestSweep</C>, "Follower digests, the seller's evening agent summary, review requests", "2, from 30 s, doubling", "30 min"],
          [<C key="d">webhookSweep</C>, "Retries failed webhook deliveries; clears old API activity", "2, from 30 s, doubling", "15 min"],
          [<C key="e">releaseOrder</C>, "Completes one order 13 days after shipping (or confirmed) and pays the seller", "6, from 1 min, doubling", "2 min"],
          [<C key="f">cancelUnshipped</C>, "Cancels one order that never shipped and refunds the buyer", "6, from 1 min, doubling", "2 min"],
        ]}
      />
      <CodeBlock title="Fan-out, one task per order" code={fanOut} />

      <H2 id="why">Why durable tasks for money</H2>
      <UL>
        <li>
          <strong>One order can&apos;t hold up the rest.</strong> Each release and each cancellation is its own task run. If PayPal
          refuses one, that order alone retries, while the others are already paid.
        </li>
        <li>
          <strong>Failures retry on their own.</strong> <C>releaseDue</C> throws when PayPal won&apos;t release yet, so Render tries
          again with backoff, up to six more times over about an hour, without anyone watching. Anything still unpaid is picked up by
          the next sweep.
        </li>
        <li>
          <strong>Retrying is safe.</strong> Every money call carries a <C>PayPal-Request-Id</C>, and every step checks the
          order&apos;s status first, so a retry or a doubled run never pays or refunds twice.
        </li>
        <li>
          <strong>Promises are kept on time.</strong> Buyers are told they&apos;ll be refunded if it doesn&apos;t ship in 7 days, and
          sellers that they&apos;re paid 13 days after shipping if the buyer doesn&apos;t confirm sooner. Those are timers that have
          to fire, and must happen before
          PayPal&apos;s 28-day hold runs out.
        </li>
        <li>
          <strong>It&apos;s visible.</strong> Each run, its retries and its result show in the Render dashboard.
        </li>
      </UL>

      <H2 id="cron">Cron starts them</H2>
      <P>
        Workflows don&apos;t schedule themselves yet, so <C>resell-sweeps-cron</C> runs <C>pnpm --filter app sweeps:start</C> every
        15 minutes. <C>scripts/start-sweeps.ts</C> calls <C>render.workflows.startTask(&quot;resell-sweeps/offerSweep&quot;, …)</C>{" "}
        for the four sweeps, with an idempotency key per quarter hour so a doubled cron run doesn&apos;t start a second sweep. It
        needs <C>RENDER_API_KEY</C> and <C>RENDER_WORKFLOW_SLUG</C> (filled in from the workflow by the Blueprint).
      </P>

      <H2 id="local">Running it locally</H2>
      <CodeBlock
        title="Terminal"
        code={`# the real thing, with the Render CLI, from apps/app\nrender workflows dev -- pnpm workflows\n\n# or one pass of every sweep, in-process\ncurl -X POST localhost:5689/api/cron/sweep`}
      />
      <Callout tone="note">
        <C>POST /api/cron/sweep</C> runs <C>runSweeps()</C> in the web process. Outside development it needs{" "}
        <C>Authorization: Bearer $CRON_SECRET</C>. It&apos;s also the fallback for a host without Workflows.
      </Callout>

      <H2 id="unlocks">What it unlocks</H2>
      <UL>
        <li>Every shop on its own subdomain, all from one web service.</li>
        <li>Search by meaning, with vectors in the same database as everything else.</li>
        <li>Sellers paid on time and buyers refunded on time, with retries, without a person or a queue to look after.</li>
        <li>Offers that expire to the second, reminders that go once, and webhooks that get a second chance.</li>
      </UL>
    </DocPage>
  );
}
