import { z } from "zod";
import { seg } from "./client";
import { limit, listingId, money, offset, slim, tool, type ToolDef } from "./tools";

const ORDER = z.string().min(1).describe("The order id.");

/*
 * The buyer's MCP server: search, look, like, follow, share, message and make
 * offers. Searching and looking work without a key; the rest needs one.
 * Paying always happens in a browser: get_checkout_link gives the page.
 */

export const buyerInstructions = `You're helping someone shop on resell.store, where people sell their own secondhand things from their own little stores.
Use search to find things (it understands plain descriptions like "something to cook stew in"), view_listing for the full story, and view_store to see a seller's shelves.
Prices are in US dollars. Shipping is extra unless it says pickup.
An offer has to be under the asking price, and sellers have 48 hours to answer. Paying happens in the browser: get_checkout_link gives the page to open.
Be honest about what a listing says and doesn't say; if something matters (size, condition), suggest asking the seller with message_shop.`;

type Row = Record<string, unknown> & { listing?: Record<string, unknown> };

const card = (l: Row) => ({
  id: l.id,
  title: l.title,
  price: l.price,
  shipping: l.shipping,
  one_liner: l.one_liner,
  store: l.store,
  open_to_offers: l.open_to_offers,
  sold: l.sold,
  ...(l.liked !== undefined ? { liked: l.liked } : {}),
  url: l.url,
});

const offerRow = (o: Row) => ({
  id: o.id,
  status: o.status,
  amount: o.amount,
  counter: o.counter,
  agreed: o.agreed,
  listing: { id: o.listing?.id, title: o.listing?.title, price: o.listing?.price, url: o.listing?.url },
  shop: (o.shop as { name?: string } | undefined)?.name,
  expires_at: o.expires_at,
});

