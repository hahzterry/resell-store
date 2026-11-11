import "server-only";
import { after } from "next/server";
import { z } from "zod";
import { and, asc, db, desc, eq, inArray, listing, listingPhoto, shop, user } from "@repo/db";
import { toCents } from "../../../money";
import { deleteFiles, saveUpload } from "../../files";
import {
  addPhotoRows,
  coverPhotos,
  createDraft,
  getOwnedListing,
  isOwnPhoto,
  listPhotoRows,
  listPhotos,
  maxPhotos,
  publishListing,
  refreshEmbedding,
  savePhotoOrder,
  setField,
  updateListing,
  type ListingRow,
} from "../../listings";
import { latestRun, runResearch, startResearch } from "../../research";
import { listOwnedShops } from "../../shops";
import { listingStats } from "../../stats";
import { generateWords, tones } from "../../words";
import { ApiError, flag, idParam, money, notFound, pagination, stringList } from "../http";
import { route } from "../router";
import { apiListing, apiPhoto } from "../serialize";

const group = "Listings";

async function owned(userId: string, id: string) {
  const row = await getOwnedListing(userId, idParam.parse(id));
  if (!row) throw notFound("listing");
  return row;
}

/** The shop to put a new listing in: the one named, or the person's first. */
async function targetShop(userId: string, slug?: string) {
  const shops = await listOwnedShops(userId);
  if (shops.length === 0) throw new ApiError("invalid_request", "Open a shop first (POST /v1/shops).");
  if (!slug) return shops[0]!;
  const found = shops.find((s) => s.slug === slug.toLowerCase());
  if (!found) throw new ApiError("invalid_request", `You don't have a shop called "${slug}".`, "shop");
  return found;
}

/** What's missing before a listing can go live, or null. */
function missing(row: Pick<ListingRow, "title" | "priceCents">) {
  if (!row.title?.trim() && row.priceCents == null) return "It needs a title and a price first.";
  if (!row.title?.trim()) return "It needs a title first.";
  if (row.priceCents == null) return "It needs a price first.";
  return null;
}

async function full(row: ListingRow, s: { slug: string }) {
  const [photos, stats] = await Promise.all([listPhotos(row.id), listingStats([row.id])]);
  return apiListing(row, s, { photos, stats: stats.get(row.id) });
}

function fieldKey(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "field";
}

/** `{ "Brand": "Le Creuset" }` or `[{ label, value }]` onto the listing's fields. */
function applyFields(current: ListingRow["fields"], input: Record<string, string> | { label: string; value: string }[]) {
  const pairs = Array.isArray(input) ? input.map((f) => [f.label, f.value] as const) : Object.entries(input);
  let fields = current;
  for (const [label, value] of pairs) {
    if (!label.trim() || !String(value).trim()) continue;
    fields = setField(fields, fieldKey(label), String(value).trim().slice(0, 200), label.trim().slice(0, 40));
  }
  return fields;
}

/** Private and loopback hosts can't be fetched for photos. */
function isPublicHttpUrl(raw: string) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local")) return false;
    if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return false;
    if (h.startsWith("[") || h === "::1") return false;
    return true;
  } catch {
    return false;
  }
}

/** Downloads a picture and keeps our own copy, so listings never hotlink. */
async function fetchPhoto(url: string, ownerId: string) {
  if (!isPublicHttpUrl(url)) throw new ApiError("invalid_request", `Photo URLs need to be public http(s) links: ${url}`, "photo_urls");
  let res: Response;
  try {
    res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15_000) });
  } catch {
    throw new ApiError("invalid_request", `We couldn't download ${url}.`, "photo_urls");
  }
  const type = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  if (!res.ok || !type.startsWith("image/"))
    throw new ApiError("invalid_request", `${url} isn't a picture we can use (${res.status} ${type || "unknown type"}).`, "photo_urls");
  const bytes = await res.arrayBuffer();
  const name = new URL(url).pathname.split("/").pop() || "photo";
  return saveUpload(new File([bytes], name, { type }), ownerId);
}

