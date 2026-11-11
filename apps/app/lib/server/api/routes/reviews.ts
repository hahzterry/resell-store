import "server-only";
import { after } from "next/server";
import { z } from "zod";
import { db, eq, listing, shop } from "@repo/db";
import { storeUrl } from "../../../urls";
import { notifyNewReview } from "../../notify-after-sale";
import {
  buyerFirstName,
  leaveReview,
  publicReviews,
  replyToReview,
  reviewForOrder,
  sellerReviews,
  shopRating,
  type PublicReview,
  type ReviewRow,
  type SellerReview,
} from "../../reviews";
import { ApiError, flag, idParam, int, notFound } from "../http";
import { route } from "../router";

/*
 * Reviews over the API (lib/server/reviews.ts): a store's public reviews for
 * anyone, leaving one as the buyer, and the seller's own list with replies.
 * Public responses only ever name the buyer by first name.
 */

const iso = (d: Date | null | undefined) => d?.toISOString() ?? null;

type ApiReviewInput = {
  id: string;
  orderId?: string;
  rating: number;
  body: string | null;
  buyer: string;
  createdAt: Date;
  listing: { id: string; title: string; slug: string | null };
  shop: { slug: string; name: string };
  reply: { body: string; at: Date } | null;
  /** Seller-side only. */
  public?: boolean;
  hiddenAt?: Date | null;
};

/** One review, the same shape everywhere (and in the review.created webhook). */
export function apiReview(r: ApiReviewInput, side: "public" | "seller" = "public") {
  return {
    object: "review" as const,
    id: r.id,
    ...(side === "seller" ? { order: r.orderId ?? null } : {}),
    rating: r.rating,
    body: r.body,
    from: r.buyer,
    created_at: iso(r.createdAt),
    reply: r.reply ? { body: r.reply.body, created_at: iso(r.reply.at) } : null,
    listing: {
      id: r.listing.id,
      title: r.listing.title,
      url: r.listing.slug ? storeUrl(r.shop.slug, `/${r.listing.slug}`) : null,
    },
    shop: { slug: r.shop.slug, name: r.shop.name },
    ...(side === "seller" ? { public: r.public ?? true, hidden: !!r.hiddenAt } : {}),
  };
}

const reviewExample = {
  object: "review",
  id: "5b2e…",
  rating: 5,
  body: "Exactly like the photos, and packed with a little note.",
  from: "Priya",
  created_at: "2026-10-05T10:00:00.000Z",
  reply: { body: "Thank you, Priya! Enjoy it.", created_at: "2026-10-05T12:00:00.000Z" },
  listing: { id: "8d1e6c2a-…", title: "Linen wrap dress", url: "https://maya.broresell.com/linen-wrap-dress" },
  shop: { slug: "maya", name: "Maya's closet" },
};

const sellerExample = { ...reviewExample, order: "a71c…", public: true, hidden: false };

/** A seller-side review by id, or a 404 for someone else's. */
async function sellerReview(sellerId: string, reviewId: string) {
  const found = (await sellerReviews(sellerId)).find((r) => r.id === reviewId);
  if (!found) throw notFound("review");
  return found;
}

/** The buyer's own review on an order, in the seller-side shape (it's theirs). */
async function ownReview(row: ReviewRow, buyerName: string): Promise<SellerReview> {
  const [s] = await db.select({ slug: shop.slug, name: shop.name }).from(shop).where(eq(shop.id, row.shopId));
  const [l] = await db
    .select({ id: listing.id, title: listing.title, name: listing.name, slug: listing.slug })
    .from(listing)
    .where(eq(listing.id, row.listingId));
  return {
    id: row.id,
    orderId: row.orderId,
    rating: row.rating,
    body: row.body,
    buyer: buyerFirstName(buyerName),
    createdAt: row.createdAt,
    listing: { id: row.listingId, title: l?.title ?? l?.name ?? "Untitled", slug: l?.slug ?? null },
    shop: { slug: s?.slug ?? "", name: s?.name ?? "" },
    reply: row.sellerReply ? { body: row.sellerReply, at: row.repliedAt ?? row.updatedAt } : null,
    public: row.public,
    hiddenAt: row.hiddenAt,
  };
}

