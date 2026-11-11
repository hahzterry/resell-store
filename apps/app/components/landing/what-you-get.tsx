import { Container, Point, Tag } from "./parts";

const features = [
  {
    title: "Your own shop page",
    body: "yourname.resell.store, ready to share the minute you open. Run more than one if you like.",
  },
  {
    title: "Listings that write themselves",
    body: "Photo in, finished listing out. Change any word you want.",
  },
  {
    title: "A link page for your bio",
    body: "Your shop, your socials and anything else on one tidy page.",
  },
  {
    title: "Offers and deposits",
    body: "Let buyers name a price, with money down if you want proof they're serious.",
  },
  {
    title: "An inbox that answers itself",
    body: "Your agent handles the easy questions and flags the ones that need you.",
  },
  {
    title: "Sales, stats and payouts",
    body: "See what sold, what's being held and what has landed in your PayPal.",
  },
  {
    title: "List it elsewhere too",
    body: "Send the same listing to the other places you sell, and mark it sold everywhere at once.",
  },
  {
    title: "Bring your own AI",
    body: "Connect ChatGPT or Claude and run the shop by chatting. There's an MCP link and an API as well.",
  },
];

const worksWith = ["ChatGPT", "Claude", "Grok", "Any MCP client", "API"];

function SellerCard() {
  return (
    <div className="flex w-full max-w-[400px] flex-col gap-5 rounded-xl border border-border bg-surface p-6">
      <span className="flex size-[72px] items-center justify-center rounded-full bg-primary font-display text-3xl font-extrabold tracking-tight text-on-primary">
        M
      </span>
      <div className="flex flex-col gap-1">
        <span className="font-display text-2xl font-extrabold tracking-tight">
          Maya's closet
        </span>
        <span className="text-sm font-semibold text-secondary">
          maya.broresell.com
        </span>
      </div>
      <p className="text-base text-text-muted">
        Good things I no longer wear, looking for someone who will.
      </p>
      <div className="flex items-center gap-5 border-t border-border pt-4">
        {[
          { value: 38, label: "listed" },
          { value: 112, label: "sold" },
        ].map((stat) => (
          <span key={stat.label} className="flex items-baseline gap-1.5">
            <span className="font-display text-xl font-extrabold">
              {stat.value}
            </span>
            <span className="text-sm font-medium text-text-muted">
              {stat.label}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function WhatYouGet() {
  return (
    <Container className="flex flex-col items-start gap-16 pb-24 md:pb-32 xl:flex-row xl:gap-[88px]">
      <div className="flex w-full flex-col gap-7 xl:w-[400px] xl:shrink-0">
        <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-[56px] md:leading-[58px]">
          A whole shop, not just a listing
        </h2>
        <p className="text-lg text-text-muted">
          Everything a proper little store needs, set up the moment you open.
        </p>
        <SellerCard />
      </div>
      <div className="flex w-full min-w-0 flex-1 flex-col">
        <div className="grid border-t border-border sm:grid-cols-2 sm:gap-x-12">
          {features.map((f, i) => (
            <div key={f.title}>
              <Point
                title={f.title}
                className="h-full border-b border-border py-7"
              >
                {f.body}
              </Point>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2.5 pt-7">
          <span className="pr-1.5 text-sm font-semibold text-text-muted">
            Works with
          </span>
          {worksWith.map((name, i) => (
            <Tag key={name} className="h-9 px-4 font-bold">{name}</Tag>
          ))}
        </div>
      </div>
    </Container>
  );
}
