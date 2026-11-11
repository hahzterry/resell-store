import type { Metadata } from "next";
import { BagIcon, ChatIcon, SparkleIcon, TagIcon } from "@repo/ui/icons";
import { A, Callout, CardGrid, DocPage, H2, LinkCard, OL, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";
import { siteUrl } from "../../../../lib/urls";

export const metadata: Metadata = { title: "Getting started" };

export default async function GettingStarted() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/guides/getting-started"
      eyebrow="Start here"
      title="Getting started"
      lead="resell.store is a place to sell the things you no longer use, and to buy other people's. Here's how to get in and find your way around."
      toc={[
        { id: "what", title: "What resell.store is" },
        { id: "sign-in", title: "Signing in" },
        { id: "choose", title: "Selling or buying" },
        { id: "around", title: "Finding your way around" },
        { id: "address", title: "Your store's own address" },
        { id: "next", title: "Where to next" },
      ]}
    >
      <H2 id="what" className="mt-0">
        What resell.store is
      </H2>
      <P>
        You open a shop, snap a photo of something, and an agent helps you with the rest: it works out what the thing is, looks up
        what similar ones go for, writes the listing, and answers buyers while you get on with your day. You still make every
        decision that matters, like which offers to accept.
      </P>
      <P>
        Buyers pay through PayPal, and PayPal holds the money until the item has arrived and the buyer has had a few days to check
        it. That keeps both sides safe. <A href={`${base}/guides/how-it-works`}>How a sale works</A> walks through it step by step.
      </P>

      <H2 id="sign-in">Signing in</H2>
      <P>
        Go to <A href={siteUrl("/welcome")}>resell.store/welcome</A>. There are no passwords: type your email, choose{" "}
        <strong>Email me a sign-in link</strong>, and tap the link we send you. It works once and runs out after 15 minutes. If
        it has expired, ask for a new one from the same page.
      </P>
      <P>
        New here? The same link makes your account, so there&apos;s nothing separate to sign up for. You stay signed in for 30
        days on that device. We make your name from your email (maya.rivera@… becomes Maya Rivera), and you can change it any time
        under <strong>Profile and settings</strong>.
      </P>

      <H2 id="choose">Selling or buying</H2>
      <P>
        The first time you sign in, we ask <strong>What brings you here?</strong>
      </P>
      <UL>
        <li>
          <strong>I have things to sell</strong> takes you to <strong>Open my first shop</strong>. See{" "}
          <A href={`${base}/guides/shops`}>Open a shop</A>.
        </li>
        <li>
          <strong>I&apos;m here to buy</strong> takes you to things for sale. See{" "}
          <A href={`${base}/guides/finding`}>Finding things</A>.
        </li>
        <li>
          <strong>Just look around first</strong> if you&apos;d rather not decide yet.
        </li>
      </UL>
      <Callout tone="tip" title="One account does both">
        This choice only decides where you start. You can sell and buy with the same account, and switch any time with the{" "}
        <strong>Selling</strong> / <strong>Buying</strong> switch on Home.
      </Callout>

      <H2 id="around">Finding your way around</H2>
      <P>When you&apos;re selling, the menu on the left (or the bar at the bottom on a phone) has:</P>
      <Table
        head={["Where", "What's there"]}
        rows={[
          [<strong key="a">Home</strong>, "What needs you today: offers to answer, things to ship, a listing you didn't finish."],
          [<strong key="b">Shops</strong>, "Your shops, with their live listings, drafts and sold things."],
          [<strong key="c">Inbox</strong>, "Offers, buyers' questions and sales to ship, all in one list."],
          [<strong key="d">Sales</strong>, "What sold, what to ship, and the money held for you or paid out."],
          [<strong key="e">Stats</strong>, "Views, likes, offers, and what you made."],
          [
            <strong key="f">Tools</strong>,
            "Connections (where you link PayPal to get paid), Your agent, API and Shopping sidekick.",
          ],
        ]}
      />
      <P>
        The big <strong>List something new</strong> button is always at the top. Your profile, notifications and sign-out live
        under your name at the bottom (<strong>Me</strong> on a phone).
      </P>
      <P>The marketplace at resell.store is where buyers browse. Its header has:</P>
      <UL>
        <li>
          <strong>Shop</strong>: everything for sale, with search and filters.
        </li>
        <li>
          <strong>Stores</strong>: every public shop, busiest first.
        </li>
        <li>
          <strong>For your agent</strong>: send your own AI assistant shopping for you.
        </li>
        <li>
          Your account (your initial, top right): orders, offers, things you&apos;ve saved and shops you follow.
        </li>
      </UL>

      <H2 id="address">Your store&apos;s own address</H2>
      <P>
        Every shop gets its own web address. If Maya calls her shop &quot;maya&quot;, it lives at maya.broresell.com, and each
        listing gets its own page under it, like maya.broresell.com/yellow-le-creuset-dutch-oven. Share those links anywhere. Being
        signed in on resell.store means you&apos;re signed in on every store too.
      </P>

      <H2 id="next">Where to next</H2>
      <CardGrid>
        <LinkCard href={`${base}/guides/shops`} title="Open a shop" icon={<BagIcon size={18} strokeWidth={2.2} />}>
          Pick a name and a link, and decide who can see it.
        </LinkCard>
        <LinkCard href={`${base}/guides/list-an-item`} title="List an item" icon={<TagIcon size={18} strokeWidth={2.2} />}>
          Five short steps from a photo to a live listing.
        </LinkCard>
        <LinkCard href={`${base}/guides/how-it-works`} title="How a sale works" icon={<ChatIcon size={18} strokeWidth={2.2} />}>
          From the first question to getting paid, with every timing.
        </LinkCard>
        <LinkCard href={`${base}/guides/finding`} title="Finding things" icon={<SparkleIcon size={18} />}>
          Search, filters, and saving things for later.
        </LinkCard>
      </CardGrid>
      <OL>
        <li>
          Selling? Before your first sale, connect PayPal on <A href={siteUrl("/tools/connections")}>Connections</A> so buyers
          can pay you. <A href={`${base}/guides/getting-paid`}>Getting paid</A> explains it.
        </li>
        <li>
          Buying? Read <A href={`${base}/guides/checkout`}>Checkout</A> to see how your money is protected.
        </li>
      </OL>
    </DocPage>
  );
}
