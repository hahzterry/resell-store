import { afterEach, describe, expect, it, vi } from "vitest";
import { afterSignIn, safeNext, safePath, signInHref, signInUrl } from "./safe-next";

/*
 * Where sign-in may send someone back to: only our own paths, the marketplace
 * and its stores, never another site (open redirects). Dev root is
 * localhost:5689; the last block checks production, where there's no handoff.
 */

describe("safePath", () => {
  it("keeps same-origin paths with their query", () => {
    expect(safePath("/checkout/x?y=1")).toBe("/checkout/x?y=1");
    expect(safePath("/")).toBe("/");
  });

  it("refuses protocol-relative, backslash, absolute and empty values", () => {
    expect(safePath("//evil.com")).toBeNull();
    expect(safePath("/\\evil.com")).toBeNull();
    expect(safePath("/a\\b")).toBeNull();
    expect(safePath("https://evil.com")).toBeNull();
    expect(safePath("checkout")).toBeNull();
    expect(safePath("")).toBeNull();
    expect(safePath(null)).toBeNull();
    expect(safePath(undefined)).toBeNull();
  });
});

describe("safeNext", () => {
  it("passes safe paths and refuses unsafe ones", () => {
    expect(safeNext("/account")).toBe("/account");
    expect(safeNext("//evil.com/x")).toBeNull();
    expect(safeNext(null)).toBeNull();
    expect(safeNext("")).toBeNull();
  });

  it("allows absolute URLs on the marketplace and its stores", () => {
    expect(safeNext("http://localhost:5689/discover")).toBe("http://localhost:5689/discover");
    expect(safeNext("http://maya.localhost:5689/linen-wrap-dress")).toBe("http://maya.localhost:5689/linen-wrap-dress");
  });

  it("refuses other sites and look-alikes", () => {
    expect(safeNext("https://evil.com/")).toBeNull();
    expect(safeNext("http://localhost:5689.evil.com/")).toBeNull();
    expect(safeNext("http://api.localhost:5689/")).toBeNull();
    expect(safeNext("javascript:alert(1)")).toBeNull();
  });

  it("decodes a still-encoded value once, and checks it again", () => {
    expect(safeNext("%2Fcheckout%2Fx%3Fy%3D1")).toBe("/checkout/x?y=1");
    expect(safeNext(encodeURIComponent("http://maya.localhost:5689/a"))).toBe("http://maya.localhost:5689/a");
    expect(safeNext(encodeURIComponent("https://evil.com/"))).toBeNull();
    expect(safeNext("%2F%2Fevil.com")).toBeNull();
  });

  it("refuses anything encoded more than once, and a broken encoding", () => {
    expect(safeNext(encodeURIComponent(encodeURIComponent("/account")))).toBeNull();
    expect(safeNext("%2F%E0%A4%A")).toBeNull();
  });
});

describe("afterSignIn", () => {
  it("leaves paths and marketplace URLs alone", () => {
    expect(afterSignIn("/account")).toBe("/account");
    expect(afterSignIn("http://localhost:5689/discover")).toBe("http://localhost:5689/discover");
  });

  it("sends a store URL through the session handoff in dev", () => {
    const to = "http://maya.localhost:5689/linen-wrap-dress";
    expect(afterSignIn(to)).toBe(`/api/session/handoff?to=${encodeURIComponent(to)}`);
  });
});

describe("sign-in links", () => {
  it("point at /welcome with next encoded", () => {
    expect(signInHref("/checkout/x?y=1")).toBe("/welcome?next=%2Fcheckout%2Fx%3Fy%3D1");
    expect(signInUrl("/account")).toBe("http://localhost:5689/welcome?next=%2Faccount");
  });
});

describe("in production (resell.store)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("goes straight to a store URL, since the cookie is shared", async () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "resell.store");
    vi.resetModules();
    const p = await import("./safe-next");
    expect(p.safeNext("https://maya.broresell.com/a")).toBe("https://maya.broresell.com/a");
    expect(p.afterSignIn("https://maya.broresell.com/a")).toBe("https://maya.broresell.com/a");
    expect(p.signInUrl("/x")).toBe("https://resell.store/welcome?next=%2Fx");
  });
});
