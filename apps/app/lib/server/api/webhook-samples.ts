import "server-only";
import {
  and,
  db,
  desc,
  dispute,
  eq,
  inArray,
  isNotNull,
  message,
  offer,
  orders,
  review,
  shop,
  sql,
  thread,
  type WebhookEvent,
} from "@repo/db";
import {
  deliverToSubscription,
  eventBody,
  offerObject,
  orderObject,
  questionObject,
  reviewObject,
  type SubscriptionRow,
} from "./webhooks";

/*
 * Sample events, for setting up a Zap: the resell.store Zapier app asks for
 * them when someone tests a trigger, and "Send a sample" on /tools/api posts
 * one to a pasted Webhooks by Zapier address so Zapier has a request to find.
 *
 * Each is the event we'd really send, built from the seller's most recent
 * matching thing (their latest sale for listing.sold, and so on). With none
 * yet, it's a made-up one in the same shape. Samples carry `test: true`.
 */

const item = {
  id: "8d1e6c2a-5f7b-4a0e-9c3d-2b6f1e0a7c41",
  title: "Yellow Le Creuset dutch oven, 5.5 qt",
  price: 185,
  status: "live",
  photo: null,
  url: "https://maya.broresell.com/yellow-le-creuset-dutch-oven-5-5-qt",
};
const shopRef = { slug: "maya", name: "Maya's closet" };

const offerSample = {
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
  listing: item,
  shop: shopRef,
  buyer: { name: "Jess" },
};

const orderSample = {
  object: "order",
  id: "a71c3e5d-7f9b-4d1e-8c2a-4b6d8f0a2c4e",
  status: "paid",
  item: 170,
  shipping: 18,
  total: 188,
  delivery: "tracked",
  tracking_number: null,
  offer: offerSample.id,
  listing: { ...item, status: "sold" },
  shop: shopRef,
  buyer: { name: "Jess" },
  ship_to: { name: "Jess Park", address: "12 Elm St, Portland, OR 97201", country: "United States" },
  payout: { provider: "paypal", platform_fee: 17, paypal_fee: 6.86, seller_net: 164.14, released_at: null },
  paid_at: "2026-10-02T18:30:00.000Z",
  shipped_at: null,
  delivered_at: null,
  completed_at: null,
};

const shipped = { status: "shipped", tracking_number: "9400 1000 0000 0000 0000 00", shipped_at: "2026-10-03T15:00:00.000Z" };
const completed = {
  ...shipped,
  status: "completed",
  delivered_at: "2026-10-06T12:00:00.000Z",
  completed_at: "2026-10-06T12:05:00.000Z",
  payout: { ...orderSample.payout, released_at: "2026-10-06T12:05:00.000Z" },
};

/** Made-up objects for sellers with nothing real yet. */
const fallback: Record<WebhookEvent, Record<string, unknown>> = {
  "listing.sold": orderSample,
  "offer.received": offerSample,
  "offer.updated": { ...offerSample, status: "accepted", counter: 160, agreed: 160, responded_at: "2026-10-02T19:00:00.000Z" },
  "question.asked": {
    object: "message",
    id: "c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f",
    thread: "91c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e",
    from: "Jess",
    body: "Is the lid included?",
    created_at: "2026-10-02T17:42:00.000Z",
    shop: shopRef,
    listing: { id: item.id, title: item.title, url: item.url },
  },
  "order.completed": { ...orderSample, ...completed },
  "order.problem": { ...orderSample, ...shipped },
  "order.refunded": { ...orderSample, status: "refunded" },
  "payout.sent": { ...orderSample, ...completed },
  "review.created": {
    object: "review",
    id: "5b2e7a9c-1d3f-4b5e-8a7c-9e1f3a5c7e9b",
    order: orderSample.id,
    rating: 5,
    body: "Exactly like the photos, and packed with a little note.",
    public: true,
    from: "Jess",
    created_at: "2026-10-06T10:00:00.000Z",
    reply: null,
    shop: shopRef,
    listing: { id: item.id, title: item.title, url: item.url },
  },
};

