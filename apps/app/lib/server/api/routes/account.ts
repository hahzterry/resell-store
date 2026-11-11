import "server-only";
import { z } from "zod";
import { countUnread } from "../../messages";
import { listBuyerOffers, listSellerOffers, listSellerOrders } from "../../commerce";
import { listOwnedShops } from "../../shops";
import { MONTHLY_LIMIT, monthUsage } from "../keys";
import { apiOffer, apiOrder, apiShop } from "../serialize";
import { route } from "../router";

const group = "Account";

export const accountRoutes = [
  route({
    method: "GET",
    path: "/me",
    group,
    access: "key",
    summary: "Who this key belongs to",
    description:
      "The person behind the key, what the key may do, their shops and how many requests they've made this month. A good first call to check a key works.",
    example: {
      response: {
        object: "account",
        id: "usr_7Qm2",
        name: "Maya Rivera",
        email: "maya@example.com",
        key: { kind: "api", scopes: ["read", "shops", "listings", "messages", "offers", "orders", "buying", "webhooks"], ask_first: [], max_offer: null },
        shops: [{ object: "shop", slug: "maya", name: "Maya's closet", url: "https://maya.broresell.com" }],
        usage: { requests: 1240, limit: 10000 },
      },
    },
    handler: async ({ auth }) => {
      const a = auth!;
      const [shops, used] = await Promise.all([listOwnedShops(a.user.id), monthUsage(a.user.id)]);
      return {
        object: "account",
        id: a.user.id,
        name: a.user.name,
        email: a.user.email,
        key: {
          kind: a.key.kind,
          scopes: a.key.scopes,
          ask_first: a.key.askFirst,
          /** Agent links: the most it may offer or agree to for one thing, in dollars. */
          max_offer: a.key.maxOfferCents === null ? null : a.key.maxOfferCents / 100,
        },
        shops: shops.map(apiShop),
        usage: { requests: used, limit: MONTHLY_LIMIT },
      };
    },
  }),

  route({
    method: "GET",
    path: "/inbox",
    group,
    access: "key",
    summary: "What needs you",
    description:
      "Everything waiting on you right now, across all your shops: offers to answer, sales to ship and unread messages from buyers, plus counters waiting on you as a buyer. The same list as the badge in the app.",
    query: z.object({}),
    example: {
      response: {
        object: "inbox",
        offers_to_answer: [{ object: "offer", id: "off_1", status: "open", amount: 150, listing: { title: "Yellow dutch oven, 5.5 qt" } }],
        sales_to_ship: [],
        unread_threads: 2,
        counters_to_answer: [],
        unread_as_buyer: 0,
      },
    },
    handler: async ({ auth }) => {
      const id = auth!.user.id;
      const [offers, sales, unread, buyerOffers, unreadBuyer] = await Promise.all([
        listSellerOffers(id),
        listSellerOrders(id),
        countUnread(id, "seller"),
        listBuyerOffers(id),
        countUnread(id, "buyer"),
      ]);
      return {
        object: "inbox",
        offers_to_answer: offers.filter((o) => o.status === "open").map(apiOffer),
        sales_to_ship: sales.filter((s) => s.order.status === "paid").map((s) => apiOrder(s, "seller")),
        unread_threads: unread,
        counters_to_answer: buyerOffers.filter((o) => o.status === "countered").map(apiOffer),
        accepted_to_pay: buyerOffers.filter((o) => o.status === "accepted").map(apiOffer),
        unread_as_buyer: unreadBuyer,
      };
    },
  }),
];
