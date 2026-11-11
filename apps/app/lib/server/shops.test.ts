import { beforeEach, describe, expect, it } from "vitest";
import { db, eq, listing } from "@repo/db";
import { resetDb } from "../../test/db";
import { createListing, createShop, createUser, daysAgo } from "../../test/factories";
import { createFile, createPhoto } from "../../test/factories-market";
import {
  checkSlug,
  countOwnedShops,
  draftStepLabel,
  getOwnedShop,
  isSlugFree,
  isValidSlug,
  latestDraft,
  listOwnedShops,
  shopDomain,
  shopFileIds,
  shopPicture,
  slugify,
  storeToneFor,
  toShopCard,
} from "./shops";

/*
 * Shops: subdomain slugs (shape, reserved words, uniqueness), the owner's
 * list with listing counts, ownership lookups and the bits the seller
 * screens show.
 */

beforeEach(async () => {
  await resetDb();
});

describe("slugify", () => {
  it("makes a subdomain from a shop name", () => {
    expect(slugify("Maya's Vintage Finds")).toBe("maya-vintage-finds");
    expect(slugify("Maya’s Things")).toBe("maya-things");
    expect(slugify("  Rock 'n' Roll!! Records ")).toBe("rock-n-roll-records");
    expect(slugify("Café Olé")).toBe("caf-ol");
  });

  it("stops at 32 characters", () => {
    expect(slugify("a".repeat(50))).toHaveLength(32);
  });
});

describe("isValidSlug", () => {
  it("allows lowercase letters, digits and inner hyphens, up to 32", () => {
    expect(isValidSlug("maya")).toBe(true);
    expect(isValidSlug("m")).toBe(true);
    expect(isValidSlug("maya-2")).toBe(true);
    expect(isValidSlug("a".repeat(32))).toBe(true);
  });

  it("refuses bad shapes and reserved words", () => {
    expect(isValidSlug("a".repeat(33))).toBe(false);
    expect(isValidSlug("-maya")).toBe(false);
    expect(isValidSlug("maya-")).toBe(false);
    expect(isValidSlug("Maya")).toBe(false);
    expect(isValidSlug("maya shop")).toBe(false);
    expect(isValidSlug("")).toBe(false);
    for (const word of ["www", "api", "admin", "mcp", "docs", "shop"]) expect(isValidSlug(word)).toBe(false);
  });
});

describe("checkSlug and isSlugFree", () => {
  it("says free, taken or invalid", async () => {
    const me = await createUser();
    await createShop(me.id, { slug: "maya" });
    expect(await checkSlug("sam")).toBe("free");
    expect(await checkSlug("maya")).toBe("taken");
    expect(await checkSlug("Not Valid")).toBe("invalid");
    expect(await checkSlug("")).toBe("invalid");
  });

  it("reads reserved words as taken, not invalid", async () => {
    expect(await checkSlug("admin")).toBe("taken");
  });

  it("lets a shop keep its own slug", async () => {
    const me = await createUser();
    const s = await createShop(me.id, { slug: "maya" });
    expect(await isSlugFree("maya")).toBe(false);
    expect(await isSlugFree("maya", s.id)).toBe(true);
    expect(await checkSlug("maya", s.id)).toBe("free");
    expect(await isSlugFree("BAD SLUG")).toBe(false);
  });
});

describe("shopDomain", () => {
  it("reads as the production domain while the root is localhost", () => {
    expect(shopDomain("maya")).toBe("maya.broresell.com");
  });
});

