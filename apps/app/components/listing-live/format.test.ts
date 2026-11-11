import { afterEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceListing } from "../../lib/server/listings";
import { copyText, formatPrice, lowestCents, readableUrl, shareLink } from "./format";

/*
 * Small formatting helpers on the listing workspace, plus copy and share,
 * which fall back quietly when the browser says no.
 */

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("formatPrice", () => {
  it("drops .00 and keeps real cents", () => {
    expect(formatPrice(8_900)).toBe("$89");
    expect(formatPrice(8_950)).toBe("$89.50");
    expect(formatPrice(5)).toBe("$0.05");
    expect(formatPrice(0)).toBe("$0");
  });

  it("is null without a price", () => {
    expect(formatPrice(null)).toBeNull();
    expect(formatPrice(undefined)).toBeNull();
  });
});

describe("readableUrl", () => {
  it("drops the protocol", () => {
    expect(readableUrl("http://maya.localhost:5689/yellow-dutch-oven")).toBe("maya.localhost:5689/yellow-dutch-oven");
    expect(readableUrl("https://maya.broresell.com/")).toBe("maya.broresell.com/");
  });
});

describe("lowestCents", () => {
  const base = { priceCents: 10_000, lowestCents: null, shop: { lowestPercent: 15 } } as unknown as WorkspaceListing;

  it("uses the listing's own floor first", () => {
    expect(lowestCents({ ...base, lowestCents: 7_000 })).toBe(7_000);
  });

  it("otherwise takes the shop's % off, rounded to whole dollars", () => {
    expect(lowestCents(base)).toBe(8_500);
    expect(lowestCents({ ...base, priceCents: 4_999 })).toBe(4_200);
  });

  it("is null without a price", () => {
    expect(lowestCents({ ...base, priceCents: null })).toBeNull();
  });
});

describe("copyText", () => {
  it("copies and says so", async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    expect(await copyText("hello")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("returns false when the clipboard is blocked", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: async () => Promise.reject(new Error("denied")) } });
    expect(await copyText("hello")).toBe(false);
  });
});

describe("shareLink", () => {
  it("uses the share sheet when there is one", async () => {
    const share = vi.fn(async () => {});
    vi.stubGlobal("navigator", { share, clipboard: { writeText: vi.fn() } });
    expect(await shareLink("Dutch oven", "https://x")).toBe("shared");
    expect(share).toHaveBeenCalledWith({ title: "Dutch oven", url: "https://x" });
  });

  it("reports a cancelled share without copying", async () => {
    const writeText = vi.fn();
    vi.stubGlobal("navigator", {
      share: async () => Promise.reject(new DOMException("cancel", "AbortError")),
      clipboard: { writeText },
    });
    expect(await shareLink("t", "https://x")).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("falls back to copying when sharing fails or isn't there", async () => {
    vi.stubGlobal("navigator", {
      share: async () => Promise.reject(new Error("nope")),
      clipboard: { writeText: async () => {} },
    });
    expect(await shareLink("t", "https://x")).toBe("copied");

    vi.stubGlobal("navigator", { clipboard: { writeText: async () => Promise.reject(new Error("blocked")) } });
    expect(await shareLink("t", "https://x")).toBe("failed");
  });
});