type Loaded = { object: unknown } | null;

/** The ids of the seller's most recent things for an event, newest first. */
async function recentIds(sellerId: string, type: WebhookEvent, limit: number): Promise<{ ids: string[]; load: (id: string) => Promise<Loaded> }> {
  const shops = (await db.select({ id: shop.id }).from(shop).where(eq(shop.ownerId, sellerId))).map((s) => s.id);
  if (shops.length === 0) return { ids: [], load: async () => null };
  const pick = (rows: { id: string }[]) => rows.map((r) => r.id);

  if (type === "offer.received" || type === "offer.updated") {
    const rows = await db
      .select({ id: offer.id })
      .from(offer)
      .where(and(inArray(offer.shopId, shops), type === "offer.updated" ? isNotNull(offer.respondedAt) : undefined))
      .orderBy(desc(type === "offer.updated" ? offer.updatedAt : offer.createdAt))
      .limit(limit);
    return { ids: pick(rows), load: offerObject };
  }
  if (type === "question.asked") {
    const rows = await db
      .select({ id: message.id })
      .from(message)
      .innerJoin(thread, eq(thread.id, message.threadId))
      .where(and(inArray(thread.shopId, shops), eq(message.side, "buyer")))
      .orderBy(desc(message.createdAt))
      .limit(limit);
    return { ids: pick(rows), load: questionObject };
  }
  if (type === "review.created") {
    const rows = await db.select({ id: review.id }).from(review).where(inArray(review.shopId, shops)).orderBy(desc(review.createdAt)).limit(limit);
    return { ids: pick(rows), load: reviewObject };
  }
  if (type === "order.problem") {
    const rows = await db
      .select({ id: orders.id })
      .from(dispute)
      .innerJoin(orders, eq(orders.id, dispute.orderId))
      .where(inArray(orders.shopId, shops))
      .orderBy(desc(dispute.createdAt))
      .limit(limit);
    return { ids: [...new Set(pick(rows))], load: orderObject };
  }
  const where = {
    "listing.sold": undefined,
    "order.completed": eq(orders.status, "completed"),
    "order.refunded": inArray(orders.status, ["refunded", "cancelled"]),
    "payout.sent": isNotNull(orders.releasedAt),
  }[type];
  const order = {
    "listing.sold": orders.createdAt,
    "order.completed": orders.completedAt,
    "order.refunded": orders.refundedAt,
    "payout.sent": orders.releasedAt,
  }[type];
  const rows = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(inArray(orders.shopId, shops), where))
    .orderBy(sql`${order} desc nulls last`)
    .limit(limit);
  return { ids: pick(rows), load: orderObject };
}

/** Up to `limit` sample events of one type, newest first; at least one, made up if need be. */
export async function sampleEvents(sellerId: string, type: WebhookEvent, limit = 3) {
  const { ids, load } = await recentIds(sellerId, type, limit);
  const objects = (await Promise.all(ids.map(load))).filter((x): x is { object: unknown } => x !== null).map((x) => x.object);
  const list = objects.length ? objects : [fallback[type]];
  return list.map((object) => {
    const id = (object as { id?: string }).id ?? "sample";
    // A steady id per thing, so Zapier sees the same sample as the same record
    return eventBody(type, object, { test: true, id: `evt_sample_${id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}` });
  });
}

/** Posts the newest sample of `type` (or the subscription's first event) to a subscription. */
export async function sendSample(row: SubscriptionRow, type?: WebhookEvent) {
  const event = type ?? row.events[0] ?? "listing.sold";
  const [sample] = await sampleEvents(row.userId, event, 1);
  const result = await deliverToSubscription(row, event, sample!.data.object, { test: true });
  return { event, ...result };
}
