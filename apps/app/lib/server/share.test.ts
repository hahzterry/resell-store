import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../../test/db";
import { createListing, createShop, createUser } from "../../test/factories";
import { createFile, createPhoto } from "../../test/factories-market";

/*
 * Share previews from the database: the store and listing pages' metadata,
 * and what the share images are allowed to draw. The rule under test: a
 * private shop, a draft or a link-only listing never reaches a preview,
 * whoever is looking.
 */

const state = vi.hoisted(() => ({ user: null as null | { id: string; name: string; email: string } }));

vi.mock("./session", () => ({
  getSession: vi.fn(async () => null),
  getCurrentUser: vi.fn(async () => state.user),
  requireUser: vi.fn(async () => state.user),
}));

// The image routes, with rendering swapped for the card element (or "site")
vi.mock("./og-render", () => ({
  renderOg: vi.fn(async (card: unknown) => card),
  siteImage: vi.fn(async () => "site"),
}));

const S = await import("./share");
const { listingImage, storeImage } = await import("./og-images");

type Card = { props: Record<string, unknown> };

beforeEach(async () => {
  await resetDb();
  state.user = null;
});

async function maya(shop: Parameters<typeof createShop>[1] = {}) {
  const owner = await createUser({ name: "Maya Lopez" });
  const s = await createShop(owner.id, { slug: "maya", name: "Maya's closet", tone: "mint", location: "Lisbon", ...shop });
  return { owner, shop: s };
}

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);

describe("storePageMetadata", () => {
  it("a public store: subdomain canonical, share title and description", async () => {
    const { shop } = await maya({ about: "Clothes I loved. Mostly linen." });
    await createListing(shop.id);
    await createListing(shop.id, { visibility: "link" });
    const m = await S.storePageMetadata("maya");
    expect(m.title).toBe("Maya's closet · resell.store");
    expect(m.alternates?.canonical).toBe("http://maya.localhost:5689/");
    expect(m.openGraph).toMatchObject({ title: "Maya's closet", url: "http://maya.localhost:5689/", siteName: "resell.store" });
    expect(m.twitter).toMatchObject({ card: "summary_large_image" });
    // Only listed things count
    expect(m.description).toBe("Clothes I loved. Lisbon · 1 for sale. Shop it at maya.broresell.com.");
  });

  it("a link-only store can be shared by its URL", async () => {
    await maya({ visibility: "link" });
    expect((await S.storePageMetadata("maya")).openGraph).toMatchObject({ title: "Maya's closet" });
  });

  it("a private store: nothing for visitors, no share tags even for its owner", async () => {
    const { owner } = await maya({ visibility: "private", about: "Secret stash" });
    expect(await S.storePageMetadata("maya")).toEqual({ title: "resell.store" });
    const own = await S.storePageMetadata("maya", owner.id);
    expect(own.title).toBe("Maya's closet · resell.store");
    expect(own.openGraph).toBeUndefined();
    expect(own.twitter).toBeUndefined();
    expect(own.robots).toEqual({ index: false, follow: false });
    expect(JSON.stringify(own)).not.toContain("Secret stash");
  });

  it("an unknown store", async () => {
    expect(await S.storePageMetadata("nobody")).toEqual({ title: "resell.store" });
  });
});

describe("listingPageMetadata", () => {
  it("a live listing: price in the share title, one-liner in the description", async () => {
    const { shop } = await maya();
    await createListing(shop.id, { slug: "linen-wrap-dress", title: "Linen wrap dress", oneLiner: "Size M, worn twice", priceCents: 2400 });
    const m = await S.listingPageMetadata("maya", "linen-wrap-dress");
    expect(m.title).toBe("Linen wrap dress · Maya's closet");
    expect(m.alternates?.canonical).toBe("http://maya.localhost:5689/linen-wrap-dress");
    expect(m.openGraph).toMatchObject({ title: "Linen wrap dress · $24", url: "http://maya.localhost:5689/linen-wrap-dress" });
    expect(m.twitter).toMatchObject({ card: "summary_large_image", title: "Linen wrap dress · $24" });
    expect(m.description).toContain("$24. Size M, worn twice.");
    expect(m.description).toContain("PayPal holds your money until it arrives");
  });

  it("a sold listing says Sold", async () => {
    const { shop } = await maya();
    await createListing(shop.id, { slug: "scarf", title: "Wool scarf", status: "sold", priceCents: 3250 });
    const m = await S.listingPageMetadata("maya", "scarf");
    expect(m.openGraph).toMatchObject({ title: "Wool scarf · Sold" });
    expect(m.description).toMatch(/^Sold for \$32\.50\./);
  });

  it("link-only listings, drafts and private shops get no share tags", async () => {
    const { owner, shop } = await maya();
    await createListing(shop.id, { slug: "hidden", title: "Hidden coat", visibility: "link", oneLiner: "Shh" });
    await createListing(shop.id, { slug: "draft", title: "Draft lamp", status: "draft" });

    const link = await S.listingPageMetadata("maya", "hidden");
    expect(link.openGraph).toBeUndefined();
    expect(link.robots).toEqual({ index: false, follow: false });

    expect(await S.listingPageMetadata("maya", "draft")).toEqual({ title: "resell.store" });
    const ownDraft = await S.listingPageMetadata("maya", "draft", owner.id);
    expect(ownDraft.title).toBe("Draft lamp · Maya's closet");
    expect(ownDraft.openGraph).toBeUndefined();

    const owner2 = await createUser();
    const secret = await createShop(owner2.id, { slug: "secret", name: "Secret shop", visibility: "private" });
    await createListing(secret.id, { slug: "thing", title: "Private thing" });
    expect(await S.listingPageMetadata("secret", "thing")).toEqual({ title: "resell.store" });
    const own = await S.listingPageMetadata("secret", "thing", owner2.id);
    expect(own.openGraph).toBeUndefined();
    expect(own.twitter).toBeUndefined();
  });
});