async function addPhotosFromUrls(listingId: string, ownerId: string, urls: string[], alt?: string | null) {
  const existing = await listPhotoRows(listingId);
  if (existing.filter((p) => !p.isVideo).length + urls.length > maxPhotos)
    throw new ApiError("invalid_request", `A listing holds up to ${maxPhotos} photos.`, "photo_urls");
  const saved: { id: string; isVideo: boolean }[] = [];
  try {
    for (const url of urls) saved.push(await fetchPhoto(url, ownerId));
  } catch (error) {
    await deleteFiles(saved.map((s) => s.id));
    throw error;
  }
  await addPhotoRows(listingId, saved.map((s) => ({ fileId: s.id, isVideo: s.isVideo, alt: alt ?? null })));
}

async function research(listingId: string) {
  const run = await startResearch(listingId);
  if (run.started) after(() => runResearch(run.id));
  return run;
}

const editable = {
  title: z.string().trim().min(1).max(80).nullish().describe("Up to 80 characters. What it is first: brand, item, key detail."),
  one_liner: z.string().trim().max(120).nullish().describe("One line under the title, up to 120 characters."),
  description: z.string().trim().max(5000).nullish(),
  category: z.string().trim().max(60).nullish(),
  price: money().nullish().describe("The asking price in dollars."),
  lowest_price: money().nullish().describe("The private floor the shop's agent won't go under. Never shown to buyers."),
  shipping: money().nullish().describe("Shipping in dollars. 0 means pickup only."),
  take_offers: flag().optional().describe("Whether buyers can make offers. Default true."),
  visibility: z.enum(["everyone", "link"]).optional().describe("everyone: in search and on the store. link: only people with the link."),
  fields: z
    .union([z.record(z.string(), z.string()), z.array(z.object({ label: z.string(), value: z.string() }))])
    .optional()
    .describe("Details like brand, size and condition, as { \"Label\": \"value\" }. Merged into what's there."),
};

function patchFrom(row: ListingRow, body: Partial<Record<keyof typeof editable, unknown>> & Record<string, unknown>) {
  const b = body as {
    title?: string | null;
    one_liner?: string | null;
    description?: string | null;
    category?: string | null;
    price?: number | null;
    lowest_price?: number | null;
    shipping?: number | null;
    take_offers?: boolean;
    visibility?: "everyone" | "link";
    fields?: Record<string, string> | { label: string; value: string }[];
  };
  const patch: Partial<typeof listing.$inferInsert> = {};
  if (b.title !== undefined) patch.title = b.title || null;
  if (b.one_liner !== undefined) patch.oneLiner = b.one_liner || null;
  if (b.description !== undefined) patch.description = b.description || null;
  if (b.category !== undefined) patch.category = b.category || null;
  if (b.price !== undefined) patch.priceCents = b.price == null ? null : toCents(b.price);
  if (b.lowest_price !== undefined) patch.lowestCents = b.lowest_price == null ? null : toCents(b.lowest_price);
  if (b.shipping !== undefined) patch.shippingCents = b.shipping == null ? null : toCents(b.shipping);
  if (b.take_offers !== undefined) patch.takeOffers = b.take_offers;
  if (b.visibility !== undefined) patch.visibility = b.visibility;
  if (b.fields !== undefined) patch.fields = applyFields(row.fields, b.fields);
  // The floor can't sit above the price
  const price = patch.priceCents !== undefined ? patch.priceCents : row.priceCents;
  const lowest = patch.lowestCents !== undefined ? patch.lowestCents : row.lowestCents;
  if (price != null && lowest != null && lowest > price) patch.lowestCents = price;
  if (patch.priceCents === 0) throw new ApiError("invalid_request", "The price has to be at least $1.", "price");
  return patch;
}

const listingExample = {
  object: "listing",
  id: "8d1e6c2a-…",
  shop: "maya",
  status: "live",
  visibility: "everyone",
  step: "publish",
  name: "Le Creuset dutch oven",
  title: "Yellow Le Creuset dutch oven, 5.5 qt",
  one_liner: "The good one, barely used, ready for soup season",
  description: "Bought it for a recipe I made twice. No chips…",
  category: "Kitchen",
  price: 185,
  lowest_price: 160,
  shipping: 18,
  take_offers: true,
  fields: [
    { key: "brand", label: "Brand", value: "Le Creuset", source: "agent" },
    { key: "condition", label: "Condition", value: "Like new", source: "you" },
  ],
  photos: [{ id: "3f…", url: "https://files.resell.store/…", alt: null, source: null, is_video: false }],
  url: "https://maya.broresell.com/yellow-le-creuset-dutch-oven-5-5-qt",
  edit_url: "https://resell.store/listings/8d1e6c2a-…",
  stats: { views: 214, views_7d: 61, likes: 12, shares: 3, offers: 2, offers_waiting: 1 },
  research: {
    identified: "Le Creuset Signature round dutch oven, 5.5 qt, Soleil",
    category: "Kitchen",
    confidence: "high",
    suggested_price: 185,
    price_range: { low: 160, high: 210 },
    summary: "Sells quickly between $160 and $210 in this colour.",
  },
  published_at: "2026-09-28T16:02:11.000Z",
  sold_at: null,
  created_at: "2026-09-28T15:40:00.000Z",
  updated_at: "2026-09-28T16:02:11.000Z",
};

