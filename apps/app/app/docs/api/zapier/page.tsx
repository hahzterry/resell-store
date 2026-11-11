import type { Metadata } from "next";
import { CodeBlock } from "../../../../components/docs/code";
import { A, C, Callout, DocPage, H2, H3, OL, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";
import { webhookEvents } from "../../../../lib/server/api/webhooks";
import { apiUrl, siteUrl } from "../../../../lib/urls";

export const metadata: Metadata = { title: "Zapier" };

/** Each event's trigger in the resell.store Zapier app (integrations/zapier/lib/events.js). */
const triggerNames: Record<string, string> = {
  "listing.sold": "New Sale",
  "offer.received": "New Offer",
  "offer.updated": "Updated Offer",
  "question.asked": "New Buyer Message",
  "order.completed": "Order Completed",
  "order.problem": "Problem Reported",
  "order.refunded": "Order Refunded",
  "payout.sent": "Payout Sent",
  "review.created": "New Review",
};

const saleFields = {
  id: "a71c3e5d-…",
  status: "paid",
  item: 170,
  shipping: 18,
  total: 188,
  listing__title: "Yellow Le Creuset dutch oven, 5.5 qt",
  listing__url: "https://maya.broresell.com/yellow-le-creuset-dutch-oven-5-5-qt",
  shop__slug: "maya",
  buyer__name: "Jess",
  ship_to__name: "Jess Park",
  ship_to__address: "12 Elm St, Portland, OR 97201",
  payout__seller_net: 164.14,
  paid_at: "2026-10-02T18:30:00.000Z",
  event_type: "listing.sold",
  event_id: "evt_8c1d2f…",
  test: false,
};

/*
 * Starting Zaps from resell.store events: Webhooks by Zapier (a pasted
 * Catch Hook address) or the resell.store Zapier app (REST hooks, see
 * integrations/zapier). Both are webhook subscriptions under the hood.
 */
export default async function Zapier() {
  const base = await docsBase();
  const appUrl = process.env.ZAPIER_APP_URL?.trim() || null;
  const toolsApi = siteUrl("/tools/api");
  const subscribe = `curl ${apiUrl("/webhooks/subscriptions")} \\
  -H "Authorization: Bearer rs_live_..." \\
  -d url="https://hook.us1.make.com/abc123" \\
  -d events="listing.sold,review.created" \\
  -d name="Sales and reviews to Make"`;

  return (
    <DocPage
      base={base}
      path="/api/zapier"
      eyebrow="API"
      title="Zapier"
      lead="Start a Zap when something happens on your shops: add each sale to a sheet, get a text for every offer, post new reviews to Slack. No code."
      toc={[
        { id: "two-ways", title: "Two ways in" },
        { id: "catch-hook", title: "With Webhooks by Zapier" },
        { id: "app", title: "With the resell.store app" },
        { id: "triggers", title: "What can start a Zap" },
        { id: "fields", title: "What the Zap gets" },
        { id: "samples", title: "Samples and testing" },
        { id: "ideas", title: "Zaps to try" },
        { id: "stopping", title: "Stopping a Zap" },
        { id: "other-tools", title: "Make, n8n and others" },
        { id: "trouble", title: "If something's wrong" },
      ]}
    >
      <H2 id="two-ways" className="mt-0">
        Two ways in
      </H2>
      <P>
        Either way, resell.store sends the event to Zapier the moment it happens, so the Zap runs straight away. Both show under{" "}
        <strong>Start a Zap</strong> on <A href={toolsApi}>resell.store/tools/api</A>, next to your own webhook. They don&apos;t
        replace it.
      </P>
      <Table
        head={["", "Webhooks by Zapier", "The resell.store app"]}
        rows={[
          ["Set up", "Paste Zapier's address on resell.store and pick events", "Pick resell.store and a trigger in Zapier, sign in with your key"],
          ["Zapier plan", "Webhooks by Zapier is a premium app, so it needs a paid plan", "Any plan"],
          ["One shop only", "Add a Filter step on Shop Slug", "Choose the shop on the trigger"],
          ["Fields", <span key="f">Under <strong>Data Object</strong>, like Data Object Total</span>, "Named plainly, like Total and Item"],
          ["Available", "Now", appUrl ? "Now" : "Coming soon. Use Webhooks by Zapier until then"],
        ]}
      />

      <H2 id="catch-hook">With Webhooks by Zapier</H2>
      <OL>
        <li>
          In Zapier, make a Zap. For the trigger, choose <strong>Webhooks by Zapier</strong>, then the <strong>Catch Hook</strong>{" "}
          event. Leave <strong>Pick off a Child Key</strong> empty.
        </li>
        <li>
          Copy the webhook address Zapier shows. It starts with <C>https://hooks.zapier.com/hooks/catch/</C>.
        </li>
        <li>
          On <A href={toolsApi}>resell.store/tools/api</A>, find <strong>Start a Zap</strong>. Paste the address, choose the events
          that should start this Zap, and choose <strong>Add</strong>. We send a sample straight away.
        </li>
        <li>
          Back in Zapier, choose <strong>Test trigger</strong>. The sample shows up with every field. If Zapier didn&apos;t catch it,
          choose <strong>Send a sample</strong> on resell.store and test again.
        </li>
        <li>Add your actions and publish the Zap.</li>
      </OL>
      <Callout tone="tip" title="One address, several events">
        A Catch Hook can take more than one event. Add a <strong>Paths</strong> or <strong>Filter</strong> step on the{" "}
        <strong>Type</strong> field (<C>listing.sold</C>, <C>offer.received</C>…) to do different things for each. Or make one Zap per
        event, which is easier to follow later.
      </Callout>

      <H2 id="app">With the resell.store app</H2>
      {appUrl ? (
        <P>
          The resell.store app is on Zapier as an invite-only app for now. Open the <A href={appUrl}>invite link</A> once to add it to
          your Zapier account, or choose <strong>Connect on Zapier</strong> on <A href={toolsApi}>resell.store/tools/api</A>.
        </P>
      ) : (
        <Callout tone="note" title="Coming soon">
          The resell.store app isn&apos;t on Zapier yet. Once it is, <strong>Connect on Zapier</strong> shows on{" "}
          <A href={toolsApi}>resell.store/tools/api</A> and these steps work. Until then, use Webhooks by Zapier (above): Zaps you make
          that way keep working.
        </Callout>
      )}
      <OL>
        <li>
          In Zapier, make a Zap. For the trigger, search for <strong>resell.store</strong> and choose an event, like{" "}
          <strong>New Sale</strong>.
        </li>
        <li>
          Sign in when Zapier asks. Paste your secret key from <A href={toolsApi}>resell.store/tools/api</A> (choose{" "}
          <strong>Copy</strong> next to it). It starts with <C>rs_live_</C>. No key yet? Choose <strong>Make a key</strong> there.
        </li>
        <li>
          Choose a <strong>Shop</strong> if the Zap is only for one of them. Leave it empty for all your shops.
        </li>
        <li>
          Choose <strong>Test trigger</strong>. Zapier shows your latest real ones, like your last three sales, so you can map real
          fields. If you have none yet, it shows a made-up one.
        </li>
        <li>
          Add your actions and publish. Turning the Zap on connects it, and it shows under <strong>Start a Zap</strong> on the API
          page.
        </li>
      </OL>
      <Callout tone="warn" title="Your key is also your scripts' key">
        Zapier signs in with the same secret key as your own code. If you choose <strong>Make a new key</strong>, the old one stops
        working everywhere, Zapier included. Reconnect the resell.store account in Zapier&apos;s <strong>Apps</strong> page with the
        new key.
      </Callout>

      <H2 id="triggers">What can start a Zap</H2>
      <Table
        head={["Event", "In the resell.store app", "When"]}
        rows={webhookEvents.map((e) => [<C key={e.id}>{e.id}</C>, triggerNames[e.id] ?? e.id, e.what])}
      />
      <P>
        Sales, completed orders, problems, refunds and payouts all carry the order. Offers carry the offer, buyer messages the message,
        and reviews the review. Each is the same object the <A href={`${base}/api`}>API</A> returns.
      </P>

      <H2 id="fields">What the Zap gets</H2>
      <P>
        The resell.store app gives the Zap the object itself, with its parts flattened the way Zapier likes. A sale looks like this
        (shortened):
      </P>
      <CodeBlock tone="paper" title="New Sale" code={JSON.stringify(saleFields, null, 2)} />
      <UL>
        <li>
          Money is in dollars, as numbers: <C>total</C> is what the buyer paid, <C>payout__seller_net</C> what you get after fees.
        </li>
        <li>
          <C>event_type</C> and <C>event_id</C> say which event it was. The id is the same if we have to send it again, so you can use
          it to skip repeats.
        </li>
        <li>
          With Webhooks by Zapier you get the whole event as we send it, so the same fields sit under <strong>Data Object</strong>:{" "}
          Data Object Total, Data Object Listing Title. <strong>Type</strong> is the event. See{" "}
          <A href={`${base}/api/webhooks#payload`}>what we send</A>.
        </li>
        <li>
          A buyer&apos;s full address is only in sales and orders, under <C>ship_to</C>. Keep Zaps that copy it somewhere private.
        </li>
      </UL>

      <H2 id="samples">Samples and testing</H2>
      <P>
        A sample is a real event built from your latest matching thing, or made up if you have none, with <C>test</C> set to{" "}
        <C>true</C>. Nothing happened on your shop to cause it.
      </P>
      <UL>
        <li>
          <strong>Send a sample</strong> on the API page posts one to that address now. Use it while Zapier is waiting for a request.
        </li>
        <li>
          Testing a trigger in the resell.store app only reads samples. It doesn&apos;t send anything, so it never runs your Zaps.
        </li>
      </UL>
      <Callout tone="warn" title="Samples run live Zaps">
        If the Zap is already on, a sample you send runs its actions for real: a row in your sheet, a text to your phone. To be safe,
        add a <strong>Filter</strong> step first: continue only if <C>test</C> (or Test, with Webhooks by Zapier) is false.
      </Callout>

      <H2 id="ideas">Zaps to try</H2>
      <UL>
        <li>
          <strong>New Sale → Google Sheets.</strong> One row per sale with the item, total, what you get and the date. That&apos;s your
          bookkeeping done.
        </li>
        <li>
          <strong>New Offer → SMS by Zapier.</strong> &quot;Jess offered $150 on the dutch oven&quot;, so you can answer before it
          expires.
        </li>
        <li>
          <strong>New Buyer Message → Slack.</strong> Post questions to a channel, with a link to the item.
        </li>
        <li>
          <strong>New Sale → Gmail.</strong> Email yourself the ship-to address and a packing checklist.
        </li>
        <li>
          <strong>New Review → Slack or X.</strong> Share your five-star reviews. Use a Filter step for <C>rating</C> 5 and{" "}
          <C>public</C> true.
        </li>
        <li>
          <strong>Payout Sent → QuickBooks or Xero.</strong> Record the income when the money lands.
        </li>
        <li>
          <strong>Problem Reported → a to-do app.</strong> Make a task, so a problem never gets missed.
        </li>
      </UL>

      <H2 id="stopping">Stopping a Zap</H2>
      <UL>
        <li>
          <strong>The resell.store app:</strong> turn the Zap off or delete it in Zapier, and we stop sending. It goes from the API page
          on its own.
        </li>
        <li>
          <strong>Webhooks by Zapier:</strong> choose <strong>Remove</strong> next to it on the API page. Turning the Zap off in
          Zapier doesn&apos;t tell us, so we may keep sending to its address. Remove it here when you&apos;re done with it.
        </li>
        <li>
          Choosing <strong>Remove</strong> on a Zap made with the app stops it too, but the Zap still looks on in Zapier. Turn it off
          there as well.
        </li>
      </UL>

      <H2 id="other-tools">Make, n8n and others</H2>
      <P>
        Anything that takes a webhook works like Webhooks by Zapier: paste its address on the API page. If you&apos;re building an
        integration, use the same REST hooks the resell.store Zapier app uses. Each subscription gets its own events and its own
        signing secret, and deliveries are signed and retried just like <A href={`${base}/api/webhooks`}>your webhook</A>.
      </P>
      <Table
        head={["Call", "What it does"]}
        rows={[
          [<C key="a">POST /webhooks/subscriptions</C>, "Subscribe an address to some events. Call it again with the same address to change them"],
          [<C key="b">DELETE /webhooks/subscriptions/:id</C>, "Unsubscribe it"],
          [<C key="c">GET /webhooks/samples/:event</C>, "Up to 10 sample events from the seller's latest things, for showing fields"],
          [<C key="d">POST /webhooks/subscriptions/:id/test</C>, "Post a sample to the address now"],
        ]}
      />
      <CodeBlock title="Terminal" code={subscribe} />
      <P>
        Answer a delivery with <C>410 Gone</C> and we delete the subscription. Anything else that isn&apos;t a 2xx is tried again
        about 5 minutes, 30 minutes, 2 hours, 6 hours and a day later. See <A href={`${base}/api/webhooks`}>Webhooks</A> for every
        call.
      </P>

      <H2 id="trouble">If something&apos;s wrong</H2>
      <H3>The Zap didn&apos;t run</H3>
      <UL>
        <li>
          Check the API page. Each address shows its last delivery and what Zapier said. <C>200</C> means Zapier got it, so look at
          the Zap&apos;s history in Zapier next.
        </li>
        <li>
          <strong>Off</strong> means it failed for three days and we stopped. Turn the Zap off and on again in Zapier (the app), or add
          the address again (Webhooks by Zapier).
        </li>
        <li>Check the event: a Zap for New Offer doesn&apos;t run when a buyer takes your counter. That&apos;s Updated Offer.</li>
        <li>With a Shop chosen on the trigger, events from your other shops are skipped on purpose.</li>
      </UL>
      <H3>Zapier says the key isn&apos;t valid</H3>
      <P>
        Someone made a new key on the API page, which stops the old one. Copy the current key and reconnect the account in
        Zapier&apos;s <strong>Apps</strong> page.
      </P>
      <H3>Zapier doesn&apos;t find a request when testing a Catch Hook</H3>
      <P>
        Choose <strong>Send a sample</strong> on the API page, then <strong>Test trigger</strong> in Zapier again. Check the address on
        resell.store matches the one Zapier shows: each Zap has its own.
      </P>
    </DocPage>
  );
}
