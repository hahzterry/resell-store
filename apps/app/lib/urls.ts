/*
 * Two zones share one Next app:
 *   resell.store/*          the marketplace (discover, checkout, account…)
 *   {store}.resell.store/*  one seller's store, rewritten by proxy.ts to /store/{store}/*
 *
 * In dev the root is localhost:5689, so stores live at maya.localhost:5689.
 */

export const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:5689";

const rootHostname = rootDomain.split(":")[0]!;
const protocol = rootHostname === "localhost" ? "http" : "https";

/** Subdomains that are never stores. */
const reserved = new Set(["www", "app", "api", "docs", "mcp"]);

/** The service subdomains: api.resell.store, docs.resell.store, mcp.resell.store. */
export type ServiceHost = "api" | "docs" | "mcp";

export function serviceFromHost(host: string | null): ServiceHost | null {
  if (!host) return null;
  const hostname = host.split(":")[0]!.toLowerCase();
  for (const service of ["api", "docs", "mcp"] as const) {
    if (hostname === `${service}.${rootHostname}`) return service;
  }
  return null;
}

/** The store a request's Host header points at, or null for the marketplace. */
export function storeFromHost(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0]!.toLowerCase();
  if (!hostname.endsWith(`.${rootHostname}`)) return null;
  const sub = hostname.slice(0, -(rootHostname.length + 1));
  if (!sub || sub.includes(".") || reserved.has(sub)) return null;
  return sub;
}

/** Absolute URL on the marketplace. */
export function siteUrl(path = "/") {
  return `${protocol}://${rootDomain}${path}`;
}

/** Absolute URL inside a store. */
export function storeUrl(store: string, path = "/") {
  return `${protocol}://${store}.${rootDomain}${path}`;
}

/** How a store's address reads on the page. Always the production domain. */
export function storeDomain(store: string) {
  return `${store}.${rootDomain}`;
}

/**
 * True when the marketplace can't share its session cookie with store subdomains.
 * Browsers won't send a `Domain=localhost` cookie to maya.localhost, so in dev a
 * store gets its own copy of the session through a one-time handoff (proxy.ts and
 * app/api/session/*). With a dotted root (resell.store, lvh.me) the cookie is shared.
 */
export const needsSessionHandoff = rootHostname === "localhost";

/**
 * `raw` parsed as an absolute URL on the marketplace or one of its store subdomains
 * (same protocol and port as the root), or null if it points anywhere else.
 */
export function zoneUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== `${protocol}:` || url.username || url.password) return null;
  const root = rootDomain.toLowerCase();
  if (url.host === root) return url;
  const store = storeFromHost(url.host);
  return store && url.host === `${store}.${root}` ? url : null;
}

/** The docs site: docs.resell.store in prod; /docs on the marketplace in dev, where *.localhost may not resolve for every tool. */
export function docsUrl(path = "/") {
  const clean = path === "/" ? "" : path;
  return rootHostname === "localhost" ? siteUrl(`/docs${clean}`) : `${protocol}://docs.${rootDomain}${clean || "/"}`;
}

/** The hosted MCP servers: mcp.resell.store in prod, /api/mcp on the marketplace in dev. */
export function mcpUrl(path = "/") {
  return rootHostname === "localhost" ? siteUrl(`/api/mcp${path}`) : `${protocol}://mcp.${rootDomain}${path}`;
}

/** The public API's base URL. */
export function apiUrl(path = "") {
  return rootHostname === "localhost" ? siteUrl(`/api/v1${path}`) : `${protocol}://api.${rootDomain}/v1${path}`;
}