export const listingRoutes = [
  route({
    method: "GET",
    path: "/listings",
    group,
    access: "key",
    summary: "List your listings",
    description: "Listings across your shops, most recently changed first. Filter by shop or status.",
    query: z.object({
      shop: z.string().optional().describe("A shop slug. Leave out for every shop."),
      status: z.enum(["draft", "live", "sold"]).optional(),
      ...pagination,
    }),
    example: { query: "status=live&limit=2", response: { object: "list", data: [listingExample], total: 12, has_more: true } },
    handler: async ({ auth, query }) => {
      const shops = await listOwnedShops(auth!.user.id);
      const ids = (query.shop ? shops.filter((s) => s.slug === query.shop!.toLowerCase()) : shops).map((s) => s.id);
      if (ids.length === 0) return { object: "list", data: [], total: 0, has_more: false };
      const where = and(inArray(listing.shopId, ids), query.status ? eq(listing.status, query.status) : undefined);
      const [rows, [count]] = await Promise.all([
        db
          .select({ listing, slug: shop.slug })
          .from(listing)
          .innerJoin(shop, eq(shop.id, listing.shopId))
          .where(where)
          .orderBy(desc(listing.updatedAt), asc(listing.id))
          .limit(query.limit)
          .offset(query.offset),
        db.$count(listing, where).then((n) => [n]),
      ]);
      const [covers, stats] = await Promise.all([
        coverPhotos(rows.map((r) => r.listing.id)),
        listingStats(rows.map((r) => r.listing.id)),
      ]);
      const data = rows.map((r) =>
        apiListing(r.listing, { slug: r.slug }, { cover: covers.get(r.listing.id) ?? null, stats: stats.get(r.listing.id) }),
      );
      return { object: "list", data, total: count ?? 0, has_more: query.offset + data.length < (count ?? 0) };
    },
  }),

  route({
    method: "POST",
    path: "/listings",
    group,
    access: "key",
    scope: "listings",
    summary: "Make a listing",
    description:
      "Makes a draft in one of your shops. Give it what you know: a `prompt` (\"yellow le creuset dutch oven, 5.5 qt, used twice\") is enough for the research agent to work out the rest; or set the title, price and details yourself. Add `research: true` to look it up and suggest a price (poll GET /listings/:id/research). Add `publish: true` to put it live straight away, if it has a title and a price.",
    body: z.object({
      shop: z.string().optional().describe("A shop slug. Defaults to your first shop."),
      prompt: z.string().trim().max(500).optional().describe("What it is, in your words. The research agent starts from this."),
      ...editable,
      photo_urls: stringList(maxPhotos).optional().describe("Public picture URLs. We download and keep a copy of each."),
      research: flag().default(false).describe("Look it up and suggest a price, in the background."),
      publish: flag().default(false).describe("Put it live now. Needs a title and a price."),
    }),
    example: {
      body: {
        shop: "maya",
        title: "Yellow Le Creuset dutch oven, 5.5 qt",
        price: 185,
        lowest_price: 160,
        fields: { Brand: "Le Creuset", Condition: "Like new" },
        publish: true,
      },
      response: listingExample,
    },
    handler: async ({ auth, body }) => {
      const s = await targetShop(auth!.user.id, body.shop);
      const prompt = body.prompt ?? body.title ?? "";
      if (!prompt && !body.photo_urls?.length)
        throw new ApiError("invalid_request", "Say what it is: send a `prompt`, a `title` or some `photo_urls`.");
      let row = await createDraft({ shopId: s.id, prompt });
      const patch = patchFrom(row, body);
      if (Object.keys(patch).length) row = await updateListing(row.id, patch);
      if (body.photo_urls?.length) {
        try {
          await addPhotosFromUrls(row.id, auth!.user.id, body.photo_urls);
        } catch (error) {
          await db.delete(listing).where(eq(listing.id, row.id));
          throw error;
        }
      }
      if (body.research) await research(row.id);
      if (body.publish) {
        const problem = missing(row);
        if (problem) throw new ApiError("invalid_request", `Made the draft (${row.id}) but couldn't publish it: ${problem}`);
        row = await publishListing(row);
      }
      return full(row, s);
    },
  }),

  route({
    method: "GET",
    path: "/listings/:id",
    group,
    access: "key",
    summary: "Get a listing",
    description: "Everything about one of your listings: its words, details, photos, research and numbers.",
    example: { path: "/listings/8d1e6c2a-…", response: listingExample },
    handler: async ({ auth, params }) => {
      const { listing: row, shop: s } = await owned(auth!.user.id, params.id!);
      return full(row, s);
    },
  }),

  route({
    method: "PATCH",
    path: "/listings/:id",
    group,
    access: "key",
    scope: "listings",
    summary: "Change a listing",
    description:
      "Change the words, price, details or who can see it. Send only what changes; `null` clears a field. Changes to a live listing show straight away.",
    body: z.object(editable),
    example: { path: "/listings/8d1e6c2a-…", body: { price: 170, fields: { Condition: "Very good" } }, response: listingExample },
    handler: async ({ auth, params, body }) => {
      const { listing: row, shop: s } = await owned(auth!.user.id, params.id!);
      const patch = patchFrom(row, body);
      let updated = row;
      if (Object.keys(patch).length) {
        if (row.status === "sold" && patch.priceCents !== undefined)
          throw new ApiError("conflict", "It's sold, so the price can't change. Relist it first.");
        updated = await updateListing(row.id, patch);
        if (updated.status === "live") await refreshEmbedding(updated);
      }
      return full(updated, s);
    },
  }),

  route({
    method: "DELETE",
    path: "/listings/:id",
    group,
    access: "key",
    scope: "listings",
    summary: "Delete a listing",
    description: "Deletes a listing and its photos. Listings that have sold stay on record and can't be deleted.",
    example: { path: "/listings/8d1e6c2a-…", response: { object: "listing", id: "8d1e6c2a-…", deleted: true } },
    handler: async ({ auth, params }) => {
      const { listing: row } = await owned(auth!.user.id, params.id!);
      const photos = await listPhotoRows(row.id);
      try {
        await db.delete(listing).where(eq(listing.id, row.id));
      } catch (error) {
        const e = error as { code?: string; cause?: { code?: string } };
        if (e.code === "23503" || e.cause?.code === "23503")
          throw new ApiError("conflict", "This one has an order, so it stays on record. Unpublish it instead.");
        throw error;
      }
      await deleteFiles(photos.flatMap((p) => (p.fileId ? [p.fileId] : [])));
      return { object: "listing", id: row.id, deleted: true };
    },
  }),

  route({
    method: "POST",
    path: "/listings/:id/publish",
    group,
    access: "key",
    scope: "listings",
    summary: "Put a listing live",
    description:
      "Publishes it on your store, at a link made from the title. With `visibility: \"link\"` it stays out of search and the store page. Needs a title and a price.",
    body: z.object({ visibility: z.enum(["everyone", "link"]).optional() }),
    example: { path: "/listings/8d1e6c2a-…/publish", body: { visibility: "everyone" }, response: listingExample },
    handler: async ({ auth, params, body }) => {
      const { listing: row, shop: s } = await owned(auth!.user.id, params.id!);
      if (row.status === "sold") throw new ApiError("conflict", "It's sold. Relist it to put it back up.");
      const problem = missing(row);
      if (problem) throw new ApiError("invalid_request", problem);
      const withVis = body.visibility ? await updateListing(row.id, { visibility: body.visibility }) : row;
      return full(await publishListing(withVis), s);
    },
  }),

  route({
    method: "POST",
    path: "/listings/:id/unpublish",
    group,
    access: "key",
    scope: "listings",
    summary: "Take a listing down",
    description: "Back to a draft. It keeps its link for when it goes back up.",
    example: { path: "/listings/8d1e6c2a-…/unpublish", response: { ...listingExample, status: "draft", published_at: null } },
    handler: async ({ auth, params }) => {
      const { listing: row, shop: s } = await owned(auth!.user.id, params.id!);
      return full(await updateListing(row.id, { status: "draft", soldAt: null, publishedAt: null }), s);
    },
  }),

  route({
    method: "POST",
    path: "/listings/:id/mark-sold",
    group,
    access: "key",
    scope: "listings",
    summary: "Mark sold elsewhere",
    description: "For something that sold somewhere else. Sales through resell.store mark themselves sold.",
    example: { path: "/listings/8d1e6c2a-…/mark-sold", response: { ...listingExample, status: "sold" } },
    handler: async ({ auth, params }) => {
      const { listing: row, shop: s } = await owned(auth!.user.id, params.id!);
      if (row.status !== "live") throw new ApiError("conflict", "Only a live listing can be marked sold.");
      return full(await updateListing(row.id, { status: "sold", soldAt: new Date() }), s);
    },
  }),

  route({
    method: "POST",
    path: "/listings/:id/relist",
    group,
    access: "key",
    scope: "listings",
    summary: "Relist",
    description: "Puts a sold listing (or a draft) back up, at the same link.",
    example: { path: "/listings/8d1e6c2a-…/relist", response: listingExample },
    handler: async ({ auth, params }) => {
      const { listing: row, shop: s } = await owned(auth!.user.id, params.id!);
      const problem = missing(row);
      if (problem) throw new ApiError("invalid_request", problem);
      const base = row.status === "sold" ? await updateListing(row.id, { soldAt: null }) : row;
      return full(await publishListing(base), s);
    },
  }),

  /* Photos */

  route({
    method: "POST",
    path: "/listings/:id/photos",
    group: "Photos",
    access: "key",
    scope: "listings",
    multipart: true,
    summary: "Add photos",
    description:
      "Upload pictures as multipart form data (one or more `file` parts, up to 10 MB each, plus one video up to 40 MB), or send `urls` and we'll download them. New photos go at the end; your first own photo is always the cover.",
    body: z.object({
      urls: stringList(maxPhotos).optional().describe("Public picture URLs to download, instead of uploading."),
      alt: z.string().trim().max(200).optional().describe("A short description for screen readers."),
    }),
    example: {
      path: "/listings/8d1e6c2a-…/photos",
      body: { urls: ["https://example.com/dutch-oven.jpg"] },
      response: { object: "list", data: listingExample.photos, total: 1, has_more: false },
    },
    handler: async ({ auth, params, body, form }) => {
      const { listing: row } = await owned(auth!.user.id, params.id!);
      const files = form ? form.getAll("file").filter((v): v is File => v instanceof File && v.size > 0) : [];
      if (files.length === 0 && !body.urls?.length)
        throw new ApiError("invalid_request", "Send photos as `file` parts (multipart) or a list of `urls`.");
      if (files.length) {
        const existing = await listPhotoRows(row.id);
        const photos = existing.filter((p) => !p.isVideo).length + files.filter((f) => !f.type.startsWith("video/")).length;
        const videos = existing.filter((p) => p.isVideo).length + files.filter((f) => f.type.startsWith("video/")).length;
        if (videos > 1) throw new ApiError("invalid_request", "One video per listing.");
        if (photos > maxPhotos) throw new ApiError("invalid_request", `A listing holds up to ${maxPhotos} photos.`);
        const saved: { id: string; isVideo: boolean }[] = [];
        try {
          for (const f of files) saved.push(await saveUpload(f, auth!.user.id));
        } catch (error) {
          await deleteFiles(saved.map((s) => s.id));
          throw error;
        }
        await addPhotoRows(row.id, saved.map((s) => ({ fileId: s.id, isVideo: s.isVideo, alt: body.alt ?? null })));
      }
      if (body.urls?.length) await addPhotosFromUrls(row.id, auth!.user.id, body.urls, body.alt);
      const photos = (await listPhotos(row.id)).map(apiPhoto);
      return { object: "list", data: photos, total: photos.length, has_more: false };
    },
  }),

  route({
    method: "PUT",
    path: "/listings/:id/photos/order",
    group: "Photos",
    access: "key",
    scope: "listings",
    summary: "Reorder photos",
    description: "Send every photo id in the order you want. The first must be one of your own photos (not a web picture or the video).",
    body: z.object({ photo_ids: stringList(20).describe("Every photo id on the listing, in order.") }),
    example: {
      path: "/listings/8d1e6c2a-…/photos/order",
      body: { photo_ids: ["3f…", "9a…"] },
      response: { object: "list", data: listingExample.photos, total: 1, has_more: false },
    },
    handler: async ({ auth, params, body }) => {
      const { listing: row } = await owned(auth!.user.id, params.id!);
      const rows = await listPhotoRows(row.id);
      const byId = new Map(rows.map((p) => [p.id, p]));
      if (body.photo_ids.length !== rows.length || body.photo_ids.some((id) => !byId.has(id)))
        throw new ApiError("invalid_request", "Send every photo id on the listing, each once.", "photo_ids");
      const ordered = body.photo_ids.map((id) => byId.get(id)!);
      if (!isOwnPhoto(ordered[0]!) && rows.some(isOwnPhoto))
        throw new ApiError("invalid_request", "The cover has to be one of your own photos.", "photo_ids");
      await savePhotoOrder(ordered);
      const photos = (await listPhotos(row.id)).map(apiPhoto);
      return { object: "list", data: photos, total: photos.length, has_more: false };
    },
  }),

  route({
    method: "DELETE",
    path: "/listings/:id/photos/:photoId",
    group: "Photos",
    access: "key",
    scope: "listings",
    summary: "Remove a photo",
    example: { path: "/listings/8d1e6c2a-…/photos/3f…", response: { object: "list", data: [], total: 0, has_more: false } },
    handler: async ({ auth, params }) => {
      const { listing: row } = await owned(auth!.user.id, params.id!);
      const [photo] = await db
        .select()
        .from(listingPhoto)
        .where(and(eq(listingPhoto.id, idParam.parse(params.photoId)), eq(listingPhoto.listingId, row.id)));
      if (!photo) throw notFound("photo");
      if (photo.fileId) await deleteFiles([photo.fileId]);
      else await db.delete(listingPhoto).where(eq(listingPhoto.id, photo.id));
      await savePhotoOrder(await listPhotoRows(row.id));
      const photos = (await listPhotos(row.id)).map(apiPhoto);
      return { object: "list", data: photos, total: photos.length, has_more: false };
    },
  }),

  /* Research and words */

  route({
    method: "POST",
    path: "/listings/:id/research",
    group: "Research",
    access: "key",
    scope: "listings",
    summary: "Look it up",
    description:
      "Starts the research agent on a listing: it works out what the item is from the photo and words, finds it in the catalog, checks second-hand prices and suggests a price. It runs in the background for about a minute; poll GET /listings/:id/research. If a run is already going, you get that one.",
    example: {
      path: "/listings/8d1e6c2a-…/research",
      response: { object: "research_run", id: "run_…", listing: "8d1e6c2a-…", status: "running", steps: [] },
    },
    handler: async ({ auth, params }) => {
      const { listing: row } = await owned(auth!.user.id, params.id!);
      const photos = await listPhotoRows(row.id);
      if (!row.prompt?.trim() && !row.title?.trim() && photos.length === 0)
        throw new ApiError("invalid_request", "Give it something to go on first: a prompt, a title or a photo.");
      const run = await research(row.id);
      const latest = await latestRun(row.id);
      return {
        object: "research_run",
        id: run.id,
        listing: row.id,
        status: latest?.status ?? "running",
        started: run.started,
        steps: latest?.steps ?? [],
      };
    },
  }),

  route({
    method: "GET",
    path: "/listings/:id/research",
    group: "Research",
    access: "key",
    summary: "Research results",
    description:
      "The latest research run: each step's progress while it's `running`, then the findings when it's `done`: what it is, a price range and suggested price, facts, where the prices came from and questions worth answering.",
    example: {
      path: "/listings/8d1e6c2a-…/research",
      response: {
        object: "research_run",
        id: "run_…",
        listing: "8d1e6c2a-…",
        status: "done",
        steps: [{ key: "identify", state: "done", title: "Look at your photo", detail: "Le Creuset Signature, 5.5 qt" }],
        findings: {
          identified: "Le Creuset Signature round dutch oven, 5.5 qt, Soleil",
          category: "Kitchen",
          confidence: "high",
          price: { min: 120, max: 260, band_low: 160, band_high: 210, suggested: 185 },
          facts: [{ label: "Retail price", value: "$420" }],
          questions: [{ field: "condition", ask: "Any chips or stains inside?" }],
          summary: "Sells quickly between $160 and $210 in this colour.",
        },
      },
    },
    handler: async ({ auth, params }) => {
      const { listing: row } = await owned(auth!.user.id, params.id!);
      const run = await latestRun(row.id);
      if (!run) throw new ApiError("not_found", "This listing hasn't been looked up yet. POST to start.");
      const f = row.findings;
      return {
        object: "research_run",
        id: run.id,
        listing: row.id,
        status: run.status,
        error: run.error,
        steps: run.steps.map((s) => ({ key: s.key, state: s.state, title: s.title, detail: s.detail })),
        findings:
          run.status === "done" && f
            ? {
                identified: f.identified,
                category: f.category,
                confidence: f.confidence,
                price: {
                  min: f.price.min,
                  max: f.price.max,
                  band_low: f.price.bandLow,
                  band_high: f.price.bandHigh,
                  suggested: f.price.suggested,
                },
                facts: f.facts,
                sources: f.sources.map((s) => ({
                  label: s.label,
                  title: s.title,
                  items: s.items.map((i) => ({ title: i.title, detail: i.detail, value: i.value ?? null, url: i.url ?? null })),
                })),
                questions: f.questions.map((q) => ({ field: q.field, label: q.label, ask: q.ask, options: q.options })),
                summary: f.summary,
              }
            : null,
      };
    },
  }),

  route({
    method: "POST",
    path: "/research",
    group: "Research",
    access: "key",
    scope: "listings",
    summary: "Look up an item",
    description:
      "Shortcut for \"what's this worth?\": makes a draft from your words (and optional picture URLs) and starts the research agent on it. Poll GET /listings/:id/research with the listing id you get back. Delete the draft if you don't want to sell it.",
    body: z.object({
      query: z.string().trim().min(2).max(500).describe("What it is, e.g. \"Le Creuset dutch oven 5.5 qt yellow\"."),
      shop: z.string().optional().describe("Which shop the draft goes in. Defaults to your first."),
      photo_urls: stringList(4).optional(),
    }),
    example: {
      body: { query: "Le Creuset dutch oven 5.5 qt yellow" },
      response: { object: "research_run", id: "run_…", listing: "8d1e6c2a-…", status: "running", steps: [] },
    },
    handler: async ({ auth, body }) => {
      const s = await targetShop(auth!.user.id, body.shop);
      const row = await createDraft({ shopId: s.id, prompt: body.query });
      if (body.photo_urls?.length) await addPhotosFromUrls(row.id, auth!.user.id, body.photo_urls);
      const run = await research(row.id);
      const latest = await latestRun(row.id);
      return { object: "research_run", id: run.id, listing: row.id, status: "running", steps: latest?.steps ?? [] };
    },
  }),

  route({
    method: "POST",
    path: "/listings/:id/words",
    group: "Research",
    access: "key",
    scope: "listings",
    summary: "Write the words",
    description:
      "The writing agent writes (or rewrites) the title, one-liner, description and teaser from the listing's details and research, in a tone you pick, and puts them on the listing. `instruction` can be \"shorter\", \"longer\", \"take\" (a fresh take) or anything you'd say to a writer.",
    body: z.object({
      tone: z.enum(tones).default("Friendly"),
      instruction: z.string().trim().max(500).optional(),
    }),
    example: {
      path: "/listings/8d1e6c2a-…/words",
      body: { tone: "Straight to the point" },
      response: {
        object: "listing_words",
        listing: "8d1e6c2a-…",
        tone: "Straight to the point",
        title: "Le Creuset dutch oven, 5.5 qt, Soleil yellow",
        one_liner: "Used twice. No chips, no stains.",
        description: "Signature round dutch oven in Soleil…",
        teaser: "Used twice, like new",
      },
    },
    handler: async ({ auth, params, body }) => {
      const { listing: row } = await owned(auth!.user.id, params.id!);
      // Their saved "write like this" note, as in the app
      const [me] = await db.select({ style: user.writingStyle }).from(user).where(eq(user.id, auth!.user.id));
      const result = await generateWords(row, me?.style ?? null, { tone: body.tone, instruction: body.instruction });
      if (!result.ok) throw new ApiError(result.reason === "no-key" ? "unavailable" : "server_error", result.message);
      return {
        object: "listing_words",
        listing: row.id,
        tone: result.copy.tone,
        title: result.copy.title,
        one_liner: result.copy.oneLiner,
        description: result.copy.description,
        teaser: result.copy.teaser,
      };
    },
  }),
];
