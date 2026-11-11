import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import {
  AgentSummaryEmail,
  agentSummarySubject,
  NewFromShopEmail,
  newFromShopSubject,
  NoticeEmail,
  noticeSubject,
  OfferReceivedEmail,
  offerReceivedSubject,
  OfferUpdateEmail,
  offerUpdateSubject,
  OrderPlacedEmail,
  orderPlacedSubject,
  PaidOutEmail,
  paidOutSubject,
  render,
  ShippedEmail,
  shippedSubject,
  SignInEmail,
  signInSubject,
  SoldEmail,
  soldSubject,
  toPlainText,
} from "../src/index";
import { money } from "../src/config";

/*
 * Every template renders with its own PreviewProps (what `pnpm email` shows)
 * and says the things a reader needs. Subject builders are checked on their
 * own, including the branches the preview doesn't hit.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function renderText(Component: (props: any) => ReactNode, props: object) {
  const html = await render(<Component {...props} />);
  return { html, text: toPlainText(html) };
}

describe("money", () => {
  it("shows whole dollars without cents and everything else with two decimals", () => {
    expect(money(20)).toBe("$20");
    expect(money(20.5)).toBe("$20.50");
    expect(money(0.1 + 0.2)).toBe("$0.30");
  });
});

describe("SignInEmail", () => {
  const props = SignInEmail.PreviewProps;

  it("renders the link, the address and how long it lasts", async () => {
    const { html, text } = await renderText(SignInEmail, props);
    expect(html).toMatch(/^<!DOCTYPE html/i);
    expect(text).toContain("Tap to sign in");
    expect(text).toContain(props.email);
    expect(text).toContain("15 minutes");
    expect(text).toContain("Sign in to resell.store");
    expect(html).toContain(props.url.replace(/&/g, "&amp;"));
  });

  it("uses a custom expiry when given one", async () => {
    const { text } = await renderText(SignInEmail, { ...props, expiresIn: 30 });
    expect(text).toContain("30 minutes");
    expect(text).not.toContain("15 minutes");
  });

  it("has a fixed subject", () => {
    expect(signInSubject()).toBe("Your resell.store sign-in link");
  });
});

describe("OfferReceivedEmail", () => {
  const props = OfferReceivedEmail.PreviewProps;

  it("shows the offer, the prices, the hold and the agent's take", async () => {
    const { text } = await renderText(OfferReceivedEmail, props);
    expect(text).toContain("New offer");
    expect(text).toContain("Jess offered $20");
    expect(text).toContain("Linen wrap dress");
    expect(text).toContain("Listed at $24");
    expect(text).toContain("Your lowest");
    expect(text).toContain("Money down");
    expect(text).toContain("Jess put $5 on hold");
    expect(text).toContain("I'd take it.");
    expect(text).toContain("Accept $20");
    expect(text).toContain("Counter or decline");
    expect(text).toContain("tomorrow, 2:11 pm");
  });

  it("leaves out the lowest price, hold and agent note when there are none", async () => {
    const { text } = await renderText(OfferReceivedEmail, {
      ...props,
      lowest: null,
      hold: null,
      agentTake: undefined,
    });
    expect(text).not.toContain("Your lowest");
    expect(text).not.toContain("Money down");
    expect(text).not.toContain("Your agent");
    expect(text).toContain("Jess offered $20");
  });

  it("builds a subject with the buyer, amount and title", () => {
    expect(offerReceivedSubject(props)).toBe("Jess offered $20 for “Linen wrap dress”");
    expect(offerReceivedSubject({ ...props, amount: 20.5 })).toContain("$20.50");
  });
});

describe("OfferUpdateEmail", () => {
  const props = OfferUpdateEmail.PreviewProps;

  it("renders an accepted offer with what's left to pay and the deadline", async () => {
    const { text } = await renderText(OfferUpdateEmail, props);
    expect(text).toContain("Offer accepted");
    expect(text).toContain("It's yours for $20");
    expect(text).toContain("Maya's Closet said yes");
    expect(text).toContain("Pay $15 with PayPal");
    expect(text).toContain("Saturday, 2:11 pm");
  });

  it("renders a counter", async () => {
    const { text } = await renderText(OfferUpdateEmail, { ...props, status: "countered" });
    expect(text).toContain("Counter offer");
    expect(text).toContain("Maya's Closet came back with $22");
    expect(text).toContain("Accept $22");
    expect(text).toContain("Make another offer");
  });

  it("renders a decline and says the hold is coming back", async () => {
    const { text } = await renderText(OfferUpdateEmail, { ...props, status: "declined" });
    expect(text).toContain("Offer declined");
    expect(text).toContain("Maya's Closet passed on $20");
    expect(text).toContain("on its way back");
    expect(text).toContain("See the listing");
  });

  it("builds a subject for each status", () => {
    expect(offerUpdateSubject(props)).toBe("Maya's Closet accepted your $20 offer");
    expect(offerUpdateSubject({ ...props, status: "countered" })).toBe("Maya's Closet came back with $22");
    expect(offerUpdateSubject({ ...props, status: "countered", counter: undefined })).toBe(
      "Maya's Closet came back with $20",
    );
    expect(offerUpdateSubject({ ...props, status: "declined" })).toBe("Maya's Closet passed on your $20 offer");
  });
});

describe("SoldEmail", () => {
  const props = SoldEmail.PreviewProps;

  it("shows the sale, the receipt and how to ship", async () => {
    const { text } = await renderText(SoldEmail, props);
    expect(text).toContain("Sold");
    expect(text).toContain("$18");
    expect(text).toContain("Priya bought it");
    expect(text).toContain("Ceramic bud vase");
    expect(text).toContain("Going to Brooklyn, NY");
    expect(text).toContain("resell.store fee");
    expect(text).toContain("You get");
    expect(text).toContain("16.56");
    expect(text).toContain("Ship it by Friday");
    expect(text).toContain("Print label");
    expect(text).toContain("See the sale");
  });

  it("builds a subject with the title and price", () => {
    expect(soldSubject(props)).toBe("Sold! Ceramic bud vase for $18");
  });
});

describe("ShippedEmail", () => {
  const props = ShippedEmail.PreviewProps;

  it("shows the carrier, tracking number and links", async () => {
    const { html, text } = await renderText(ShippedEmail, props);
    expect(text).toContain("It's on its way");
    expect(text).toContain("Maya's Closet dropped it off with USPS");
    expect(text).toContain("It should be with you on Tuesday");
    expect(text).toContain("USPS tracking");
    expect(text).toContain(props.trackingNumber);
    expect(text).toContain("Track it");
    expect(html).toContain(props.trackingUrl);
  });

  it("leaves out the arrival line without an eta", async () => {
    const { text } = await renderText(ShippedEmail, { ...props, eta: undefined });
    expect(text).not.toContain("It should be with you");
  });

  it("builds a subject from the title", () => {
    expect(shippedSubject(props)).toBe("Linen wrap dress is on its way");
  });
});

describe("NewFromShopEmail", () => {
  const props = NewFromShopEmail.PreviewProps;

  it("shows every new item with its price", async () => {
    const { text } = await renderText(NewFromShopEmail, props);
    expect(text).toContain("Just listed");
    expect(text).toContain("4 new things at Maya's Closet");
    for (const item of props.items) {
      expect(text).toContain(item.title);
      expect(text).toContain(money(item.price));
    }
    expect(text).toContain("See the shop");
  });

  it("caps the grid at six and offers to see them all", async () => {
    const items = Array.from({ length: 8 }, (_, i) => ({
      title: `Item ${i + 1}`,
      price: 10 + i,
      imageUrl: null,
      url: `https://maya.broresell.com/item-${i + 1}`,
    }));
    const { text } = await renderText(NewFromShopEmail, { ...props, items });
    expect(text).toContain("Item 6");
    expect(text).not.toContain("Item 7");
    expect(text).toContain("See all 8");
  });

  it("builds a subject for one item or several", () => {
    expect(newFromShopSubject(props)).toBe("Maya's Closet listed 4 new things");
    expect(newFromShopSubject({ ...props, items: props.items.slice(0, 1) })).toBe(
      "New at Maya's Closet: Linen wrap dress",
    );
  });
});

describe("AgentSummaryEmail", () => {
  const props = AgentSummaryEmail.PreviewProps;

  it("shows the summary, stats, what needs the seller and what was handled", async () => {
    const { text } = await renderText(AgentSummaryEmail, props);
    expect(text).toContain("From your agent");
    expect(text).toContain("Here's your Thursday");
    expect(text).toContain(props.summary);
    expect(text).toContain("Views");
    expect(text).toContain("128");
    expect(text).toContain("Needs you");
    expect(text).toContain("Jess offered $20");
    expect(text).toContain("Handled for you");
    expect(text).toContain("Countered Sam at $175 on the dutch oven");
    expect(text).toContain("Open your inbox");
  });

  it("drops the empty sections", async () => {
    const { text } = await renderText(AgentSummaryEmail, { ...props, needsYou: [], handled: [] });
    expect(text).not.toContain("Needs you");
    expect(text).not.toContain("Handled for you");
  });

  it("builds a subject that counts what needs the seller", () => {
    expect(agentSummarySubject(props)).toBe("Your Thursday: 2 things need you");
    expect(agentSummarySubject({ ...props, needsYou: props.needsYou.slice(0, 1) })).toBe(
      "Your Thursday: 1 thing needs you",
    );
    expect(agentSummarySubject({ ...props, needsYou: [] })).toBe("Your Thursday: all handled");
  });
});

describe("NoticeEmail", () => {
  const props = NoticeEmail.PreviewProps;

  it("lays out the tag, title, listing, note, actions and fine print", async () => {
    const { html, text } = await renderText(NoticeEmail, props);
    expect(text).toContain("Check it");
    expect(text).toContain("Did it arrive?");
    expect(text).toContain(props.lead);
    expect(text).toContain("Linen wrap dress");
    expect(text).toContain("From Maya's Closet, $29 with shipping");
    expect(text).toContain("Your money is safe");
    expect(text).toContain("It's all good");
    expect(text).toContain("Report a problem");
    expect(text).toContain(props.small);
    expect(html).toContain("https://resell.store/account/orders/123");
  });

  it("renders a receipt and no buttons when given those", async () => {
    const { text } = await renderText(NoticeEmail, {
      ...props,
      listing: undefined,
      note: undefined,
      small: undefined,
      actions: [],
      receipt: { lines: [{ label: "Refund", amount: 29 }], total: { label: "Back to you", amount: 29 } },
    });
    expect(text).toContain("Back to you");
    expect(text).not.toContain("Report a problem");
    expect(text).not.toContain("Your money is safe");
  });

  it("uses the subject it was given", () => {
    expect(noticeSubject(props)).toBe("Did your linen wrap dress arrive?");
  });
});

describe("OrderPlacedEmail", () => {
  const props = OrderPlacedEmail.PreviewProps;

  it("is the buyer's receipt, with how their money is kept safe", async () => {
    const { text } = await renderText(OrderPlacedEmail, props);
    expect(text).toContain("It's yours");
    expect(text).toContain("Linen wrap dress");
    expect(text).toContain("You paid");
    expect(text).toContain("$29");
    expect(text).toContain("PayPal holds it until it arrives");
    expect(text).toContain("ships it");
    expect(text).toContain("See your order");
  });

  it("labels a test checkout", async () => {
    const { text } = await renderText(OrderPlacedEmail, { ...props, test: true });
    expect(text).toContain("test, no money moved");
  });

  it("builds a subject with the title", () => {
    expect(orderPlacedSubject(props)).toBe("Your receipt: Linen wrap dress");
  });
});

describe("PaidOutEmail", () => {
  const props = PaidOutEmail.PreviewProps;

  it("shows what the seller got and why", async () => {
    const { text } = await renderText(PaidOutEmail, props);
    expect(text).toContain("$25.50");
    expect(text).toContain("Jess said it's all good");
    expect(text).toContain("in your PayPal");
    expect(text).toContain("resell.store fee");
    expect(text).toContain("You get");
  });

  it("says when no money moved", async () => {
    const { text } = await renderText(PaidOutEmail, { ...props, test: true });
    expect(text).toContain("no money moved");
    expect(paidOutSubject({ ...props, test: true })).toBe("You've been paid for Linen wrap dress (test)");
  });

  it("builds a subject with the title", () => {
    expect(paidOutSubject(props)).toBe("You've been paid for Linen wrap dress");
  });
});
