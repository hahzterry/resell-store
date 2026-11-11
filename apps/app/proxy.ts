import { NextResponse, type NextRequest } from "next/server";
import { needsSessionHandoff, serviceFromHost, storeFromHost, storeUrl } from "./lib/urls";

/*
 * Store subdomains are rewritten onto /store/{store}, so maya.broresell.com/linen-wrap-dress
 * renders app/store/[store]/[listing]. Auth is checked in each layout, not here.
 *
 * Session handoff (dev on localhost only, see needsSessionHandoff): a store host can't
 * read the marketplace's cookie, so the first page load on a store without a session
 * bounces through /api/session/handoff (on the store host, then the marketplace) and
 * comes back via /api/session/accept with the session copied over, or straight back
 * if signed out.
 * The rs_handoff cookie stops it asking again for 10 minutes.
 */

/**
 * Share images under a store: /store/{store}/opengraph-image on the marketplace (what
 * og:image points at) or /opengraph-image, /{listing}/twitter-image… on the store host.
 */
const SHARE_IMAGE = /^(?:\/store\/[^/]+)?(?:\/[^/]+)?\/(?:opengraph|twitter)-image(?:-[\w-]+)?$/;

const SESSION_COOKIES = ["better-auth.session_token", "__Secure-better-auth.session_token"];
const HANDOFF_COOKIE = "rs_handoff";

/** A full page load on a store host with no session and no recent handoff attempt. */
function wantsSessionHandoff(req: NextRequest) {
  if (!needsSessionHandoff || req.method !== "GET") return false;
  const h = req.headers;
  if (!h.get("accept")?.includes("text/html")) return false;
  // Client navigations and prefetches (RSC payloads) aren't page loads
  if (h.get("rsc") || h.get("next-router-prefetch") || h.get("next-action")) return false;
  if (h.get("purpose") === "prefetch" || h.get("sec-purpose")?.includes("prefetch")) return false;
  if (req.cookies.has(HANDOFF_COOKIE)) return false;
  return !SESSION_COOKIES.some((name) => req.cookies.has(name));
}

/**
 * api.resell.store/v1/x → /api/v1/x, mcp.resell.store/x → /api/mcp/x and
 * docs.resell.store/x → /docs/x. Null when the host isn't one of those.
 */
function serviceRewrite(req: NextRequest) {
  const service = serviceFromHost(req.headers.get("host"));
  if (!service) return null;
  const url = req.nextUrl.clone();
  const path = url.pathname === "/" ? "" : url.pathname;
  if (service === "api") url.pathname = `/api/v1${path.replace(/^\/v1(?=\/|$)/, "")}`;
  else if (service === "mcp") url.pathname = `/api/mcp${path}`;
  else url.pathname = path.startsWith("/_next") ? path : `/docs${path}`;
  return NextResponse.rewrite(url);
}

export default function proxy(req: NextRequest) {
  const service = serviceRewrite(req);
  if (service) return service;

  const url = req.nextUrl.clone();
  const store = storeFromHost(req.headers.get("host"));

  if (url.pathname.startsWith("/api/")) return;

  // Crawlers fetch share images without cookies: never bounce them
  const shareImage = SHARE_IMAGE.test(url.pathname);

  if (!store) {
    // Served here, not redirected to the subdomain like other /store/ paths
    if (shareImage) return;
    // /store/maya/x on the marketplace host → maya.broresell.com/x, so store links stay relative
    const match = url.pathname.match(/^\/store\/([^/]+)(\/.*)?$/);
    if (match) return NextResponse.redirect(storeUrl(match[1]!, (match[2] ?? "/") + url.search));
    return;
  }

  if (!shareImage && wantsSessionHandoff(req)) {
    // To this store's own handoff route, which forwards to the marketplace's. Next would
    // relativize a redirect to localhost:5689 from here (dev's request URL has that
    // origin), so the browser would stay on the store host anyway.
    const to = storeUrl(store, url.pathname + url.search);
    const res = NextResponse.redirect(
      storeUrl(store, `/api/session/handoff?to=${encodeURIComponent(to)}`),
    );
    res.cookies.set(HANDOFF_COOKIE, "1", { path: "/", maxAge: 600, httpOnly: true, sameSite: "lax" });
    return res;
  }

  url.pathname = `/store/${store}${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