export const buyerTools: ToolDef[] = [
  /* Looking (no key needed) */
  tool({
    name: "search",
    title: "Search",
    description:
      "Searches everything for sale on resell.store by words and meaning. Filter by category, price band and whether it takes offers.",
    input: z.object({
      q: z.string().max(200).optional().describe("What to look for. Leave out to browse what's new."),
      category: z.enum(["Clothing", "Shoes", "Bags", "Home", "Collectibles", "Books", "Tech", "Kids", "Garden"]).optional(),
      price: z.enum(["any", "under-25", "25-100", "over-100"]).optional(),
      offers: z.boolean().optional().describe("Only things open to offers."),
      sort: z.enum(["best", "newest", "price-asc", "price-desc"]).optional(),
      limit: z.number().int().min(1).max(60).optional(),
      offset,
    }),
    readOnly: true,
    run: async (c, a) => slim(await c.get<{ data: Row[] }>("/market/search", a), card),
  }),
  tool({
    name: "view_listing",
    title: "Look at a listing",
    description: "A listing's full page: description, details like size and condition, photos, shipping and whether it takes offers.",
    input: z.object({ id: listingId }),
    readOnly: true,
    run: (c, a) => c.get(`/market/listings/${seg(a.id)}`),
  }),
  tool({
    name: "browse_stores",
    title: "Browse stores",
    description: "Stores on the marketplace, busiest first.",
    input: z.object({ limit, offset }),
    readOnly: true,
    run: (c, a) => c.get("/market/stores", a),
  }),
  tool({
    name: "view_store",
    title: "Look at a store",
    description: "A store, everything on its shelves and what it sold lately.",
    input: z.object({ store: z.string().describe("The store's slug, e.g. \"maya\" for maya.broresell.com.") }),
    readOnly: true,
    run: async (c, a) => {
      const s = await c.get<Row & { listings: Row[] }>(`/market/stores/${seg(a.store)}`);
      return { ...s, listings: s.listings.map(card) };
    },
  }),

  /* Likes, follows and shares */
  tool({
    name: "like_listing",
    title: "Like",
    description: "Saves a listing to the buyer's likes.",
    input: z.object({ id: listingId }),
    scope: "buying",
    run: (c, a) => c.put(`/market/listings/${seg(a.id)}/like`),
  }),
  tool({
    name: "unlike_listing",
    title: "Unlike",
    description: "Removes a listing from the buyer's likes.",
    input: z.object({ id: listingId }),
    scope: "buying",
    run: (c, a) => c.delete(`/market/listings/${seg(a.id)}/like`),
  }),
  tool({
    name: "my_likes",
    title: "My likes",
    description: "Everything the buyer has liked, still for sale first.",
    input: z.object({ limit, offset }),
    scope: "read",
    readOnly: true,
    run: async (c, a) => slim(await c.get<{ data: Row[] }>("/likes", a), card),
  }),
  tool({
    name: "follow_store",
    title: "Follow a store",
    description: "Follows a store so its new things show on the buyer's Home.",
    input: z.object({ store: z.string().describe("The store's slug.") }),
    scope: "buying",
    run: (c, a) => c.put(`/market/stores/${seg(a.store)}/follow`),
  }),
  tool({
    name: "unfollow_store",
    title: "Unfollow a store",
    description: "Stops following a store.",
    input: z.object({ store: z.string() }),
    scope: "buying",
    run: (c, a) => c.delete(`/market/stores/${seg(a.store)}/follow`),
  }),
  tool({
    name: "stores_i_follow",
    title: "Stores I follow",
    description: "Followed stores with their newest few listings.",
    input: z.object({ limit, offset }),
    scope: "read",
    readOnly: true,
    run: (c, a) => c.get("/following", a),
  }),
  tool({
    name: "share_listing",
    title: "Share a listing",
    description: "Gives a link and a line of text to share a listing, tagged with where it's going.",
    input: z.object({
      id: listingId,
      channel: z.string().max(30).optional().describe("Where it's going: whatsapp, ig, fb, sms, email…"),
    }),
    scope: "buying",
    run: (c, { id, ...rest }) => c.post(`/market/listings/${seg(id)}/share`, rest),
  }),

  /* Offers */
  tool({
    name: "make_offer",
    title: "Make an offer",
    description:
      "Offers a price on a listing that takes offers. It must be under the asking price; the seller has 48 hours to answer. A new offer replaces the buyer's last one on that listing.",
    input: z.object({ listing: listingId, amount: money("The offer"), note: z.string().max(500).optional() }),
    scope: "buying",
    consequential: true,
    confirmMessage: (a) => `Offer $${a.amount} on this listing?`,
    run: async (c, a) => offerRow(await c.post<Row>("/offers", a)),
  }),
  tool({
    name: "my_offers",
    title: "My offers",
    description: "Offers the buyer has made and where each stands. \"countered\" means the seller named a price; \"accepted\" means it's ready to pay.",
    input: z.object({
      status: z.enum(["open", "countered", "accepted", "declined", "withdrawn", "expired", "paid"]).optional(),
      limit,
      offset,
    }),
    scope: "read",
    readOnly: true,
    run: async (c, a) => slim(await c.get<{ data: Row[] }>("/offers", { role: "buyer", ...a }), offerRow),
  }),
  tool({
    name: "answer_counter",
    title: "Answer a counter",
    description: "Takes or turns down the seller's counter. Taking it gives 48 hours to pay (see get_checkout_link).",
    input: z.object({ id: z.string().min(1).describe("The offer id."), accept: z.boolean() }),
    scope: "buying",
    consequential: true,
    confirmMessage: (a) => (a.accept ? "Take the seller's counter?" : "Turn down the seller's counter?"),
    run: async (c, a) => offerRow(await c.post<Row>(`/offers/${seg(a.id)}/${a.accept ? "accept-counter" : "decline-counter"}`)),
  }),
  tool({
    name: "withdraw_offer",
    title: "Withdraw an offer",
    description: "Takes back an offer that's still open or countered.",
    input: z.object({ id: z.string().min(1).describe("The offer id.") }),
    scope: "buying",
    run: async (c, a) => offerRow(await c.post<Row>(`/offers/${seg(a.id)}/withdraw`)),
  }),

  /* Messages */
  tool({
    name: "message_shop",
    title: "Message a shop",
    description: "Writes to a store, about one of its listings or in general. Good for questions about size, condition or pickup.",
    input: z.object({
      store: z.string().describe("The store's slug."),
      listing: z.string().optional().describe("A listing id, if it's about one."),
      body: z.string().min(1).max(2000),
    }),
    scope: "buying",
    run: (c, a) => c.post("/threads", { shop: a.store, listing: a.listing, body: a.body }),
  }),
  tool({
    name: "my_conversations",
    title: "My conversations",
    description: "Conversations with stores, newest first.",
    input: z.object({ unread: z.boolean().optional(), limit, offset }),
    scope: "read",
    readOnly: true,
    run: (c, a) => c.get("/threads", { role: "buyer", ...a }),
  }),
  tool({
    name: "read_conversation",
    title: "Read a conversation",
    description: "The whole conversation with a store, oldest first.",
    input: z.object({ id: z.string().min(1) }),
    scope: "read",
    readOnly: true,
    run: (c, a) => c.get(`/threads/${seg(a.id)}`),
  }),
  tool({
    name: "reply",
    title: "Reply",
    description: "Replies in a conversation with a store.",
    input: z.object({ id: z.string().min(1).describe("The conversation id."), body: z.string().min(1).max(2000) }),
    scope: "messages",
    run: (c, a) => c.post(`/threads/${seg(a.id)}/messages`, { body: a.body }),
  }),

  /* Buying */
  tool({
    name: "get_checkout_link",
    title: "Checkout link",
    description:
      "The checkout page for a listing, at an accepted offer's price if there is one. Give the link to the buyer to pay in their browser; nothing is charged here.",
    input: z.object({ listing: listingId }),
    scope: "buying",
    run: (c, a) => c.post("/checkout", a),
  }),
  tool({
    name: "my_orders",
    title: "My orders",
    description: "Things the buyer bought and where each one is (paid, shipped, completed), with tracking numbers.",
    input: z.object({ limit, offset }),
    scope: "read",
    readOnly: true,
    run: (c, a) => c.get("/orders", a),
  }),
  tool({
    name: "confirm_delivery",
    title: "It arrived, all good",
    description:
      "Confirms an order arrived as described, which releases the payment to the seller. Only when the buyer says they have it and it's as described.",
    input: z.object({ id: z.string().min(1).describe("The order id.") }),
    scope: "buying",
    destructive: true,
    consequential: true,
    confirmMessage: () => "It arrived and it's all good? This pays the seller.",
    run: (c, a) => c.post(`/orders/${seg(a.id)}/confirm`),
  }),

  /* When something goes wrong */
  tool({
    name: "cancel_order",
    title: "Cancel an order that hasn't shipped",
    description:
      "Calls off an order the seller didn't ship by the ship-by date (3 days after paying); the buyer gets everything back. Refused before that date.",
    input: z.object({ id: ORDER }),
    scope: "buying",
    destructive: true,
    consequential: true,
    confirmMessage: () => "Cancel this order and get a full refund?",
    run: (c, a) => c.post(`/orders/${seg(a.id)}/cancel`),
  }),
  tool({
    name: "report_problem",
    title: "Report a problem with an order",
    description:
      "For an order that's shipped: it hasn't arrived, isn't as described, or arrived damaged. The seller is told and isn't paid until it's sorted. Use the buyer's own words for details.",
    input: z.object({
      id: ORDER,
      reason: z.enum(["not_arrived", "not_as_described", "damaged", "other"]),
      details: z.string().min(1).max(2000).describe("What's wrong, in the buyer's words. The seller reads this."),
    }),
    scope: "buying",
    consequential: true,
    confirmMessage: () => "Report this problem to the seller? Their payment stays on hold until it's sorted.",
    run: (c, { id, ...rest }) => c.post(`/orders/${seg(id)}/problem`, rest),
  }),
  tool({
    name: "get_problem",
    title: "See a problem with an order",
    description: "The latest problem on an order and everything both sides said, including any refund the seller offered.",
    input: z.object({ id: ORDER }),
    scope: "read",
    readOnly: true,
    run: (c, a) => c.get(`/orders/${seg(a.id)}/problem`),
  }),
  tool({
    name: "reply_about_problem",
    title: "Reply about a problem",
    description: "Adds a message to an open problem. The seller is emailed.",
    input: z.object({ id: ORDER, body: z.string().min(1).max(2000) }),
    scope: "buying",
    run: (c, { id, ...rest }) => c.post(`/orders/${seg(id)}/problem/reply`, rest),
  }),
  tool({
    name: "answer_refund_offer",
    title: "Answer a refund offer",
    description:
      "Takes the part refund the seller offered (the rest goes to them and the order is done) or turns it down so the problem stays open.",
    input: z.object({ id: ORDER, accept: z.boolean() }),
    scope: "buying",
    consequential: true,
    confirmMessage: (a) => (a.accept ? "Take the seller's refund offer? That wraps up the order." : "Turn down the refund offer?"),
    run: (c, { id, ...rest }) => c.post(`/orders/${seg(id)}/problem/answer`, rest),
  }),
  tool({
    name: "problem_sorted",
    title: "Say a problem is sorted",
    description: "Closes an open problem without a refund; the seller is paid as normal.",
    input: z.object({ id: ORDER }),
    scope: "buying",
    consequential: true,
    confirmMessage: () => "Close the problem? The seller gets paid as normal.",
    run: (c, a) => c.post(`/orders/${seg(a.id)}/problem/close`),
  }),
  tool({
    name: "escalate_problem",
    title: "Ask resell.store to step in",
    description: "Hands an open problem to resell.store to decide. The money stays held until then.",
    input: z.object({ id: ORDER, note: z.string().max(2000).optional() }),
    scope: "buying",
    consequential: true,
    run: (c, { id, ...rest }) => c.post(`/orders/${seg(id)}/problem/escalate`, rest),
  }),

  /* Reviews */
  tool({
    name: "leave_review",
    title: "Review an order",
    description:
      "1 to 5 stars and a few words, once an order is done. Public reviews show on the shop and listing; private ones only reach the seller. Only with the buyer's own rating and words.",
    input: z.object({
      id: ORDER,
      rating: z.number().int().min(1).max(5),
      body: z.string().max(1000).optional(),
      public: z.boolean().optional().describe("Show it on the shop (default true)."),
    }),
    scope: "buying",
    consequential: true,
    confirmMessage: (a) => `Post a ${a.rating}-star review?`,
    run: (c, { id, ...rest }) => c.post(`/orders/${seg(id)}/review`, rest),
  }),
  tool({
    name: "store_reviews",
    title: "Read a store's reviews",
    description: "Public reviews of a store, newest first, with its average rating.",
    input: z.object({ store: z.string().min(1).describe("The store's slug."), rating: z.number().int().min(1).max(5).optional() }),
    readOnly: true,
    run: (c, { store, ...rest }) => c.get(`/stores/${seg(store)}/reviews`, rest),
  }),
];