export const reviewRoutes = [
  route({
    method: "GET",
    path: "/stores/:slug/reviews",
    group: "Marketplace",
    access: "public",
    summary: "Read a store's reviews",
    description:
      "What buyers said about a store, newest first, with the seller's replies. Only people who bought can review, and only public reviews show. No key needed. Pass `next_cursor` back as `cursor` for the next page.",
    query: z.object({
      rating: int(1, 5).optional().describe("Only reviews with this many stars."),
      limit: int(1, 50).default(10).describe("How many to return, 1 to 50. Default 10."),
      cursor: z.string().max(64).optional().describe("`next_cursor` from the page before."),
    }),
    example: {
      path: "/stores/maya/reviews",
      response: { object: "list", rating: { average: 4.8, count: 12 }, data: [reviewExample], next_cursor: "5b2e…", has_more: true },
    },
    handler: async ({ params, query }) => {
      const [s] = await db.select().from(shop).where(eq(shop.slug, params.slug!.toLowerCase()));
      if (!s || s.visibility === "private") throw new ApiError("not_found", "There's no shop at that address.");
      const [page, rating] = await Promise.all([
        publicReviews({ shopId: s.id, rating: query.rating, limit: query.limit, cursor: query.cursor }),
        shopRating(s.id),
      ]);
      return {
        object: "list",
        rating,
        data: page.reviews.map((r: PublicReview) => apiReview(r)),
        next_cursor: page.nextCursor,
        has_more: page.nextCursor !== null,
      };
    },
  }),

  route({
    method: "POST",
    path: "/orders/:id/review",
    group: "Buying",
    access: "key",
    scope: "buying",
    summary: "Review an order",
    description:
      "Once an order is done (the buyer said it's all good, or the check window closed), the buyer can give it 1 to 5 stars and a few words. One review per order. Set `public` to false to send it only to the seller.",
    body: z.object({
      rating: int(1, 5).describe("1 to 5 stars."),
      body: z.string().max(5000).optional().describe("A few words, up to 1,000 characters. Optional."),
      public: flag().default(true).describe("Show it on the shop and the listing. Default true."),
    }),
    example: {
      path: "/orders/a71c…/review",
      body: { rating: 5, body: "Exactly like the photos, and packed with a little note.", public: true },
      response: { ...sellerExample, reply: null },
    },
    handler: async ({ auth, params, body }) => {
      const row = await leaveReview({
        buyerId: auth!.user.id,
        orderId: idParam.parse(params.id),
        rating: body.rating,
        body: body.body,
        public: body.public,
      });
      after(() => notifyNewReview(row.id));
      return apiReview(await ownReview(row, auth!.user.name), "seller");
    },
  }),

  route({
    method: "GET",
    path: "/orders/:id/review",
    group: "Buying",
    access: "key",
    summary: "Get your review of an order",
    description: "The review the buyer left on an order, with the seller's reply. 404 if there isn't one yet.",
    example: { path: "/orders/a71c…/review", response: sellerExample },
    handler: async ({ auth, params }) => {
      const row = await reviewForOrder(idParam.parse(params.id));
      if (!row || row.buyerId !== auth!.user.id) throw new ApiError("not_found", "There's no review on that order yet.");
      return apiReview(await ownReview(row, auth!.user.name), "seller");
    },
  }),

  route({
    method: "GET",
    path: "/reviews",
    group: "Sales",
    access: "key",
    summary: "List reviews of your shops",
    description:
      "Every review on your shops, newest first, including private ones (only you see those) and any resell.store took down (`hidden`).",
    query: z.object({
      shop: z.string().max(64).optional().describe("A shop's slug, to list just that one."),
      limit: int(1, 100).default(25),
      offset: int(0, 100_000).default(0),
    }),
    example: { response: { object: "list", data: [sellerExample], total: 1, has_more: false } },
    handler: async ({ auth, query }) => {
      let shopId: string | undefined;
      if (query.shop) {
        const [s] = await db.select().from(shop).where(eq(shop.slug, query.shop.toLowerCase()));
        if (!s || s.ownerId !== auth!.user.id) throw notFound("shop");
        shopId = s.id;
      }
      const all = await sellerReviews(auth!.user.id, { shopId });
      const data = all.slice(query.offset, query.offset + query.limit).map((r) => apiReview(r, "seller"));
      return { object: "list", data, total: all.length, has_more: query.offset + data.length < all.length };
    },
  }),

  route({
    method: "POST",
    path: "/reviews/:id/reply",
    group: "Sales",
    access: "key",
    scope: "shops",
    summary: "Reply to a review",
    description:
      "Answer a review on one of your shops. It shows under the review. There's one reply per review; sending again changes it.",
    body: z.object({ body: z.string().max(5000).describe("Your reply, up to 1,000 characters.") }),
    example: { path: "/reviews/5b2e…/reply", body: { body: "Thank you, Priya! Enjoy it." }, response: sellerExample },
    handler: async ({ auth, params, body }) => {
      const reviewId = idParam.parse(params.id);
      await replyToReview({ sellerId: auth!.user.id, reviewId, body: body.body });
      return apiReview(await sellerReview(auth!.user.id, reviewId), "seller");
    },
  }),
];
