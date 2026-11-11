import "server-only";
import { after } from "next/server";
import { z } from "zod";
import { toCents } from "../../../money";
import { siteUrl } from "../../../urls";
import {
  buyerRespond,
  confirmReceived,
  listBuyerOffers,
  listBuyerOrders,
  listSellerOffers,
  listSellerOrders,
  makeOffer,
  markShipped,
  respondToOffer,
  type OfferStatus,
} from "../../commerce";
import { findBuyableListing } from "../../market";
import { notifyOfferAnswered, notifyOfferReceived, notifyShipped } from "../../notify";
import { ApiError, checkCeiling, idParam, money, notFound, page, pagination } from "../http";
import { route } from "../router";
import { apiOffer, apiOrder } from "../serialize";

const offerStatuses = ["open", "countered", "accepted", "declined", "withdrawn", "expired", "paid"] as const;
const orderStatuses = ["paid", "shipped", "delivered", "completed", "refunded", "cancelled"] as const;

const offerExample = {
  object: "offer",
  id: "5b0f…",
  status: "open",
  amount: 150,
  counter: null,
  agreed: 150,
  note: "Could pick up this weekend.",
  deposit: null,
  expires_at: "2026-10-04T18:00:00.000Z",
  responded_at: null,
  created_at: "2026-10-02T18:00:00.000Z",
  listing: {
    id: "8d1e6c2a-…",
    title: "Yellow Le Creuset dutch oven, 5.5 qt",
    price: 185,
    status: "live",
    photo: "https://files.resell.store/…",
    url: "https://maya.broresell.com/yellow-le-creuset-dutch-oven-5-5-qt",
  },
  shop: { slug: "maya", name: "Maya's closet" },
  buyer: { name: "Jess" },
};

const orderExample = {
  object: "order",
  id: "a71c…",
  status: "paid",
  item: 170,
  shipping: 18,
  total: 188,
  delivery: "tracked",
  tracking_number: null,
  offer: "5b0f…",
  listing: offerExample.listing,
  shop: offerExample.shop,
  buyer: { name: "Jess" },
  ship_to: { name: "Jess Park", address: "12 Elm St, Portland, OR 97201", country: "United States" },
  payout: { provider: "paypal", platform_fee: 17, paypal_fee: 6.86, seller_net: 164.14, released_at: null },
  paid_at: "2026-10-02T18:30:00.000Z",
  shipped_at: null,
  delivered_at: null,
  completed_at: null,
};

async function sellerOffer(sellerId: string, id: string) {
  const found = (await listSellerOffers(sellerId)).find((o) => o.offer.id === idParam.parse(id));
  if (!found) throw notFound("offer");
  return found;
}

async function buyerOffer(buyerId: string, id: string) {
  const found = (await listBuyerOffers(buyerId)).find((o) => o.offer.id === idParam.parse(id));
  if (!found) throw notFound("offer");
  return found;
}