describe("storeImage", () => {
  it("draws the store with listed things first, topped up from its sold ones", async () => {
    const { shop } = await maya();
    const live = await createListing(shop.id, { title: "Linen wrap dress", publishedAt: new Date() });
    const f = await createFile(null, { data: JPEG, size: JPEG.length });
    await createPhoto(live.id, { fileId: f.id });
    await createListing(shop.id, { title: "Link only", visibility: "link" });
    await createListing(shop.id, { title: "Draft", status: "draft" });
    await createListing(shop.id, { title: "Old scarf", status: "sold", soldAt: new Date() });

    const card = (await storeImage("maya")) as unknown as Card;
    expect(card.props).toMatchObject({
      name: "Maya's closet",
      domain: "maya.broresell.com",
      tone: "mint",
      location: "Lisbon",
      forSale: 1,
      picture: null,
    });
    expect(card.props.items).toEqual([
      { title: "Linen wrap dress", sold: false, photo: `data:image/jpeg;base64,${JPEG.toString("base64")}` },
      { title: "Old scarf", sold: true, photo: null },
    ]);
  });

  it("gives the brand image for a private or unknown store", async () => {
    await maya({ visibility: "private" });
    expect(await storeImage("maya")).toBe("site");
    expect(await storeImage("nobody")).toBe("site");
  });
});

describe("listingImage", () => {
  it("draws a live listing with its price and cover", async () => {
    const { shop } = await maya();
    const l = await createListing(shop.id, { slug: "dress", title: "Linen wrap dress", priceCents: 2400, oneLiner: "Size M" });
    const f = await createFile(null, { data: JPEG, size: JPEG.length });
    await createPhoto(l.id, { fileId: f.id });
    const card = (await listingImage("maya", "dress")) as unknown as Card;
    expect(card.props).toMatchObject({ title: "Linen wrap dress", price: "$24", sold: false, blurb: "Size M" });
    expect(card.props.photo).toMatch(/^data:image\/jpeg;base64,/);
    expect(card.props.shop).toEqual({ name: "Maya's closet", tone: "mint", picture: null });
  });

  it("marks a sold listing; no photo means the card's tile", async () => {
    const { shop } = await maya();
    await createListing(shop.id, { slug: "scarf", title: "Scarf", status: "sold", priceCents: 3200 });
    const card = (await listingImage("maya", "scarf")) as unknown as Card;
    expect(card.props).toMatchObject({ sold: true, price: "$32", photo: null });
  });

  it("gives the brand image for drafts, link-only listings and private shops", async () => {
    const { shop } = await maya();
    await createListing(shop.id, { slug: "draft", status: "draft" });
    await createListing(shop.id, { slug: "hidden", visibility: "link" });
    expect(await listingImage("maya", "draft")).toBe("site");
    expect(await listingImage("maya", "hidden")).toBe("site");
    expect(await listingImage("maya", "missing")).toBe("site");

    const owner = await createUser();
    const secret = await createShop(owner.id, { slug: "secret", visibility: "private" });
    await createListing(secret.id, { slug: "thing" });
    expect(await listingImage("secret", "thing")).toBe("site");
  });

  it("ignores who is signed in: the owner's draft still isn't drawn", async () => {
    const { owner, shop } = await maya();
    await createListing(shop.id, { slug: "draft", status: "draft" });
    state.user = { id: owner.id, name: "Maya Lopez", email: owner.email };
    expect(await listingImage("maya", "draft")).toBe("site");
  });
});
