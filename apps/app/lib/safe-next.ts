import { needsSessionHandoff, siteUrl, storeFromHost, zoneUrl } from "./urls";

/**
 * /welcome as the magic link's callbackURL, carrying on to `next`. Better Auth's verify
 * endpoint decodes callbackURL once more after reading the query, so `next` is encoded
 * twice to keep its own ?a=1&b=2 intact (safeNext also accepts it encoded one level too
 * deep, which is how PayPal's redirect leaves it).
 */
export const welcomeReturnTo = (next?: string | null) =>
  next ? `/welcome?next=${encodeURIComponent(encodeURIComponent(next))}` : "/welcome";

/** A same-origin path (e.g. `/checkout/x?y=1`), or null if it isn't one. */
export function safePath(raw: string | null | undefined) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null;
  return raw;
}

/**
 * Somewhere to come back to after signing in, or null if it isn't safe: a relative
 * path, or an absolute URL on the marketplace or one of its store subdomains (so a
 * sign-in started on maya.broresell.com/linen-wrap-dress lands back there).
 */
export function safeNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw.startsWith("/")) return safePath(raw);
  // Still percent-encoded (the magic link's callbackURL encodes `next` twice): decode once
  if (/^(%2F|https?%3A)/i.test(raw)) {
    try {
      return safeNext(decodeURIComponent(raw));
    } catch {
      return null;
    }
  }
  return zoneUrl(raw)?.href ?? null;
}

/**
 * Where to send someone who is signed in on the marketplace and wants `next` (from
 * safeNext). A store URL goes through the session handoff when stores can't read
 * the marketplace cookie (dev on localhost), so they arrive signed in.
 */
export function afterSignIn(next: string) {
  if (next.startsWith("/") || !needsSessionHandoff) return next;
  const url = zoneUrl(next);
  if (!url || !storeFromHost(url.host)) return next;
  return `/api/session/handoff?to=${encodeURIComponent(url.href)}`;
}

/** The sign-in page (relative, on the marketplace), coming back to `path` afterwards. */
export function signInHref(path: string) {
  return `/welcome?next=${encodeURIComponent(path)}`;
}

/** The marketplace sign-in page as an absolute URL, for links from store pages. */
export function signInUrl(returnTo: string) {
  return siteUrl(signInHref(returnTo));
}