export const offerRoutes = [
  route({
    method: "GET",
    path: "/offers",
    group: "Offers",
    access: "key",
    summary: "List offers",
    description:
      "Offers on your listings (`role=seller`, the default) or offers you've made (`role=buyer`), newest first. Status is as of now: an open offer past its deadline reads `expired`.",
    query: z.object({
      role: z.enum(["seller", "buyer"]).default("seller"),
      status: z.enum(offerStatuses).optional(),
      listing: z.string().optional().describe("Only offers on this listing id."),
      ...pagination,
    }),
    example: { query: "status=open", response: { object: "list", data: [offerExample], total: 1, has_more: false } },
    handler: async ({ auth, query }) => {
      const rows =
        query.role === "buyer"
          ? await listBuyerOffers(auth!.user.id)
          : await listSellerOffers(auth!.user.id, { listingId: query.listing });
      const filtered = rows.filter(
        (o) => (!query.status || o.status === query.status) && (!query.listing || o.listing.id === query.listing),
      );
      return page(filtered.map(apiOffer), query);
    },
  }),

  route({
    method: "GET",
    path: "/offers/:id",
    group: "Offers",
    access: "key",
    summary: "Get an offer",
    description: "One offer, on your listing or made by you.",
    example: { path: "/offers/5b0f…", response: offerExample },
    handler: async ({ auth, params }) => {
      const id = idParam.parse(params.id);
      const mine = (await listSellerOffers(auth!.user.id)).find((o) => o.offer.id === id);
      if (mine) return apiOffer(mine);
      return apiOffer(await buyerOffer(auth!.user.id, id));
    },
  }),

  ...(["accept", "decline", "counter"] as const).map((action) =>
    route({
      method: "POST",
      path: `/offers/:id/${action}`,
      group: "Offers",
      access: "key",
      scope: "offers",
      summary: { accept: "Accept an offer", decline: "Decline an offer", counter: "Counter an offer" }[action],
      description: {
        accept: "Says yes. The buyer gets an email and 48 hours to pay the offered amount.",
        decline: "Says no, kindly. The buyer gets an email.",
        counter:
          "Names your price. It has to sit between their offer and your asking price. The buyer has 48 hours to take it.",
      }[action],
      body: action === "counter" ? z.object({ amount: money().describe("Your counter, in dollars.") }) : z.object({}),
      example: {
        path: `/offers/5b0f…/${action}`,
        ...(action === "counter" ? { body: { amount: 170 } } : {}),
        response: {
          ...offerExample,
          status: action === "accept" ? "accepted" : action === "decline" ? "declined" : "countered",
          ...(action === "counter" ? { counter: 170, agreed: 170 } : {}),
          responded_at: "2026-10-02T19:00:00.000Z",
        },
      },
      handler: async ({ auth, params, body }) => {
        const amount = (body as { amount?: number }).amount;
        const updated = await respondToOffer({
          sellerId: auth!.user.id,
          offerId: idParam.parse(params.id),
          action,
          counterCents: amount != null ? toCents(amount) : undefined,
        });
        after(() => notifyOfferAnswered(updated.id));
        return apiOffer(await sellerOffer(auth!.user.id, updated.id));
      },
    }),
  ),

  route({
    method: "POST",
    path: "/offers",
    group: "Offers",
    access: "key",
    scope: "buying",
    summary: "Make an offer",
    description:
      "Offers a price on a live listing that takes offers. It has to be under the asking price. The seller has 48 hours to answer; a new offer on the same listing replaces your last one.",
    body: z.object({
      listing: z.string().min(1).describe("The listing id."),
      amount: money().describe("Your offer, in dollars."),
      note: z.string().trim().max(500).optional().describe("A line for the seller."),
    }),
    example: {
      body: { listing: "8d1e6c2a-…", amount: 150, note: "Could pick up this weekend." },
      response: { ...offerExample, buyer: undefined },
    },
    handler: async ({ auth, body }) => {
      checkCeiling(auth!, toCents(body.amount));
      const created = await makeOffer({
        buyerId: auth!.user.id,
        listingId: body.listing,
        amountCents: toCents(body.amount),
        note: body.note,
      });
      after(() => notifyOfferReceived(created.id));
      return apiOffer(await buyerOffer(auth!.user.id, created.id));
    },
  }),

  ...(
    [
      ["withdraw", "Withdraw your offer", "Takes back an offer that's still open or countered."],
      ["accept-counter", "Take the counter", "Agrees to the seller's counter. You then have 48 hours to pay (see POST /checkout)."],
      ["decline-counter", "Turn down the counter", "Says no to the seller's counter. The offer ends."],
    ] as const
  ).map(([action, summary, description]) =>
    route({
      method: "POST",
      path: `/offers/:id/${action}`,
      group: "Offers",
      access: "key",
      scope: "buying",
      summary,
      description,
      example: {
        path: `/offers/5b0f…/${action}`,
        response: {
          ...offerExample,
          buyer: undefined,
          status: ({ withdraw: "withdrawn", "accept-counter": "accepted", "decline-counter": "declined" } as Record<string, OfferStatus>)[action],
        },
      },
      handler: async ({ auth, params }) => {
        const offerId = idParam.parse(params.id);
        if (action === "accept-counter") {
          const current = await buyerOffer(auth!.user.id, offerId);
          checkCeiling(auth!, current.offer.counterCents ?? current.offer.amountCents);
        }
        const updated = await buyerRespond({ buyerId: auth!.user.id, offerId, action });
        return apiOffer(await buyerOffer(auth!.user.id, updated.id));
      },
    }),
  ),
];

