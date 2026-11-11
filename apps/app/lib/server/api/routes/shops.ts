import "server-only";
import { z } from "zod";
import { and, db, eq, shop } from "@repo/db";
import { demoEnabled, demoPublicBlocked } from "../../demo";
import { deleteFiles } from "../../files";
import { checkSlug, getOwnedShop, listOwnedShops, shopFileIds } from "../../shops";
import { shopMiniStats } from "../../stats";
import { ApiError, flag, int, notFound } from "../http";
import { route } from "../router";
import { apiShop } from "../serialize";

const group = "Shops";

const tones = ["lemon", "mint", "pink", "leaf", "blush"] as const;
const visibilities = ["public", "link", "private"] as const;

const slugError = {
  taken: "Someone has that link. Try another.",
  invalid: "Links use lowercase letters, numbers and dashes, and can't start or end with a dash.",
};

function isUniqueViolation(error: unknown) {
  const e = error as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23505" || e?.cause?.code === "23505";
}

async function ownedShop(userId: string, slug: string) {
  const row = await getOwnedShop(userId, slug.toLowerCase());
  if (!row) throw notFound("shop");
  return row;
}

const shopExample = {
  object: "shop",
  id: "c0a8…",
  slug: "maya",
  name: "Maya's closet",
  about: "Clothes and kitchen things I don't use any more.",
  category: "Clothes",
  location: "Portland, OR",
  tone: "lemon",
  visibility: "public",
  paused: false,
  url: "https://maya.broresell.com",
  picture_url: null,
  agent: { answer_questions: true, haggle: true, lowest_percent: 15, ask_hold: true },
  counts: { live: 12, drafts: 2, sold: 20 },
  created_at: "2026-09-03T17:20:00.000Z",
};

const updateBody = z.object({
  name: z.string().trim().min(1).max(60).optional().describe("Shown at the top of the store."),
  slug: z.string().trim().toLowerCase().min(1).max(32).optional().describe("The subdomain: {slug}.resell.store. Changing it moves the store."),
  about: z.string().trim().max(300).nullish().describe("A line or two about the shop."),
  category: z.string().trim().max(40).nullish(),
  location: z.string().trim().max(80).nullish().describe("Where things ship from, e.g. \"Portland, OR\"."),
  tone: z.enum(tones).optional().describe("The shop's colour."),
  visibility: z.enum(visibilities).optional().describe("public: listed on the marketplace. link: only people with the link. private: only you."),
  paused: flag().optional().describe("Hides the shop and keeps everything."),
  answer_questions: flag().optional().describe("Let the shop's agent answer buyers' questions."),
  haggle: flag().optional().describe("Let the shop's agent haggle on offers."),
  lowest_percent: int(0, 90).optional().describe("Lowest the agent will go, as % off the price."),
  ask_hold: flag().optional().describe("Ask for a deposit to hold an item."),
});

