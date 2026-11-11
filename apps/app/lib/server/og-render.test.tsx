import { afterEach, describe, expect, it, vi } from "vitest";
import { ListingCard, StoreCard } from "../../components/og/cards";
import { resetOgFonts } from "./og-fonts";
import { renderOg, siteImage } from "./og-render";

/*
 * The cards really render to PNGs with next/og, even with Google Fonts
 * unreachable (the built-in font stands in). No network: fetch fails.
 */

const isPng = (b: Uint8Array) => [0x89, 0x50, 0x4e, 0x47].every((x, i) => b[i] === x);

afterEach(() => {
  vi.unstubAllGlobals();
  resetOgFonts();
});

function offline() {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
}

describe("share image rendering", () => {
  it("draws the brand image as a 1200×630 PNG", async () => {
    offline();
    const res = await siteImage();
    expect(res.headers.get("content-type")).toBe("image/png");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(isPng(bytes)).toBe(true);
    const view = new DataView(bytes.buffer);
    expect([view.getUint32(16), view.getUint32(20)]).toEqual([1200, 630]);
  });

  it("draws store and listing cards, with tiles where photos are missing", async () => {
    offline();
    const store = await renderOg(
      <StoreCard
        name="Maya's closet"
        domain="maya.broresell.com"
        tone="mint"
        picture={null}
        location="Lisbon"
        forSale={2}
        items={[{ title: "Dress", photo: null }, { title: "Scarf", photo: null, sold: true }]}
      />,
    );
    expect(isPng(new Uint8Array(await store.arrayBuffer()))).toBe(true);
    const listing = await renderOg(
      <ListingCard
        title="A very long listing title that has to be cut down to fit the card nicely"
        price="$24"
        sold
        photo={null}
        shop={{ name: "Maya's closet", tone: "pink", picture: null }}
      />,
    );
    expect(isPng(new Uint8Array(await listing.arrayBuffer()))).toBe(true);
  });
});
