import { describe, expect, it } from "vitest";
import {
  firstSentence,
  forSaleLabel,
  initialOf,
  isShareableListing,
  isShareableShop,
  listingShare,
  rootMetadata,
  siteShare,
  storeShare,
  toneColors,
  truncate,
} from "./og";

/* Share previews: the text helpers and exactly what each kind of page unfurls to. */

describe("text helpers", () => {
  it("initialOf takes the first letter or digit", () => {
    expect(initialOf("maya's closet")).toBe("M");
    expect(initialOf("  'Ömer")).toBe("Ö");
    expect(initialOf("35mm camera")).toBe("3");
    expect(initialOf("")).toBe("?");
    expect(initialOf(null)).toBe("?");
  });

  it("truncate cuts at a word with an ellipsis", () => {
    expect(truncate("Short", 10)).toBe("Short");
    expect(truncate("A really long title about a coat", 20)).toBe("A really long title…");
    expect(truncate("Supercalifragilistic", 10)).toBe("Supercali…");
    expect(truncate("  spaced \n out  ", 20)).toBe("spaced out");
  });

  it("firstSentence takes the first sentence or paragraph", () => {
    expect(firstSentence("Worn twice. Like new.")).toBe("Worn twice.");
    expect(firstSentence("First para\n\nSecond")).toBe("First para");
    expect(firstSentence(null)).toBe("");
  });

  it("forSaleLabel", () => {
    expect(forSaleLabel(0)).toBe("");
    expect(forSaleLabel(1)).toBe("1 for sale");
    expect(forSaleLabel(1200)).toBe("1,200 for sale");
  });

  it("toneColors matches the avatar tones", () => {
    expect(toneColors("lemon")).toEqual({ background: "#ffd934", color: "#14261d" });
    expect(toneColors("forest").color).toBe("#ffffff");
  });
});

describe("rootMetadata", () => {
  it("sets metadataBase from siteUrl and brand defaults", () => {
    const m = rootMetadata();
    expect(m.metadataBase?.toString()).toBe("http://localhost:5689/");
    expect(m.openGraph).toMatchObject({ siteName: "resell.store", type: "website" });
    expect(m.twitter).toMatchObject({ card: "summary_large_image" });
  });
});

describe("siteShare", () => {
  it("canonical, og:url and the brand image for a marketplace page", () => {
    const m = siteShare("/discover", "Shop the marketplace · resell.store");
    expect(m.alternates?.canonical).toBe("http://localhost:5689/discover");
    expect(m.openGraph).toMatchObject({
      url: "http://localhost:5689/discover",
      siteName: "resell.store",
      title: "Shop the marketplace · resell.store",
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    });
    expect(m.twitter).toMatchObject({ card: "summary_large_image", images: [{ url: "/twitter-image" }] });
  });
});

describe("storeShare", () => {
  it("is canonical on the store's subdomain, with its line, location and count", () => {
    const m = storeShare({
      slug: "maya",
      name: "Maya's closet",
      bio: "Clothes I loved. Mostly linen.",
      location: "Lisbon",
      forSale: 8,
    });
    expect(m.title).toBe("Maya's closet · resell.store");
    expect(m.alternates?.canonical).toBe("http://maya.localhost:5689/");
    expect(m.openGraph).toMatchObject({ url: "http://maya.localhost:5689/", title: "Maya's closet" });
    expect(m.description).toBe("Clothes I loved. Lisbon · 8 for sale. Shop it at maya.broresell.com.");
    // The image comes from app/store/[store]/opengraph-image.tsx, not from here
    expect((m.openGraph as { images?: unknown }).images).toBeUndefined();
  });

  it("falls back to the tagline", () => {
    const m = storeShare({ slug: "jo", name: "Jo", tagline: "Vintage", forSale: 0 });
    expect(m.description).toBe("Vintage. Shop it at jo.resell.store.");
  });
});

describe("listingShare", () => {
  const base = {
    slug: "linen-wrap-dress",
    title: "Linen wrap dress",
    oneLiner: "Size M, worn twice",
    description: null,
    priceCents: 2400,
    sold: false,
  };

  it("puts the price in the share title and description", () => {
    const m = listingShare(base, { slug: "maya", name: "Maya's closet" });
    expect(m.title).toBe("Linen wrap dress · Maya's closet");
    expect(m.openGraph).toMatchObject({
      title: "Linen wrap dress · $24",
      url: "http://maya.localhost:5689/linen-wrap-dress",
    });
    expect(m.twitter).toMatchObject({ card: "summary_large_image", title: "Linen wrap dress · $24" });
    expect(m.description).toBe(
      "$24. Size M, worn twice. From Maya's closet on resell.store. PayPal holds your money until it arrives.",
    );
    expect(m.alternates?.canonical).toBe("http://maya.localhost:5689/linen-wrap-dress");
    expect(m.other).toEqual({ "product:price:amount": "24.00", "product:price:currency": "USD" });
  });

  it("says Sold, and drops the product price, once it's sold", () => {
    const m = listingShare({ ...base, sold: true, oneLiner: null, description: "Lovely.\n\nMore" }, { slug: "maya", name: "Maya" });
    expect(m.openGraph).toMatchObject({ title: "Linen wrap dress · Sold" });
    expect(m.description).toBe("Sold for $24. Lovely. More from Maya on resell.store.");
    expect(m.other).toBeUndefined();
  });
});

describe("who may be shared", () => {
  it("private shops never", () => {
    expect(isShareableShop({ visibility: "public" })).toBe(true);
    expect(isShareableShop({ visibility: "link" })).toBe(true);
    expect(isShareableShop({ visibility: "private" })).toBe(false);
  });

  it("listings: live or sold, for everyone, with a slug", () => {
    expect(isShareableListing({ status: "live", visibility: "everyone", slug: "a" })).toBe(true);
    expect(isShareableListing({ status: "sold", visibility: "everyone", slug: "a" })).toBe(true);
    expect(isShareableListing({ status: "draft", visibility: "everyone", slug: "a" })).toBe(false);
    expect(isShareableListing({ status: "live", visibility: "link", slug: "a" })).toBe(false);
    expect(isShareableListing({ status: "sold", visibility: "link", slug: "a" })).toBe(false);
    expect(isShareableListing({ status: "live", visibility: "everyone", slug: null })).toBe(false);
  });
});