export const shopRoutes = [
  route({
    method: "GET",
    path: "/shops",
    group,
    access: "key",
    summary: "List your shops",
    description: "Every shop you own, oldest first, with how many listings are live, drafts and sold.",
    example: { response: { object: "list", data: [shopExample], total: 1, has_more: false } },
    handler: async ({ auth }) => {
      const shops = await listOwnedShops(auth!.user.id);
      return { object: "list", data: shops.map(apiShop), total: shops.length, has_more: false };
    },
  }),

  route({
    method: "POST",
    path: "/shops",
    group,
    access: "key",
    scope: "shops",
    summary: "Open a shop",
    description: "Opens a new shop at {slug}.resell.store. Slugs are unique across resell.store.",
    body: z.object({
      name: z.string().trim().min(1, "Give the shop a name.").max(60),
      slug: z.string().trim().toLowerCase().min(1).max(32).describe("The subdomain, e.g. \"maya\" for maya.broresell.com."),
      category: z.string().trim().max(40).optional(),
      about: z.string().trim().max(300).optional(),
      tone: z.enum(tones).default("lemon"),
      visibility: z.enum(visibilities).default("public"),
    }),
    example: {
      body: { name: "Maya's kitchen", slug: "maya-kitchen", category: "Home", visibility: "public" },
      response: { ...shopExample, slug: "maya-kitchen", name: "Maya's kitchen", url: "https://maya-kitchen.resell.store" },
    },
    handler: async ({ auth, body }) => {
      // The default is public, so a client that didn't ask gets link-only during the demo
      const visibility = demoEnabled && body.visibility === "public" ? "link" : body.visibility;
      const link = await checkSlug(body.slug);
      if (link !== "free") throw new ApiError("invalid_request", slugError[link], "slug");
      try {
        const [row] = await db
          .insert(shop)
          .values({
            ownerId: auth!.user.id,
            slug: body.slug,
            name: body.name,
            category: body.category || null,
            about: body.about || null,
            tone: body.tone,
            visibility,
          })
          .returning();
        return apiShop(row!);
      } catch (error) {
        if (isUniqueViolation(error)) throw new ApiError("conflict", slugError.taken, "slug");
        throw error;
      }
    },
  }),

  route({
    method: "GET",
    path: "/shops/:slug",
    group,
    access: "key",
    summary: "Get a shop",
    description: "One of your shops by its slug, with this week's numbers.",
    example: {
      path: "/shops/maya",
      response: { ...shopExample, stats: { views: 1606, views_7d: 214, followers: 105, likes: 48, shares: 9, offers_waiting: 2 } },
    },
    handler: async ({ auth, params }) => {
      const row = await ownedShop(auth!.user.id, params.slug!);
      const stats = await shopMiniStats(row.id);
      return {
        ...apiShop(row),
        stats: {
          views: stats.views,
          views_7d: stats.views7d,
          followers: stats.followers,
          likes: stats.likes,
          shares: stats.shares,
          offers_waiting: stats.offersWaiting,
        },
      };
    },
  }),

  route({
    method: "PATCH",
    path: "/shops/:slug",
    group,
    access: "key",
    scope: "shops",
    summary: "Change a shop",
    description: "Change any of the shop's settings. Send only what changes. A new `slug` moves the store to a new address.",
    body: updateBody,
    example: {
      path: "/shops/maya",
      body: { about: "Clothes, shoes and a few kitchen things.", haggle: true, lowest_percent: 20 },
      response: shopExample,
    },
    handler: async ({ auth, params, body }) => {
      const row = await ownedShop(auth!.user.id, params.slug!);
      const closed = demoPublicBlocked(body.visibility, row.visibility);
      if (closed) throw new ApiError("invalid_request", closed, "visibility");
      if (body.slug && body.slug !== row.slug) {
        const link = await checkSlug(body.slug, row.id);
        if (link !== "free") throw new ApiError("invalid_request", slugError[link], "slug");
      }
      const patch: Partial<typeof shop.$inferInsert> = {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.about !== undefined && { about: body.about || null }),
        ...(body.category !== undefined && { category: body.category || null }),
        ...(body.location !== undefined && { location: body.location || null }),
        ...(body.tone !== undefined && { tone: body.tone }),
        ...(body.visibility !== undefined && { visibility: body.visibility }),
        ...(body.paused !== undefined && { paused: body.paused }),
        ...(body.answer_questions !== undefined && { answerQuestions: body.answer_questions }),
        ...(body.haggle !== undefined && { haggle: body.haggle }),
        ...(body.lowest_percent !== undefined && { lowestPercent: body.lowest_percent }),
        ...(body.ask_hold !== undefined && { askHold: body.ask_hold }),
      };
      if (Object.keys(patch).length === 0) return apiShop(row);
      try {
        const [saved] = await db
          .update(shop)
          .set(patch)
          .where(and(eq(shop.id, row.id), eq(shop.ownerId, auth!.user.id)))
          .returning();
        return apiShop(saved!);
      } catch (error) {
        if (isUniqueViolation(error)) throw new ApiError("conflict", slugError.taken, "slug");
        throw error;
      }
    },
  }),

  route({
    method: "DELETE",
    path: "/shops/:slug",
    group,
    access: "key",
    scope: "shops",
    summary: "Delete a shop",
    description:
      "Deletes the shop, its listings and their photos. This can't be undone. A shop with sales can't be deleted (the orders keep a record of it); pause it instead.",
    example: { path: "/shops/maya-kitchen", response: { object: "shop", slug: "maya-kitchen", deleted: true } },
    handler: async ({ auth, params }) => {
      const row = await ownedShop(auth!.user.id, params.slug!);
      const files = await shopFileIds(row.id);
      try {
        await db.delete(shop).where(and(eq(shop.id, row.id), eq(shop.ownerId, auth!.user.id)));
      } catch (error) {
        const e = error as { code?: string; cause?: { code?: string } };
        if (e.code === "23503" || e.cause?.code === "23503")
          throw new ApiError("conflict", "This shop has sales on record, so it can't be deleted. Pause it instead.");
        throw error;
      }
      await deleteFiles(files);
      return { object: "shop", slug: row.slug, deleted: true };
    },
  }),
];
