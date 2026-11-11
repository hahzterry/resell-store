import type { Metadata } from "next";
import { CodeBlock } from "../../../../components/docs/code";
import { A, C, Callout, DocPage, H2, OL, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";

export const metadata: Metadata = { title: "Domains and routing · Developers" };

export default async function Routing() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/dev/routing"
      eyebrow="Developers"
      title="Domains and routing"
      lead="One app answers on resell.store and every subdomain of it. proxy.ts reads the host and decides which part of the app a request belongs to."
      toc={[
        { id: "hosts", title: "Hosts" },
        { id: "proxy", title: "What proxy.ts does" },
        { id: "reserved", title: "Reserved names" },
        { id: "links", title: "Linking between zones" },
        { id: "auth", title: "Sign-in across subdomains" },
        { id: "localhost", title: "On localhost" },
      ]}
    >
      <H2 id="hosts" className="mt-0">
        Hosts
      </H2>
      <Table
        head={["Host", "Served from", "What it is"]}
        rows={[
          [<C key="a">resell.store</C>, "app/* as is", "Marketplace, seller app, checkout, /docs and /api/*"],
          [<C key="b">{"{store}"}.resell.store</C>, <C key="b2">/store/{"{store}"}/*</C>, "One seller's store and its listings"],
          [<C key="c">api.resell.store</C>, <C key="c2">/api/v1/*</C>, "The public API. A leading /v1 is dropped first, so /v1/listings → /api/v1/listings"],
          [<C key="d">docs.resell.store</C>, <C key="d2">/docs/*</C>, "These docs (/_next assets pass through untouched)"],
          [<C key="e">mcp.resell.store</C>, <C key="e2">/api/mcp/*</C>, "The hosted MCP servers"],
        ]}
      />
      <P>
        All of this is one Render web service with two custom domains, <C>resell.store</C> and <C>*.resell.store</C>. The
        wildcard covers stores and the three service hosts alike. The root domain comes from <C>NEXT_PUBLIC_ROOT_DOMAIN</C>, so a
        copy on another domain works the same way.
      </P>

      <H2 id="proxy">What proxy.ts does</H2>
      <P>
        <C>apps/app/proxy.ts</C> is Next.js 16&apos;s middleware. It runs on every request except Next internals and static files,
        in this order:
      </P>
      <OL>
        <li>
          <strong>Service hosts.</strong> On <C>api.</C>, <C>docs.</C> or <C>mcp.</C> it rewrites the path (above) and stops.
        </li>
        <li>
          <strong>Pass-through.</strong> Anything under <C>/api/</C> is left alone, on every host. That&apos;s why
          the session routes and API calls work on store subdomains too.
        </li>
        <li>
          <strong>Marketplace host.</strong> <C>/store/maya/dutch-oven</C> redirects to <C>maya.broresell.com/dutch-oven</C>, so
          store links can stay relative. Share images (<C>opengraph-image</C>, <C>twitter-image</C>) are served in place, because
          that&apos;s where <C>og:image</C> points.
        </li>
        <li>
          <strong>Store host, dev only.</strong> On a full page load with no session cookie and no recent attempt, it starts the
          session handoff (below).
        </li>
        <li>
          <strong>Store host.</strong> Everything else is rewritten to <C>/store/{"{store}"}{"{path}"}</C>. The browser never sees <C>/store/</C>.
        </li>
      </OL>
      <P>
        The proxy never checks who&apos;s signed in. Layouts and pages do that with <C>requireUser()</C> or{" "}
        <C>getCurrentUser()</C>. Tests for all of the above are in <C>proxy.test.ts</C> and <C>lib/urls.test.ts</C>.
      </P>

      <H2 id="reserved">Reserved names</H2>
      <P>
        <C>www</C>, <C>app</C>, <C>api</C>, <C>docs</C> and <C>mcp</C> are never stores (<C>reserved</C> in{" "}
        <C>lib/urls.ts</C>). <C>www.</C> and <C>app.</C> fall through to the marketplace. Hosts with more than one label before the
        root, like <C>a.b.resell.store</C>, aren&apos;t stores either.
      </P>

      <H2 id="links">Linking between zones</H2>
      <P>
        A store page and a marketplace page are on different origins, so a client-side <C>next/link</C> between them can&apos;t work.
        Two helpers handle it:
      </P>
      <Table
        head={["Helper", "Use it for"]}
        rows={[
          [<C key="a">{"<SiteLink href=\"/discover\">"}</C>, "A marketplace path. A next/link on the marketplace, an absolute <a> inside a store"],
          [<C key="b">{"<StoreLink store=\"maya\" href=\"/dutch-oven\">"}</C>, "A path in a store. A next/link inside that store, an absolute <a> everywhere else"],
        ]}
      />
      <P>
        Both live in <C>components/market/links.tsx</C> and know where they are from <C>StoreZone</C>, which{" "}
        <C>app/store/[store]/layout.tsx</C> wraps around every store page. On the server, or for emails and redirects, build URLs
        with <C>lib/urls.ts</C>:
      </P>
      <Table
        head={["Function", "Production", "Localhost"]}
        rows={[
          [<C key="a">siteUrl(&quot;/discover&quot;)</C>, "https://resell.store/discover", "http://localhost:5689/discover"],
          [<C key="b">storeUrl(&quot;maya&quot;, &quot;/x&quot;)</C>, "https://maya.broresell.com/x", "http://maya.localhost:5689/x"],
          [<C key="c">apiUrl(&quot;/me&quot;)</C>, "https://api.resell.store/v1/me", "http://localhost:5689/api/v1/me"],
          [<C key="d">docsUrl(&quot;/dev&quot;)</C>, "https://docs.resell.store/dev", "http://localhost:5689/docs/dev"],
          [<C key="e">mcpUrl(&quot;/buy&quot;)</C>, "https://mcp.resell.store/buy", "http://localhost:5689/api/mcp/buy"],
          [<C key="f">storeDomain(&quot;maya&quot;)</C>, "maya.broresell.com", "maya.broresell.com (display only)"],
        ]}
      />
      <P>
        <C>storeFromHost()</C> and <C>serviceFromHost()</C> read a Host header; <C>zoneUrl()</C> checks that a URL points at the
        marketplace or one of its stores, which is how redirects after sign-in stay on resell.store.
      </P>

      <H2 id="auth">Sign-in across subdomains</H2>
      <P>
        In production, Better Auth sets the session cookie on <C>.resell.store</C> (<C>crossSubDomainCookies</C> in{" "}
        <C>lib/server/auth.ts</C>), so every store reads the same session. The root and <C>*.resell.store</C> are trusted origins.
      </P>
      <P>
        On localhost that can&apos;t work: browsers won&apos;t send a <C>Domain=localhost</C> cookie to <C>maya.localhost</C>. So in
        dev each store gets its own copy of the session through a one-time token:
      </P>
      <OL>
        <li>
          The first page load on <C>maya.localhost:5689</C> with no session goes to that store&apos;s{" "}
          <C>/api/session/handoff?to=…</C>, and the proxy sets <C>rs_handoff</C> for 10 minutes so it won&apos;t ask again.
        </li>
        <li>The store&apos;s handoff route forwards to the marketplace&apos;s, where the session cookie is.</li>
        <li>
          Signed in there: it mints a Better Auth one-time token (single use, one minute) and redirects to{" "}
          <C>maya.localhost:5689/api/session/accept?token=…&amp;next=…</C>. Signed out: straight back.
        </li>
        <li>
          <C>accept</C> verifies the token, sets the store&apos;s own cookie for the same session row, and redirects to{" "}
          <C>next</C>. Any failure just arrives signed out.
        </li>
      </OL>
      <P>
        Because both cookies point at the same session row, signing out anywhere ends both (once the 5-minute cookie cache on the
        other host runs out).
      </P>

      <H2 id="localhost">On localhost</H2>
      <UL>
        <li>
          The root is <C>localhost:5689</C> and URLs use <C>http</C>. Any other root gets <C>https</C>.
        </li>
        <li>
          Stores are <C>{"{slug}"}.localhost:5689</C>. Chrome, Firefox and Safari resolve <C>*.localhost</C> to your machine with
          no setup; some command-line tools don&apos;t, which is why <C>apiUrl</C>, <C>docsUrl</C> and <C>mcpUrl</C> use paths on
          the root locally.
        </li>
        <li>The session handoff above only runs when the root is <C>localhost</C>.</li>
      </UL>
      <CodeBlock title="Terminal" code={`curl http://localhost:5689/api/v1/market/stores/claspandcarry\n\n# the same, the way api.resell.store is routed\ncurl -H "Host: api.localhost:5689" http://localhost:5689/v1/market/stores/claspandcarry`} />
      <Callout tone="warn">
        Keep <C>NEXT_PUBLIC_ROOT_DOMAIN</C> as <C>localhost:5689</C> locally. A dotted dev root (like <C>lvh.me</C>) would share the
        cookie like production, but <C>lib/urls.ts</C> would then build <C>https</C> links that the dev server doesn&apos;t answer.
      </Callout>
      <P>
        More on the API and MCP hosts is on <A href={`${base}/dev/api`}>API, docs and MCP</A>.
      </P>
    </DocPage>
  );
}
