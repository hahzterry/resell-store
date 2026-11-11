import type { Metadata } from "next";
import { A, Callout, DocPage, H2, H3, OL, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";
import { siteUrl } from "../../../../lib/urls";

export const metadata: Metadata = { title: "Open a shop" };

export default async function Shops() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/guides/shops"
      eyebrow="Selling"
      title="Open a shop"
      lead="A shop is where your listings live, with its own name and web address. It takes about a minute, and you can have as many as you like."
      toc={[
        { id: "create", title: "Opening a shop" },
        { id: "link", title: "Picking a link" },
        { id: "visibility", title: "Who can see it" },
        { id: "several", title: "More than one shop" },
        { id: "settings", title: "Shop settings" },
        { id: "agent", title: "What your agent may do" },
        { id: "pause", title: "Pausing or deleting" },
      ]}
    >
      <H2 id="create" className="mt-0">
        Opening a shop
      </H2>
      <P>
        If you chose <strong>I have things to sell</strong> when you signed up, you&apos;re taken straight to{" "}
        <strong>Open your first shop</strong>. Otherwise use <strong>New shop</strong> on{" "}
        <A href={siteUrl("/home")}>Home</A>.
      </P>
      <OL>
        <li>
          Add a picture (up to 10 MB), or pick a colour: Lemon, Mint, Pink, Leaf or Blush.
        </li>
        <li>
          Give it a <strong>Shop name</strong>, up to 60 characters. Your first shop starts as &quot;Your name&apos;s shop&quot;,
          so Maya&apos;s starts as &quot;Maya&apos;s shop&quot;. Change it to whatever you like, like &quot;Maya&apos;s
          closet&quot;.
        </li>
        <li>
          Check the <strong>Shop link</strong>. We fill it in from the name.
        </li>
        <li>
          Choose <strong>Who can see it?</strong>
        </li>
        <li>
          Tap <strong>Open my shop</strong>.
        </li>
      </OL>

      <H2 id="link">Picking a link</H2>
      <P>
        Your link becomes your shop&apos;s address: &quot;maya&quot; gives you maya.broresell.com. We check it as you type and tell
        you if it&apos;s free.
      </P>
      <UL>
        <li>1 to 32 characters: lowercase letters, numbers and dashes.</li>
        <li>No dash at the start or the end.</li>
        <li>
          It has to be one nobody else has. A few words are kept back for resell.store itself, like www, api, docs, help, shop and
          store.
        </li>
      </UL>

      <H2 id="visibility">Who can see it</H2>
      <Table
        head={["Choice", "What it means"]}
        rows={[
          [<strong key="a">Only me</strong>, "Nobody else can open the shop until you change it. Handy while you set things up."],
          [
            <strong key="b">Anyone with the link</strong>,
            "Open to anyone you send the link to, but never listed on the marketplace or in search. This is where new shops start.",
          ],
          [<strong key="c">Everyone</strong>, "Your shop and its listings also show up on the resell.store marketplace."],
        ]}
      />
      <Callout tone="tip">
        Want buyers to find you by searching? Pick <strong>Everyone</strong>. You can still keep a single listing link-only when
        you publish it.
      </Callout>

      <H2 id="several">More than one shop</H2>
      <P>
        You can open as many shops as you like, say one for clothes and one for kitchen things. Each has its own name, link,
        listings and settings. Use <strong>New shop</strong> on Home to add one, and <strong>Switch shop</strong> on a shop&apos;s
        page to hop between them.
      </P>
      <P>
        A shop&apos;s page has tabs for <strong>Live</strong>, <strong>Drafts</strong> and <strong>Sold</strong>, a search box, and
        a few numbers for the week: what you made, live listings, offers waiting and views. Each draft shows how far it got, like
        &quot;Next: photos&quot;.
      </P>

      <H2 id="settings">Shop settings</H2>
      <P>Open a shop, then its settings. Under <strong>The basics</strong> you can change:</P>
      <UL>
        <li>The picture and the shop name.</li>
        <li>
          The <strong>Shop link</strong>. Careful: the old link stops working as soon as you save, so update anywhere you&apos;ve
          shared it.
        </li>
        <li>
          <strong>About this shop</strong>, up to 300 characters, shown on your shop page.
        </li>
        <li>
          <strong>Who can see it</strong>.
        </li>
      </UL>

      <H2 id="agent">What your agent may do</H2>
      <P>
        Each shop has its own agent settings. Whatever it does, you see it in your <A href={siteUrl("/inbox")}>Inbox</A>.
      </P>
      <H3>Answer buyers&apos; questions</H3>
      <P>
        On by default. The agent replies to buyers right away using what&apos;s in your listings, and hands you anything it
        can&apos;t answer. See <A href={`${base}/guides/questions`}>Questions and your shop agent</A>.
      </P>
      <H3>Haggle on offers</H3>
      <P>
        On by default. The agent counters lowball offers, never under your lowest. Good offers wait for your yes. See{" "}
        <A href={`${base}/guides/offers`}>Offers</A>.
      </P>
      <H3>Lowest it can go</H3>
      <P>
        How far under your price the agent may go: 5%, 10%, 15%, 20% or 25% off. It starts at 15%. This applies unless a listing
        says otherwise, so you can set a different lowest on any single listing.
      </P>

      <H2 id="pause">Pausing or deleting</H2>
      <P>
        Going away, or just need a break? Use <strong>Pause shop</strong> in settings. Your shop drops off the marketplace, and
        nothing in it can be bought or offered on. Anyone visiting sees that you&apos;re taking a break. Everything is kept, and{" "}
        <strong>Open shop</strong> brings it back exactly as it was.
      </P>
      <Callout tone="warn" title="Deleting can't be undone">
        <strong>Delete shop</strong> takes all its listings down and the link stops working for good. If you might come back,
        pause it instead.
      </Callout>
    </DocPage>
  );
}
