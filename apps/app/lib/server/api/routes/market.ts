import "server-only";
import { z } from "zod";
import { and, db, eq, listing, ne, shop, user } from "@repo/db";
import { categories } from "../../../mock-market";
import { storeUrl } from "../../../urls";
import { recordActivity } from "../../activity";
import { followerCount, listFollowedShops, setFollowing } from "../../follows";
import { likedListingIds, listLikedListings, setLiked } from "../../likes";
import { coverPhotos } from "../../listings";
import {
  getPublicStore,
  listingDetail,
  listStores,
  parseCategory,
  priceBuckets,
  searchListings,
  sortOrders,
  storeShelf,
  storeSold,
  toPublicListing,
  toPublicStore,
} from "../../market";
import { ApiError, flag, int, notFound, page, pagination } from "../http";
import { route } from "../router";
import { abs, apiPublicListing, apiStore } from "../serialize";

const cardExample = {
  object: "public_listing",
  id: "8d1e6c2a-…",
  slug: "yellow-le-creuset-dutch-oven-5-5-qt",
  store: "maya",
  title: "Yellow Le Creuset dutch oven, 5.5 qt",
  one_liner: "The good one, barely used, ready for soup season",
  price: 185,
  shipping: 18,
  photo: "https://files.resell.store/…",
  category: "Home",
  open_to_offers: true,
  sold: false,
  just_listed: false,
  url: "https://maya.broresell.com/yellow-le-creuset-dutch-oven-5-5-qt",
  seller: { name: "Maya's closet" },
  liked: false,
};

const storeExample = {
  object: "store",
  slug: "maya",
  name: "Maya's closet",
  owner: "Maya",
  tagline: "Clothes and kitchen things I don't use any more",
  about: "Clothes and kitchen things I don't use any more. Ships from Portland.",
  location: "Portland, OR",
  since: "September 2026",
  for_sale: 12,
  sold: 20,
  paused: false,
  picture_url: null,
  url: "https://maya.broresell.com",
  followers: 105,
  following: false,
};

/** Marks which cards the caller has liked, when there's a key. */
async function likedSet(userId: string | undefined) {
  return userId ? new Set(await likedListingIds(userId)) : null;
}

/** A listing anyone may look at: live or sold, in a shop that isn't private. */
async function publicListingRow(id: string) {
  const [row] = await db
    .select({ listing, shop, ownerName: user.name, ownerEmail: user.email })
    .from(listing)
    .innerJoin(shop, eq(shop.id, listing.shopId))
    .innerJoin(user, eq(user.id, shop.ownerId))
    .where(and(eq(listing.id, id), ne(listing.status, "draft"), ne(shop.visibility, "private")));
  if (!row) throw notFound("listing");
  return row;
}

async function storeBySlug(slug: string) {
  const [s] = await db.select().from(shop).where(eq(shop.slug, slug.toLowerCase()));
  if (!s || s.visibility === "private") throw new ApiError("not_found", "There's no shop at that address.");
  return s;
}