export const orderRoutes = [
  route({
    method: "GET",
    path: "/sales",
    group: "Sales",
    access: "key",
    summary: "List sales",
    description:
      "What's sold across your shops, newest first: who bought it, where it ships, and what you get once the money's released.",
    query: z.object({
      status: z.enum(orderStatuses).optional().describe("`paid` means it's waiting for you to ship."),
      ...pagination,
    }),
    example: { query: "status=paid", response: { object: "list", data: [orderExample], total: 1, has_more: false } },
    handler: async ({ auth, query }) => {
      const rows = (await listSellerOrders(auth!.user.id)).filter((r) => !query.status || r.order.status === query.status);
      return page(rows.map((r) => apiOrder(r, "seller")), query);
    },
  }),

  route({
    method: "GET",
    path: "/sales/:id",
    group: "Sales",
    access: "key",
    summary: "Get a sale",
    example: { path: "/sales/a71c…", response: orderExample },
    handler: async ({ auth, params }) => {
      const row = (await listSellerOrders(auth!.user.id)).find((r) => r.order.id === idParam.parse(params.id));
      if (!row) throw notFound("sale");
      return apiOrder(row, "seller");
    },
  }),

  route({
    method: "POST",
    path: "/sales/:id/ship",
    group: "Sales",
    access: "key",
    scope: "orders",
    summary: "Mark shipped",
    description:
      "Says it's in the post, with a tracking number if you have one. The buyer gets an email with the tracking link. The money is released when they confirm it arrived.",
    body: z.object({ tracking_number: z.string().trim().max(80).optional() }),
    example: {
      path: "/sales/a71c…/ship",
      body: { tracking_number: "9400111899223197428490" },
      response: { ...orderExample, status: "shipped", tracking_number: "9400111899223197428490", shipped_at: "2026-10-03T15:00:00.000Z" },
    },
    handler: async ({ auth, params, body }) => {
      const updated = await markShipped({
        sellerId: auth!.user.id,
        orderId: idParam.parse(params.id),
        trackingNumber: body.tracking_number,
      });
      after(() => notifyShipped(updated.id));
      const row = (await listSellerOrders(auth!.user.id)).find((r) => r.order.id === updated.id)!;
      return apiOrder(row, "seller");
    },
  }),

  route({
    method: "GET",
    path: "/orders",
    group: "Buying",
    access: "key",
    summary: "List your orders",
    description: "Things you've bought, newest first.",
    query: z.object({ status: z.enum(orderStatuses).optional(), ...pagination }),
    example: {
      response: { object: "list", data: [{ ...orderExample, buyer: undefined, payout: undefined, status: "shipped" }], total: 1, has_more: false },
    },
    handler: async ({ auth, query }) => {
      const rows = (await listBuyerOrders(auth!.user.id)).filter((r) => !query.status || r.order.status === query.status);
      return page(rows.map((r) => apiOrder(r, "buyer")), query);
    },
  }),

  route({
    method: "GET",
    path: "/orders/:id",
    group: "Buying",
    access: "key",
    summary: "Get an order",
    example: { path: "/orders/a71c…", response: { ...orderExample, buyer: undefined, payout: undefined } },
    handler: async ({ auth, params }) => {
      const row = (await listBuyerOrders(auth!.user.id)).find((r) => r.order.id === idParam.parse(params.id));
      if (!row) throw notFound("order");
      return apiOrder(row, "buyer");
    },
  }),

  route({
    method: "POST",
    path: "/orders/:id/confirm",
    group: "Buying",
    access: "key",
    scope: "buying",
    summary: "It arrived, all good",
    description: "Confirms the item arrived as described. This releases the held money to the seller, so only call it once you have it.",
    example: { path: "/orders/a71c…/confirm", response: { ...orderExample, buyer: undefined, payout: undefined, status: "completed" } },
    handler: async ({ auth, params }) => {
      const updated = await confirmReceived({ buyerId: auth!.user.id, orderId: idParam.parse(params.id) });
      const row = (await listBuyerOrders(auth!.user.id)).find((r) => r.order.id === updated.id)!;
      return apiOrder(row, "buyer");
    },
  }),

  route({
    method: "POST",
    path: "/checkout",
    group: "Buying",
    access: "key",
    scope: "buying",
    summary: "Get a checkout link",
    description:
      "Paying always happens with a person at the wheel: this gives you the checkout page for a listing (at an accepted offer's price, if you have one) to open in a browser, where the buyer pays with PayPal. Nothing is charged by this call.",
    body: z.object({
      listing: z.string().min(1).describe("The listing id."),
    }),
    example: {
      body: { listing: "8d1e6c2a-…" },
      response: { object: "checkout_link", listing: "8d1e6c2a-…", price: 185, url: "https://resell.store/checkout/8d1e6c2a-…" },
    },
    handler: async ({ auth, body }) => {
      const found = await findBuyableListing(body.listing);
      if (!found) throw new ApiError("not_found", "That listing isn't for sale right now.");
      const accepted = (await listBuyerOffers(auth!.user.id)).find(
        (o) => o.listing.id === found.listing.id && o.status === "accepted",
      );
      return {
        object: "checkout_link",
        listing: found.listing.id,
        price: accepted ? (accepted.offer.counterCents ?? accepted.offer.amountCents) / 100 : found.listing.price,
        offer: accepted?.offer.id ?? null,
        url: siteUrl(`/checkout/${found.listing.id}`),
      };
    },
  }),
];
