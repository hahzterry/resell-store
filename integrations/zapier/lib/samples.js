/*
 * What each trigger shows before there's anything real, and the field list
 * Zapier offers until it has seen an event. The same shapes as the API and
 * apps/app lib/server/api/webhook-samples.ts.
 */

const listing = {
  id: "8d1e6c2a-5f7b-4a0e-9c3d-2b6f1e0a7c41",
  title: "Yellow Le Creuset dutch oven, 5.5 qt",
  price: 185,
  status: "live",
  photo: null,
  url: "https://maya.broresell.com/yellow-le-creuset-dutch-oven-5-5-qt",
};
const shop = { slug: "maya", name: "Maya's closet" };

const offer = {
  object: "offer",
  id: "5b0f9a12-3c4d-4e5f-8a6b-7c8d9e0f1a2b",
  status: "open",
  amount: 150,
  counter: null,
  agreed: 150,
  note: "Could pick up this weekend.",
  deposit: null,
  expires_at: "2026-10-04T18:00:00.000Z",
  responded_at: null,
  created_at: "2026-10-02T18:00:00.000Z",
  listing,
  shop,
  buyer: { name: "Jess" },
};

const order = {
  object: "order",
  id: "a71c3e5d-7f9b-4d1e-8c2a-4b6d8f0a2c4e",
  status: "paid",
  item: 170,
  shipping: 18,
  total: 188,
  delivery: "tracked",
  tracking_number: null,
  offer: offer.id,
  listing: { ...listing, status: "sold" },
  shop,
  buyer: { name: "Jess" },
  ship_to: { name: "Jess Park", address: "12 Elm St, Portland, OR 97201", country: "United States" },
  payout: { provider: "paypal", platform_fee: 17, paypal_fee: 6.86, seller_net: 164.14, released_at: null },
  paid_at: "2026-10-02T18:30:00.000Z",
  shipped_at: null,
  delivered_at: null,
  completed_at: null,
};

const completed = {
  ...order,
  status: "completed",
  tracking_number: "9400 1000 0000 0000 0000 00",
  shipped_at: "2026-10-03T15:00:00.000Z",
  delivered_at: "2026-10-06T12:00:00.000Z",
  completed_at: "2026-10-06T12:05:00.000Z",
  payout: { ...order.payout, released_at: "2026-10-06T12:05:00.000Z" },
};

const message = {
  object: "message",
  id: "c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f",
  thread: "91c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e",
  from: "Jess",
  body: "Is the lid included?",
  created_at: "2026-10-02T17:42:00.000Z",
  shop,
  listing: { id: listing.id, title: listing.title, url: listing.url },
};

const review = {
  object: "review",
  id: "5b2e7a9c-1d3f-4b5e-8a7c-9e1f3a5c7e9b",
  order: order.id,
  rating: 5,
  body: "Exactly like the photos, and packed with a little note.",
  public: true,
  from: "Jess",
  created_at: "2026-10-06T10:00:00.000Z",
  reply: null,
  shop,
  listing: { id: listing.id, title: listing.title, url: listing.url },
};

const money = (key, label) => ({ key, label, type: "number" });

/** Labels for the fields people use most; Zapier lists the rest from the sample. */
const fields = {
  offer: [
    { key: "id", label: "Offer ID" },
    { key: "status", label: "Status" },
    money("amount", "Amount offered"),
    money("counter", "Your counter"),
    { key: "note", label: "Buyer's note" },
    { key: "expires_at", label: "Expires at", type: "datetime" },
    { key: "listing__title", label: "Item" },
    money("listing__price", "Item price"),
    { key: "listing__url", label: "Item link" },
    { key: "shop__slug", label: "Shop" },
    { key: "buyer__name", label: "Buyer" },
  ],
  order: [
    { key: "id", label: "Order ID" },
    { key: "status", label: "Status" },
    money("item", "Item price"),
    money("shipping", "Shipping"),
    money("total", "Total paid"),
    money("payout__seller_net", "You get"),
    { key: "listing__title", label: "Item" },
    { key: "listing__url", label: "Item link" },
    { key: "shop__slug", label: "Shop" },
    { key: "buyer__name", label: "Buyer" },
    { key: "ship_to__name", label: "Ship to: name" },
    { key: "ship_to__address", label: "Ship to: address" },
    { key: "ship_to__country", label: "Ship to: country" },
    { key: "tracking_number", label: "Tracking number" },
    { key: "paid_at", label: "Paid at", type: "datetime" },
  ],
  message: [
    { key: "id", label: "Message ID" },
    { key: "from", label: "From" },
    { key: "body", label: "Message" },
    { key: "thread", label: "Conversation ID" },
    { key: "listing__title", label: "Item" },
    { key: "listing__url", label: "Item link" },
    { key: "shop__slug", label: "Shop" },
  ],
  review: [
    { key: "id", label: "Review ID" },
    { key: "rating", label: "Stars", type: "integer" },
    { key: "body", label: "Review" },
    { key: "from", label: "From" },
    { key: "public", label: "Shown on your shop", type: "boolean" },
    { key: "order", label: "Order ID" },
    { key: "listing__title", label: "Item" },
    { key: "shop__slug", label: "Shop" },
  ],
};

/** Added to every event by unwrap() in hooks.js. */
const eventFields = [
  { key: "event_type", label: "Event" },
  { key: "event_id", label: "Event ID" },
  { key: "event_created_at", label: "Happened at", type: "datetime" },
  { key: "test", label: "Is a sample", type: "boolean" },
];

module.exports = { offer, order, completed, message, review, fields, eventFields };