export const marketRoutes = [
  route({
    method: "GET",
    path: "/market/search",
    group: "Marketplace",
    access: "public",
    summary: "Search the marketplace",
    description:
      "Search everything for sale on resell.store, by words and by meaning (\"something to cook stew in\" finds dutch ovens). No key needed. With a key, each result says whether you've liked it.",
    query: z.object({
      q: z.string().trim().max(200).optional().describe("What you're looking for. Leave out to browse."),
      category: z.enum(categories as unknown as [string, ...string[]]).optional().describe(`One of: ${categories.join(", ")}.`),
      price: z.enum(priceBuckets).default("any").describe("any, under-25, 25-100 or over-100."),
      offers: flag().optional().describe("Only things open to offers."),
      sort: z.enum(sortOrders).optional().describe("best (with a query), newest, price-asc or price-desc."),
      limit: int(1, 60).default(20),
      offset: pagination.offset,
    }),
    example: {
      query: "q=dutch%20oven&price=over-100",
      response: { object: "search_result", data: [cardExample], total: 3, stores: 2, has_more: true },
    },
    handler: async ({ auth, query }) => {
      const result = await searchListings({
        q: query.q,
        category: parseCategory(query.category),
        price: query.price,
        offers: query.offers,
        sort: query.sort,
        offset: query.offset,
        limit: query.limit,
      });
      const liked = await likedSet(auth?.user.id);
      return {
        object: "search_result",
        data: result.listings.map((l) => apiPublicListing(l, liked ? liked.has(l.id ?? "") : undefined)),
        total: result.total,
        stores: result.stores,
        has_more: query.offset + result.listings.length < result.total,
      };
    },
  }),

  route({
    method: "GET",
    path: "/market/listings/:id",
    group: "Marketplace",
    access: "public",
    summary: "Look at a listing",
    description: "Everything a buyer sees on a listing's page: photos, the seller's description, details and shipping. No key needed.",
    example: {
      path: "/market/listings/8d1e6c2a-…",
      response: {
        ...cardExample,
        description: ["Bought it for a recipe I made twice. No chips, no stains."],
        details: [
          { label: "Brand", value: "Le Creuset" },
          { label: "Condition", value: "Like new" },
          { label: "Offers", value: "Welcome" },
        ],
        photos: [{ url: "https://files.resell.store/…", video: false }],
        listed: "Listed on September 28.",
        store: "maya",
      },
    },
    handler: async ({ auth, params }) => {
      const row = await publicListingRow(params.id!);
      const store = toPublicStore(row.shop, { name: row.ownerName, email: row.ownerEmail }, { forSale: 0, sold: 0 });
      const cover = (await coverPhotos([row.listing.id])).get(row.listing.id);
      const card = toPublicListing(row.listing, row.shop, cover);
      const [detail, liked] = await Promise.all([listingDetail(row.listing, store), likedSet(auth?.user.id)]);
      return {
        ...apiPublicListing(card, liked ? liked.has(row.listing.id) : undefined),
        description: detail.description,
        details: detail.details.map((d) => ({ label: d.label, value: d.value })),
        photos: detail.photos.filter((p) => p.url).map((p) => ({ url: abs(p.url), video: !!p.video })),
        listed: detail.listedNote,
        pickup_only: detail.pickup,
      };
    },
  }),

  route({
    method: "GET",
    path: "/market/stores",
    group: "Marketplace",
    access: "public",
    summary: "Browse stores",
    description: "Every store listed on the marketplace, busiest first. No key needed.",
    query: z.object({ ...pagination }),
    example: { response: { object: "list", data: [{ ...storeExample, followers: undefined, following: undefined }], total: 1, has_more: false } },
    handler: async ({ query }) => page((await listStores()).map((s) => apiStore(s)), query),
  }),

  route({
    method: "GET",
    path: "/market/stores/:slug",
    group: "Marketplace",
    access: "public",
    summary: "Look at a store",
    description:
      "A store, what's on its shelves and what it's sold lately. No key needed; with one, it says whether you follow it.",
    example: {
      path: "/market/stores/maya",
      response: { ...storeExample, listings: [cardExample], recently_sold: [{ title: "Linen wrap dress", price: 24, when: "last week" }] },
    },
    handler: async ({ auth, params }) => {
      const found = await getPublicStore(params.slug!.toLowerCase(), auth?.user.id ?? null);
      if (!found || (found.shop.visibility === "private" && !found.isOwner)) throw new ApiError("not_found", "There's no shop at that address.");
      const [shelf, sold, followers, liked] = await Promise.all([
        storeShelf(found.shop),
        storeSold(found.shop),
        followerCount(found.shop.id),
        likedSet(auth?.user.id),
      ]);
      return {
        ...apiStore(found.store, { followers, ...(auth ? { following: found.following } : {}) }),
        listings: shelf.map((l) => apiPublicListing(l, liked ? liked.has(l.id ?? "") : undefined)),
        recently_sold: sold.map((s) => ({ title: s.title, price: s.price, when: s.when })),
      };
    },
  }),

  /* Likes, follows and shares */

  route({
    method: "PUT",
    path: "/market/listings/:id/like",
    group: "Likes and follows",
    access: "key",
    scope: "buying",
    summary: "Like a listing",
    description: "Saves it to your likes (the heart). Doing it twice is fine.",
    example: { path: "/market/listings/8d1e6c2a-…/like", response: { object: "like", listing: "8d1e6c2a-…", liked: true } },
    handler: async ({ auth, params }) => {
      await setLiked(auth!.user.id, params.id!, true);
      return { object: "like", listing: params.id, liked: true };
    },
  }),

  route({
    method: "DELETE",
    path: "/market/listings/:id/like",
    group: "Likes and follows",
    access: "key",
    scope: "buying",
    summary: "Unlike a listing",
    example: { path: "/market/listings/8d1e6c2a-…/like", response: { object: "like", listing: "8d1e6c2a-…", liked: false } },
    handler: async ({ auth, params }) => {
      await setLiked(auth!.user.id, params.id!, false);
      return { object: "like", listing: params.id, liked: false };
    },
  }),

  route({
    method: "GET",
    path: "/likes",
    group: "Likes and follows",
    access: "key",
    summary: "Your likes",
    description: "Everything you've liked: still for sale first, then sold.",
    query: z.object({ ...pagination }),
    example: { response: { object: "list", data: [{ ...cardExample, liked: true }], total: 1, has_more: false } },
    handler: async ({ auth, query }) => page((await listLikedListings(auth!.user.id)).map((l) => apiPublicListing(l, true)), query),
  }),

  route({
    method: "PUT",
    path: "/market/stores/:slug/follow",
    group: "Likes and follows",
    access: "key",
    scope: "buying",
    summary: "Follow a store",
    description: "New things from stores you follow show on your Home.",
    example: { path: "/market/stores/maya/follow", response: { object: "follow", store: "maya", following: true } },
    handler: async ({ auth, params }) => {
      const s = await storeBySlug(params.slug!);
      await setFollowing(auth!.user.id, s.id, true);
      return { object: "follow", store: s.slug, following: true };
    },
  }),

  route({
    method: "DELETE",
    path: "/market/stores/:slug/follow",
    group: "Likes and follows",
    access: "key",
    scope: "buying",
    summary: "Unfollow a store",
    example: { path: "/market/stores/maya/follow", response: { object: "follow", store: "maya", following: false } },
    handler: async ({ auth, params }) => {
      const [s] = await db.select().from(shop).where(eq(shop.slug, params.slug!.toLowerCase()));
      if (!s) throw new ApiError("not_found", "There's no shop at that address.");
      await setFollowing(auth!.user.id, s.id, false);
      return { object: "follow", store: s.slug, following: false };
    },
  }),

  route({
    method: "GET",
    path: "/following",
    group: "Likes and follows",
    access: "key",
    summary: "Stores you follow",
    description: "Most recently followed first, each with its newest few listings.",
    query: z.object({ ...pagination }),
    example: {
      response: {
        object: "list",
        data: [{ object: "followed_store", slug: "maya", name: "Maya's closet", for_sale: 12, has_new: true, newest: [{ id: "8d1e…", title: "Yellow Le Creuset dutch oven, 5.5 qt", price: 185, url: "https://maya.broresell.com/…" }] }],
        total: 1,
        has_more: false,
      },
    },
    handler: async ({ auth, query }) => {
      const rows = await listFollowedShops(auth!.user.id);
      return page(
        rows.map((s) => ({
          object: "followed_store",
          slug: s.slug,
          name: s.name,
          url: storeUrl(s.slug),
          picture_url: abs(s.picture),
          for_sale: s.forSale,
          has_new: s.hasNew,
          newest: s.newest.map((l) => ({ id: l.id, title: l.title, price: l.price, photo: abs(l.photo), url: storeUrl(s.slug, `/${l.slug}`) })),
        })),
        query,
      );
    },
  }),

  route({
    method: "POST",
    path: "/market/listings/:id/share",
    group: "Likes and follows",
    access: "key",
    scope: "buying",
    summary: "Share a listing",
    description:
      "Gives you the listing's link to share, tagged with where it's going (so the seller's stats can tell), and counts the share.",
    body: z.object({
      channel: z
        .string()
        .trim()
        .toLowerCase()
        .max(30)
        .optional()
        .describe("Where it's going: ig, fb, whatsapp, tiktok, pinterest, x, sms, email… Optional."),
    }),
    example: {
      path: "/market/listings/8d1e6c2a-…/share",
      body: { channel: "whatsapp" },
      response: {
        object: "share",
        listing: "8d1e6c2a-…",
        url: "https://maya.broresell.com/yellow-le-creuset-dutch-oven-5-5-qt?ref=whatsapp",
        text: "Yellow Le Creuset dutch oven, 5.5 qt, $185 at Maya's closet",
      },
    },
    handler: async ({ auth, params, body }) => {
      const row = await publicListingRow(params.id!);
      if (!row.listing.slug) throw notFound("listing");
      await recordActivity({
        kind: "share",
        listingId: row.listing.id,
        visitorId: `api:${auth!.user.id}`,
        userId: auth!.user.id,
        tag: body.channel ?? null,
      });
      const ref = body.channel ? `?ref=${encodeURIComponent(body.channel.replace(/[^a-z0-9_-]/g, ""))}` : "";
      const title = row.listing.title ?? row.listing.name ?? "This";
      const price = row.listing.priceCents != null ? `, $${(row.listing.priceCents / 100).toLocaleString("en-US")}` : "";
      return {
        object: "share",
        listing: row.listing.id,
        url: storeUrl(row.shop.slug, `/${row.listing.slug}${ref}`),
        text: `${title}${price} at ${row.shop.name}`,
      };
    },
  }),
];
