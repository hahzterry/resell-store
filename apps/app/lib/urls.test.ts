import { afterEach, describe, expect, it, vi } from "vitest";
import * as urls from "./urls";

/*
 * The two zones (marketplace and {store} subdomains) and the service hosts.
 * Tests run with NEXT_PUBLIC_ROOT_DOMAIN=localhost:5689 (dev); the last block
 * re-imports the module with resell.store to check production addresses.
 */

describe("storeFromHost", () => {
  it("reads the store from a subdomain, ignoring the port and case", () => {
    expect(urls.storeFromHost("maya.localhost:5689")).toBe("maya");
    expect(urls.storeFromHost("Maya.LocalHost:5689")).toBe("maya");
  });

  it("is null for the marketplace itself, reserved names, nested subdomains and other sites", () => {
    expect(urls.storeFromHost(null)).toBeNull();
    expect(urls.storeFromHost("localhost:5689")).toBeNull();
    for (const sub of ["www", "app", "api", "docs", "mcp"]) expect(urls.storeFromHost(`${sub}.localhost:5689`)).toBeNull();
    expect(urls.storeFromHost("a.b.localhost:5689")).toBeNull();
    expect(urls.storeFromHost("maya.example.com")).toBeNull();
    expect(urls.storeFromHost("evillocalhost:5689")).toBeNull();
  });
});

describe("serviceFromHost", () => {
  it("knows the api, docs and mcp hosts", () => {
    expect(urls.serviceFromHost("api.localhost:5689")).toBe("api");
    expect(urls.serviceFromHost("DOCS.localhost")).toBe("docs");
    expect(urls.serviceFromHost("mcp.localhost:5689")).toBe("mcp");
  });

  it("is null for stores, the marketplace and nothing", () => {
    expect(urls.serviceFromHost("maya.localhost:5689")).toBeNull();
    expect(urls.serviceFromHost("localhost:5689")).toBeNull();
    expect(urls.serviceFromHost(null)).toBeNull();
  });
});

describe("building addresses in dev", () => {
  it("uses http on localhost with the port", () => {
    expect(urls.rootDomain).toBe("localhost:5689");
    expect(urls.siteUrl()).toBe("http://localhost:5689/");
    expect(urls.siteUrl("/checkout/x")).toBe("http://localhost:5689/checkout/x");
    expect(urls.storeUrl("maya")).toBe("http://maya.localhost:5689/");
    expect(urls.storeUrl("maya", "/linen-wrap")).toBe("http://maya.localhost:5689/linen-wrap");
  });

  it("always shows the production store domain", () => {
    expect(urls.storeDomain("maya")).toBe("maya.broresell.com");
  });

  it("puts docs, MCP and the API under the marketplace", () => {
    expect(urls.docsUrl()).toBe("http://localhost:5689/docs");
    expect(urls.docsUrl("/api/keys")).toBe("http://localhost:5689/docs/api/keys");
    expect(urls.mcpUrl()).toBe("http://localhost:5689/api/mcp/");
    expect(urls.mcpUrl("/buyer")).toBe("http://localhost:5689/api/mcp/buyer");
    expect(urls.apiUrl()).toBe("http://localhost:5689/api/v1");
    expect(urls.apiUrl("/listings")).toBe("http://localhost:5689/api/v1/listings");
  });

  it("needs the session handoff, since localhost can't share cookies with subdomains", () => {
    expect(urls.needsSessionHandoff).toBe(true);
  });
});

describe("zoneUrl", () => {
  it("accepts the marketplace and its stores", () => {
    expect(urls.zoneUrl("http://localhost:5689/discover")?.pathname).toBe("/discover");
    expect(urls.zoneUrl("http://maya.localhost:5689/linen-wrap")?.host).toBe("maya.localhost:5689");
  });

  it("refuses other sites, other protocols or ports, credentials, reserved hosts and junk", () => {
    expect(urls.zoneUrl("http://evil.com/")).toBeNull();
    expect(urls.zoneUrl("https://localhost:5689/")).toBeNull();
    expect(urls.zoneUrl("http://localhost:3000/")).toBeNull();
    expect(urls.zoneUrl("http://maya.localhost:3000/")).toBeNull();
    expect(urls.zoneUrl("http://user:pw@localhost:5689/")).toBeNull();
    expect(urls.zoneUrl("http://api.localhost:5689/")).toBeNull();
    expect(urls.zoneUrl("javascript:alert(1)")).toBeNull();
    expect(urls.zoneUrl("not a url")).toBeNull();
  });
});

describe("in production (resell.store)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function prod() {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "resell.store");
    vi.resetModules();
    return import("./urls");
  }

  it("uses https and the service subdomains", async () => {
    const p = await prod();
    expect(p.siteUrl("/x")).toBe("https://resell.store/x");
    expect(p.storeUrl("maya")).toBe("https://maya.broresell.com/");
    expect(p.docsUrl()).toBe("https://docs.resell.store/");
    expect(p.docsUrl("/api")).toBe("https://docs.resell.store/api");
    expect(p.mcpUrl("/seller")).toBe("https://mcp.resell.store/seller");
    expect(p.apiUrl("/listings")).toBe("https://api.resell.store/v1/listings");
  });

  it("shares the cookie across subdomains, so no handoff", async () => {
    const p = await prod();
    expect(p.needsSessionHandoff).toBe(false);
    expect(p.storeFromHost("maya.broresell.com")).toBe("maya");
    expect(p.serviceFromHost("api.resell.store")).toBe("api");
    expect(p.zoneUrl("https://maya.broresell.com/a")?.href).toBe("https://maya.broresell.com/a");
    expect(p.zoneUrl("http://maya.broresell.com/a")).toBeNull();
  });
});