describe("listOwnedShops and countOwnedShops", () => {
  it("lists only the person's shops, oldest first, with live, draft and sold counts", async () => {
    const me = await createUser();
    const other = await createUser();
    const second = await createShop(me.id, { slug: "second", createdAt: daysAgo(1) });
    const first = await createShop(me.id, { slug: "first", createdAt: daysAgo(5) });
    await createShop(other.id, { slug: "theirs" });
    await createListing(first.id);
    await createListing(first.id);
    await createListing(first.id, { status: "draft", slug: null });
    await createListing(first.id, { status: "sold" });

    const shops = await listOwnedShops(me.id);
    expect(shops.map((s) => s.slug)).toEqual(["first", "second"]);
    expect(shops[0]).toMatchObject({ live: 2, drafts: 1, sold: 1 });
    expect(shops[1]).toMatchObject({ id: second.id, live: 0, drafts: 0, sold: 0 });

    expect(await countOwnedShops(me.id)).toBe(2);
    expect(await countOwnedShops(other.id)).toBe(1);
    expect(await countOwnedShops("nobody")).toBe(0);
  });
});

describe("getOwnedShop", () => {
  it("finds the person's shop by slug and nobody else's", async () => {
    const me = await createUser();
    const other = await createUser();
    const s = await createShop(me.id, { slug: "maya" });
    expect((await getOwnedShop(me.id, "maya"))!.id).toBe(s.id);
    expect(await getOwnedShop(other.id, "maya")).toBeNull();
    expect(await getOwnedShop(me.id, "nope")).toBeNull();
  });
});

describe("toShopCard and shopPicture", () => {
  it("maps a shop onto the seller tile", async () => {
    const me = await createUser();
    await createShop(me.id, { slug: "maya", name: "Maya's", tone: "leaf", category: "Clothes", visibility: "link" });
    const [s] = await listOwnedShops(me.id);
    expect(toShopCard(s!)).toEqual({
      slug: "maya",
      name: "Maya's",
      shortName: "Maya's",
      domain: "maya.broresell.com",
      visibility: "link",
      tone: "leaf",
      icon: "dress",
      live: 0,
      drafts: 0,
      offers: 0,
      thisWeek: 0,
    });
  });

  it("maps every B1 colour to a marketplace tone", () => {
    expect(storeToneFor).toEqual({ lemon: "lemon", mint: "mint", pink: "pink", leaf: "forest", blush: "pink" });
  });

  it("links the uploaded picture, or null", () => {
    expect(shopPicture({ pictureFileId: "f1" })).toBe("/api/files/f1");
    expect(shopPicture({ pictureFileId: null })).toBeNull();
  });
});

describe("latestDraft", () => {
  it("is the person's most recently touched draft", async () => {
    const me = await createUser();
    const s = await createShop(me.id, { name: "Maya's", slug: "maya" });
    const older = await createListing(s.id, { status: "draft", slug: null, name: "Old draft", step: "details" });
    const newer = await createListing(s.id, { status: "draft", slug: null, name: "New draft", step: "photos" });
    await createListing(s.id, { name: "Live one" });
    await db.update(listing).set({ updatedAt: daysAgo(3) }).where(eq(listing.id, older.id));
    await db.update(listing).set({ updatedAt: daysAgo(1) }).where(eq(listing.id, newer.id));

    expect(await latestDraft(me.id)).toEqual({
      id: newer.id,
      name: "New draft",
      title: newer.title,
      step: "photos",
      shopName: "Maya's",
      shopSlug: "maya",
    });
    expect(draftStepLabel.photos).toBe("Next: photos");
  });

  it("is null without drafts", async () => {
    const me = await createUser();
    expect(await latestDraft(me.id)).toBeNull();
  });
});

describe("shopFileIds", () => {
  it("collects the shop picture and every uploaded listing photo, not web pictures", async () => {
    const me = await createUser();
    const picture = await createFile(me.id);
    const s = await createShop(me.id, { pictureFileId: picture.id });
    const l = await createListing(s.id);
    const photo = await createFile(me.id);
    await createPhoto(l.id, { fileId: photo.id });
    await createPhoto(l.id, { url: "https://maker.com/a.jpg", position: 1 });

    const elsewhere = await createShop(me.id);
    const theirPhoto = await createFile(me.id);
    await createPhoto((await createListing(elsewhere.id)).id, { fileId: theirPhoto.id });

    expect((await shopFileIds(s.id)).sort()).toEqual([picture.id, photo.id].sort());
    expect(await shopFileIds("nope")).toEqual([]);
  });
});
