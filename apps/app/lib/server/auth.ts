import "server-only";
import { createElement } from "react";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink, oneTimeToken } from "better-auth/plugins";
import { db, schema } from "@repo/db";
import { SignInEmail, signInSubject } from "@repo/email";
import { rootDomain } from "../urls";
import { sendEmail } from "./email";
import { captureDemoLink } from "./demo";
import { isDevTestAddress, rememberDevLink } from "./dev-links";
import { linkFromPayPalLogin } from "./paypal-sellers";

const rootHostname = rootDomain.split(":")[0]!;
const isLocal = rootHostname === "localhost";
const protocol = isLocal ? "http" : "https";

/**
 * "Continue with PayPal" (Log in with PayPal) reuses the platform app's keys. The
 * app needs Log in with PayPal turned on, with email and name, and
 * {BETTER_AUTH_URL}/api/auth/callback/paypal as its return URL.
 */
export const paypalSignInEnabled = !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);

const paypalLive = process.env.PAYPAL_ENV === "live";
const paypalWeb = paypalLive ? "https://www.paypal.com" : "https://www.sandbox.paypal.com";
const paypalApi = paypalLive ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

type PayPalProfile = {
  user_id: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
  emails?: { value: string; primary?: boolean; confirmed?: boolean }[];
};

/**
 * Who signed in with PayPal. Ours rather than Better Auth's: PayPal's
 * paypalv1.1 profile lists addresses under `emails`, which Better Auth's
 * version doesn't read, so every sign-in came back without an email.
 */
async function paypalProfile(token: { accessToken?: string }) {
  if (!token.accessToken) return null;
  const res = await fetch(`${paypalApi}/v1/identity/oauth2/userinfo?schema=paypalv1.1`, {
    headers: { Authorization: `Bearer ${token.accessToken}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("[paypal sign-in] userinfo failed", res.status, await res.text().catch(() => ""));
    return null;
  }
  const p = (await res.json()) as PayPalProfile;
  const primary = p.emails?.find((e) => e.primary) ?? p.emails?.[0];
  const email = p.email ?? primary?.value;
  // Their PayPal account id, what the sign-in is linked by
  if (!p.user_id) {
    console.error("[paypal sign-in] profile without a user_id");
    return null;
  }
  if (!email) {
    console.error("[paypal sign-in] no email: turn on Email under Log in with PayPal for the app");
    return null;
  }
  const name = p.name || [p.given_name, p.family_name].filter(Boolean).join(" ") || email.split("@")[0]!;
  const emailVerified = p.email_verified ?? primary?.confirmed ?? false;
  return {
    user: { name, email, image: p.picture, emailVerified },
    data: { ...p, user_id: p.user_id, name, email, email_verified: emailVerified, given_name: p.given_name ?? "", family_name: p.family_name ?? "" },
  };
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  // ==========================================
  // BRORESELL.COM - TRUSTED ORIGINS
  // ==========================================
  // Allow the main marketplace, www, and seller subdomains.
  // Preserve dynamically configured origins for development.

  trustedOrigins: [
    `${protocol}://${rootDomain}`,
    `${protocol}://*.${rootDomain}`,
    "https://broresell.com",
    "https://www.broresell.com",
    "https://*.broresell.com",
  ],

  // ==========================================
  // BRORESELL.COM - SHARED SESSIONS
  // ==========================================
  // Production sessions are shared across .broresell.com.
  // In development, localhost uses host-only cookies
  // and the existing one-time-token session handoff.

  advanced: isLocal
    ? {}
    : {
        crossSubDomainCookies: {
          enabled: true,
          domain: `.${rootHostname}`,
        },
      },

  // ==========================================
  // PAYPAL AUTHENTICATION
  // ==========================================
  // Preserve existing PayPal Sandbox/Live configuration.

  socialProviders: paypalSignInEnabled
    ? {
        paypal: {
          clientId: process.env.PAYPAL_CLIENT_ID!,
          clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
          environment: paypalLive ? "live" : "sandbox",
          authorizationEndpoint: `${paypalWeb}/connect?flowEntry=static&scope=${encodeURIComponent("openid email profile")}`,
          getUserInfo: paypalProfile,
        },
      }
  : {},
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  databaseHooks: {
    user: {
      create: {
        // Email-link sign-ups arrive without a name: start from the address
        before: async (user) => ({
          data: { ...user, name: user.name?.trim() || nameFromEmail(user.email) },
        }),
      },
    },
    // Signed in with PayPal: link that PayPal for payouts if it's already connected to us
    account: {
      create: { after: async (row) => linkPayPalLogin(row) },
      update: { after: async (row) => linkPayPalLogin(row) },
    },
  },
  plugins: [
    magicLink({
      expiresIn: 60 * 15,
      sendMagicLink: async ({ email, url, token }) => {
        // A demo sign-in (app/api/demo/sign-in) uses the token straight away
        if (captureDemoLink(token)) return;
        rememberDevLink(email, url);
        if (isDevTestAddress(email)) return;
        await sendEmail({
          to: email,
          subject: signInSubject(),
          react: createElement(SignInEmail, { url, email, expiresIn: 15 }),
        });
      },
    }),
    // Dev session handoff to store subdomains (see needsSessionHandoff in lib/urls.ts).
    // Tokens are minted server-side only, used once, and last a minute. Verifying one
    // copies the *same* session (session.session.token) onto the store host, so signing
    // out anywhere deletes the DB row and both cookies stop working, once the 5-minute
    // cookieCache on the other host runs out.
    oneTimeToken({ expiresIn: 1, disableClientRequest: true }),
    nextCookies(),
  ],
});

/** Never holds up signing in: a seller can still connect from Connections. */
async function linkPayPalLogin(row: { providerId?: string; userId?: string; accessToken?: string | null }) {
  if (row.providerId !== "paypal" || !row.userId || !row.accessToken) return;
  try {
    await linkFromPayPalLogin(row.userId, row.accessToken);
  } catch (error) {
    console.error("Linking PayPal from sign-in failed", error);
  }
}

/** "maya.rivera@example.com" → "Maya Rivera" */
function nameFromEmail(email: string) {
  return email
    .split("@")[0]!
    .split(/[._+-]+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
}
