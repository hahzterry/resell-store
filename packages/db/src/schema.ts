import { sql, type SQL } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  vector,
} from "drizzle-orm/pg-core";

/*
 * resell.store schema. The first four tables are Better Auth's (user, session,
 * account, verification); the rest is the app. Money is whole cents.
 */

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at").notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

/* Better Auth */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  /** "selling" or "buying", from onboarding (A2). */
  preferredMode: text("preferred_mode").$type<"selling" | "buying">(),
  onboardedAt: timestamp("onboarded_at"),
  about: text("about"),
  location: text("location"),
  interests: text("interests").array().notNull().default(sql`'{}'::text[]`),
  notifyPrefs: jsonb("notify_prefs").$type<Record<string, boolean>>(),
  /** "Write like this" preference saved from the words step. */
  writingStyle: text("writing_style"),
  /** Last time they opened their buyer account (P8). */
  accountSeenAt: timestamp("account_seen_at"),
  /**
   * Where this visit's "new since your last visit" starts: the previous
   * visit's last view. A visit ends after 30 quiet minutes.
   */
  accountVisitFrom: timestamp("account_visit_from"),
  /** Newest listing already in a "new from shops you follow" email. */
  followMailedAt: timestamp("follow_mailed_at"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* Files: uploads. Bytes live in R2 (`storage_key`) when it's configured, else in `data`. */

export const file = pgTable("file", {
  id: id(),
  ownerId: text("owner_id").references(() => user.id, { onDelete: "cascade" }),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  /** Object key in the R2 bucket. */
  storageKey: text("storage_key"),
  /** The bytes themselves, when there's no object storage (local dev without R2). */
  data: bytea("data"),
  createdAt: createdAt(),
});

/* Shops: one per subdomain, {slug}.resell.store */

export type ShopVisibility = "public" | "link" | "private";
/** The colour picked in B1. */
export type ShopTone = "lemon" | "mint" | "pink" | "leaf" | "blush";

export const shop = pgTable(
  "shop",
  {
    id: id(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    about: text("about"),
    category: text("category"),
    tone: text("tone").$type<ShopTone>().notNull().default("lemon"),
    pictureFileId: text("picture_file_id").references(() => file.id, {
      onDelete: "set null",
    }),
    location: text("location"),
    visibility: text("visibility").$type<ShopVisibility>().notNull().default("public"),
    paused: boolean("paused").notNull().default(false),
    /* What the shop's agent may do (B3) */
    answerQuestions: boolean("answer_questions").notNull().default(true),
    haggle: boolean("haggle").notNull().default(true),
    /** Lowest the agent will go, as % off the price. */
    lowestPercent: integer("lowest_percent").notNull().default(15),
    askHold: boolean("ask_hold").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("shop_slug_idx").on(t.slug), index("shop_owner_idx").on(t.ownerId)],
);

/* Listings */

export type ListingStatus = "draft" | "live" | "sold";
export type ListingVisibility = "everyone" | "link";
export type ListingStep = "research" | "details" | "photos" | "words" | "publish";

/** One row in "The item" card. */
export type ListingField = {
  key: string;
  label: string;
  value?: string;
  /** Who filled it in: the agent's research, or the seller. */
  source: "agent" | "you";
};

export type PriceRange = {
  min: number;
  max: number;
  bandLow: number;
  bandHigh: number;
  suggested: number;
};

export type ResearchSourceItem = {
  title: string;
  detail: string;
  value?: string;
  url?: string;
  image?: string;
};

export type ResearchSource = {
  key: string;
  label: string;
  title: string;
  description: string;
  items: ResearchSourceItem[];
};

export type ResearchQuestion = {
  field: string;
  label: string;
  ask: string;
  options: { label: string; value: string }[];
};

export type ResearchFindings = {
  /** One line on what the agent thinks this is. */
  identified: string;
  category: string;
  price: PriceRange;
  /** How sure the agent is about the price. */
  confidence: "low" | "medium" | "high";
  facts: { label: string; value: string }[];
  sources: ResearchSource[];
  questions: ResearchQuestion[];
  /** Maker or retail images that could go in the photos step. */
  images: { url: string; source: string; alt?: string }[];
  summary: string;
  /** What the same thing is listed for second hand right now (comps.ts). */
  comps?: Comps | null;
};

/* Comps: live second-hand listings of the same item (comps.ts) */

export type CompSite = "ebay" | "poshmark" | "depop" | "mercari" | "facebook";

export type Comp = {
  site: CompSite;
  siteLabel: string;
  title: string;
  priceCents: number;
  url: string;
  image: string | null;
  condition: "new" | "used" | "unknown";
  /** Why it counts, or what's different ("Bundle with film"). */
  note: string;
  /** A finished sale (eBay sold search, through a signed-in account), not an asking price. */
  sold?: boolean;
  /** "Sold Sep 28, 2026", as the site said it. */
  soldOn?: string | null;
};

export type Comps = {
  /** What was searched for. */
  item: string;
  queries: string[];
  checkedAt: string;
  /** Listing cards read across all sites. */
  looked: number;
  sites: { site: CompSite; label: string; found: number; ok: boolean }[];
  /** The same item, cheapest first, at most 10. */
  listings: Comp[];
  /** The same item actually sold, when a signed-in eBay account could look (at most 10). */
  sold?: Comp[];
  soldMedianCents?: number | null;
  /** What "sells for" is based on: real sales, or asking prices less a little. */
  basis?: "sold" | "listed";
  listedLowCents: number | null;
  listedMedianCents: number | null;
  listedHighCents: number | null;
  /** What it likely sells for: a little under the listed median. */
  sellsForCents: number | null;
  sellsForLowCents: number | null;
  sellsForHighCents: number | null;
  confidence: "low" | "medium" | "high";
  /** Two or three sentences on what the listings show. */
  notes: string;
};

export const listing = pgTable(
  "listing",
  {
    id: id(),
    shopId: text("shop_id")
      .notNull()
      .references(() => shop.id, { onDelete: "cascade" }),
    /** Path inside the store: maya.broresell.com/{slug}. Set on publish. */
    slug: text("slug"),
    status: text("status").$type<ListingStatus>().notNull().default("draft"),
    visibility: text("visibility").$type<ListingVisibility>().notNull().default("everyone"),
    /** Furthest step reached in the workspace. */
    step: text("step").$type<ListingStep>().notNull().default("research"),
    /** What the seller first typed in C1. */
    prompt: text("prompt"),
    /** Short name used everywhere until the words are written. */
    name: text("name"),
    title: text("title"),
    oneLiner: text("one_liner"),
    description: text("description"),
    category: text("category"),
    fields: jsonb("fields").$type<ListingField[]>().notNull().default([]),
    priceCents: integer("price_cents"),
    lowestCents: integer("lowest_cents"),
    shippingCents: integer("shipping_cents"),
    takeOffers: boolean("take_offers").notNull().default(true),
    tone: text("tone"),
    findings: jsonb("findings").$type<ResearchFindings>(),
    publishedAt: timestamp("published_at"),
    soldAt: timestamp("sold_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    /** Full-text search over the public words. */
    search: tsvector("search").generatedAlwaysAs(
      (): SQL =>
        sql`setweight(to_tsvector('english', coalesce(${listing.title}, '') || ' ' || coalesce(${listing.name}, '')), 'A') || setweight(to_tsvector('english', coalesce(${listing.oneLiner}, '') || ' ' || coalesce(${listing.category}, '')), 'B') || setweight(to_tsvector('english', coalesce(${listing.description}, '')), 'C')`,
    ),
    /** Jina embedding of the public words, for semantic search. */
    embedding: vector("embedding", { dimensions: 1024 }),
  },
  (t) => [
    index("listing_shop_idx").on(t.shopId, t.status),
    uniqueIndex("listing_shop_slug_idx").on(t.shopId, t.slug),
    index("listing_search_idx").using("gin", t.search),
    index("listing_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
  ],
);

export const listingPhoto = pgTable(
  "listing_photo",
  {
    id: id(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listing.id, { onDelete: "cascade" }),
    /** An upload, or… */
    fileId: text("file_id").references(() => file.id, { onDelete: "cascade" }),
    /** …a picture found on the web, credited to `source`. */
    url: text("url"),
    source: text("source"),
    alt: text("alt"),
    isVideo: boolean("is_video").notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("listing_photo_listing_idx").on(t.listingId, t.position)],
);

/** Each take the agent wrote in the words step (C6). */
export const listingCopy = pgTable(
  "listing_copy",
  {
    id: id(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listing.id, { onDelete: "cascade" }),
    tone: text("tone").notNull(),
    title: text("title").notNull(),
    oneLiner: text("one_liner").notNull(),
    description: text("description").notNull(),
    teaser: text("teaser").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("listing_copy_listing_idx").on(t.listingId, t.createdAt)],
);

/** Research progress, one row per run. Written by the research job, polled by C2. */
export type ResearchStepState = "queued" | "running" | "done" | "failed";
export type ResearchStepRow = {
  key: string;
  tag: string;
  state: ResearchStepState;
  title: string;
  detail: string;
};

export const researchRun = pgTable(
  "research_run",
  {
    id: id(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listing.id, { onDelete: "cascade" }),
    status: text("status").$type<"running" | "done" | "failed">().notNull().default("running"),
    steps: jsonb("steps").$type<ResearchStepRow[]>().notNull().default([]),
    error: text("error"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("research_run_listing_idx").on(t.listingId, t.createdAt)],
);

/** The chat beside each workspace step, as AI SDK UI messages. */
export const listingMessage = pgTable(
  "listing_message",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listing.id, { onDelete: "cascade" }),
    step: text("step").$type<ListingStep>().notNull(),
    role: text("role").$type<"user" | "assistant" | "system">().notNull(),
    parts: jsonb("parts").$type<unknown[]>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("listing_message_idx").on(t.listingId, t.step, t.createdAt)],
);

/* Offers (P5, C9, C10) */

export type OfferStatus =
  /** Waiting on the seller. */
  | "open"
  /** The seller named a price; waiting on the buyer. */
  | "countered"
  /** Agreed; the buyer has until expiresAt to pay. */
  | "accepted"
  | "declined"
  | "withdrawn"
  | "expired"
  /** Paid: an order exists for it. */
  | "paid";

export const offer = pgTable(
  "offer",
  {
    id: id(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listing.id, { onDelete: "cascade" }),
    shopId: text("shop_id")
      .notNull()
      .references(() => shop.id, { onDelete: "cascade" }),
    buyerId: text("buyer_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    /** The seller's counter, when status is "countered" (or accepted after one). */
    counterCents: integer("counter_cents"),
    /** Who made the counter: the seller, or the shop's agent haggling within its lowest. */
    counteredBy: text("countered_by").$type<"seller" | "agent">(),
    /** The agent's line to the seller about this offer (never shown to the buyer). */
    agentNote: text("agent_note"),
    note: text("note"),
    /** Held to show the offer is serious. Mock until PayPal: nothing is charged. */
    depositCents: integer("deposit_cents"),
    status: text("status").$type<OfferStatus>().notNull().default("open"),
    /** Open and countered offers lapse; accepted ones must be paid by then. */
    expiresAt: timestamp("expires_at").notNull(),
    respondedAt: timestamp("responded_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("offer_listing_idx").on(t.listingId, t.status),
    index("offer_buyer_idx").on(t.buyerId, t.createdAt),
    index("offer_shop_idx").on(t.shopId, t.status),
  ],
);

/* Orders (P4, P8, B5) */

export type OrderStatus =
  /** Paid; the money is held until the buyer has it. */
  | "paid"
  | "shipped"
  | "delivered"
  /** The buyer said it's all good (or 3 days passed): the seller is paid. */
  | "completed"
  | "refunded"
  | "cancelled";

export type ShipTo = { name: string; address: string; country: string };

export const orders = pgTable(
  "orders",
  {
    id: id(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listing.id, { onDelete: "restrict" }),
    shopId: text("shop_id")
      .notNull()
      .references(() => shop.id, { onDelete: "restrict" }),
    buyerId: text("buyer_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    offerId: text("offer_id").references(() => offer.id, { onDelete: "set null" }),
    itemCents: integer("item_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    delivery: text("delivery").$type<"tracked" | "express">().notNull(),
    payMethod: text("pay_method").$type<"paypal" | "card">().notNull(),
    shipTo: jsonb("ship_to").$type<ShipTo>().notNull(),
    status: text("status").$type<OrderStatus>().notNull().default("paid"),
    /** "paypal", or "mock" for test checkouts made without PayPal keys. */
    paymentProvider: text("payment_provider").notNull().default("mock"),
    /** The PayPal capture id: what a release or refund points at. */
    paymentRef: text("payment_ref"),
    /** Where the money goes: the seller's PayPal merchant id. */
    payeeMerchantId: text("payee_merchant_id"),
    /** What the platform keeps (payout-policy.ts). */
    platformFeeCents: integer("platform_fee_cents"),
    /** PayPal's processing fee, taken from the seller's share. */
    paypalFeeCents: integer("paypal_fee_cents"),
    /** What the seller gets once the money is released. */
    sellerNetCents: integer("seller_net_cents"),
    /** The held money went to the seller (PayPal referenced payout). */
    releasedAt: timestamp("released_at"),
    payoutRef: text("payout_ref"),
    /** Money given back to the buyer so far: all of it on a refund, part of it after a problem. */
    refundedCents: integer("refunded_cents").notNull().default(0),
    /** PayPal's id for the last refund. */
    refundRef: text("refund_ref"),
    refundedAt: timestamp("refunded_at"),
    trackingNumber: text("tracking_number"),
    shippedAt: timestamp("shipped_at"),
    deliveredAt: timestamp("delivered_at"),
    completedAt: timestamp("completed_at"),
    /** Called off before it shipped (by either side, or because it never shipped). */
    cancelledAt: timestamp("cancelled_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("orders_buyer_idx").on(t.buyerId, t.createdAt),
    index("orders_shop_idx").on(t.shopId, t.createdAt),
    // One listing, one sale: a second order for it fails even under a race
    uniqueIndex("orders_one_per_listing_idx")
      .on(t.listingId)
      .where(sql`${t.status} not in ('refunded', 'cancelled')`),
  ],
);

/* Reviews */

/**
 * A buyer's rating of an order once it's done: 1 to 5 stars and a few words.
 * Public reviews show on the store and the listing; private ones only reach
 * the seller. One per order. The seller can reply once.
 */
export const review = pgTable(
  "review",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    listingId: text("listing_id")
      .notNull()
      .references(() => listing.id, { onDelete: "cascade" }),
    shopId: text("shop_id")
      .notNull()
      .references(() => shop.id, { onDelete: "cascade" }),
    buyerId: text("buyer_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    body: text("body"),
    /** Shown on the store and listing. Private reviews only reach the seller. */
    public: boolean("public").notNull().default(true),
    sellerReply: text("seller_reply"),
    repliedAt: timestamp("replied_at"),
    /** Taken down by resell.store (abuse); kept for the record. */
    hiddenAt: timestamp("hidden_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("review_order_idx").on(t.orderId),
    index("review_shop_idx").on(t.shopId, t.createdAt),
    index("review_listing_idx").on(t.listingId),
  ],
);

/* Problems with an order: refunds and disputes */

export type DisputeReason = "not_arrived" | "not_as_described" | "damaged" | "other";

export type DisputeStatus =
  /** Waiting on the two sides to sort it out. The seller isn't paid meanwhile. */
  | "open"
  /** Someone asked resell.store to step in. */
  | "escalated"
  /** Over: the buyer got some or all of their money back. */
  | "refunded"
  /** Over: no refund (the buyer said it's sorted, or it was decided for the seller). */
  | "closed";

/**
 * A buyer's problem with an order, reported here or opened in PayPal (then
 * synced by the webhook). While one is open or escalated the held money
 * stays held. At most one is live per order.
 */
export const dispute = pgTable(
  "dispute",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    /** "buyer" when reported on resell.store, "paypal" when opened in PayPal. */
    source: text("source").$type<"buyer" | "paypal">().notNull().default("buyer"),
    reason: text("reason").$type<DisputeReason>().notNull(),
    details: text("details"),
    status: text("status").$type<DisputeStatus>().notNull().default("open"),
    /** The seller's offer of part of the money back, waiting on the buyer. */
    offerCents: integer("offer_cents"),
    /** PayPal's dispute id (PP-D-…), for disputes opened there. */
    providerDisputeId: text("provider_dispute_id"),
    escalatedAt: timestamp("escalated_at"),
    resolvedAt: timestamp("resolved_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("dispute_one_live_per_order_idx")
      .on(t.orderId)
      .where(sql`${t.status} in ('open', 'escalated')`),
    uniqueIndex("dispute_provider_idx").on(t.providerDisputeId),
    index("dispute_status_idx").on(t.status, t.createdAt),
  ],
);

export type DisputeEventKind =
  | "opened"
  | "message"
  | "refund_offered"
  | "offer_declined"
  | "refunded"
  | "escalated"
  | "closed";

/** The timeline of a dispute: who said or did what. */
export const disputeEvent = pgTable(
  "dispute_event",
  {
    id: id(),
    disputeId: text("dispute_id")
      .notNull()
      .references(() => dispute.id, { onDelete: "cascade" }),
    side: text("side").$type<"buyer" | "seller" | "platform">().notNull(),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    kind: text("kind").$type<DisputeEventKind>().notNull(),
    body: text("body"),
    amountCents: integer("amount_cents"),
    createdAt: createdAt(),
  },
  (t) => [index("dispute_event_dispute_idx").on(t.disputeId, t.createdAt)],
);

/* Reminders */

/**
 * Every reminder or timed email that went out, so the sweeps never send one
 * twice: (kind, the offer or order it was about).
 */
export const notice = pgTable(
  "notice",
  {
    kind: text("kind").notNull(),
    refId: text("ref_id").notNull(),
    sentAt: timestamp("sent_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.kind, t.refId] })],
);

/* PayPal */

/** Every PayPal webhook we've taken in, by PayPal's event id: a redelivery is a no-op. */
export const paypalEvent = pgTable(
  "paypal_event",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    resourceId: text("resource_id"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    processedAt: timestamp("processed_at"),
    error: text("error"),
    receivedAt: timestamp("received_at").notNull().defaultNow(),
  },
  (t) => [index("paypal_event_type_idx").on(t.type, t.receivedAt)],
);

/**
 * A seller's PayPal account, connected through Partner Referrals. One per
 * person, shared by all their shops. The tracking id PayPal knows them by is
 * the user id.
 */
export const paypalAccount = pgTable("paypal_account", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  merchantId: text("merchant_id").notNull(),
  /** Can take payments now; false until the seller confirms their email. */
  paymentsReceivable: boolean("payments_receivable").notNull().default(false),
  emailConfirmed: boolean("email_confirmed").notNull().default(false),
  /** What the seller granted us, e.g. "partnerfee", "delay-funds-disbursement". */
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  /** Sandbox: linked to the shared demo seller, not an account they connected. */
  demo: boolean("demo").notNull().default(false),
  connectedAt: timestamp("connected_at").notNull().defaultNow(),
  updatedAt: updatedAt(),
});

export type CheckoutStatus = "created" | "completed" | "failed";

/**
 * A buyer on their way through PayPal: what they chose before leaving, so the
 * order can be placed when PayPal sends them back. Keyed by PayPal's order id.
 */
export const checkout = pgTable(
  "checkout",
  {
    id: id(),
    providerOrderId: text("provider_order_id").notNull(),
    buyerId: text("buyer_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    listingId: text("listing_id")
      .notNull()
      .references(() => listing.id, { onDelete: "cascade" }),
    offerId: text("offer_id").references(() => offer.id, { onDelete: "set null" }),
    delivery: text("delivery").$type<"tracked" | "express">().notNull(),
    payMethod: text("pay_method").$type<"paypal" | "card">().notNull(),
    shipTo: jsonb("ship_to").$type<ShipTo>().notNull(),
    itemCents: integer("item_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    platformFeeCents: integer("platform_fee_cents").notNull(),
    payeeMerchantId: text("payee_merchant_id").notNull(),
    status: text("status").$type<CheckoutStatus>().notNull().default("created"),
    orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("checkout_provider_order_idx").on(t.providerOrderId)],
);

/* Messages (P6 buyer, A5 seller inbox) */

/**
 * One conversation between a buyer and a shop, optionally about one listing.
 * A buyer has at most one thread per shop per listing (or per shop, with no
 * listing). Read marks are per side: a thread is unread for a side when its
 * last message is newer than that side's read mark and the other side wrote it.
 */
export const thread = pgTable(
  "thread",
  {
    id: id(),
    shopId: text("shop_id")
      .notNull()
      .references(() => shop.id, { onDelete: "cascade" }),
    buyerId: text("buyer_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    listingId: text("listing_id").references(() => listing.id, { onDelete: "set null" }),
    lastMessageAt: timestamp("last_message_at").notNull().defaultNow(),
    /** Who wrote the last message, for unread maths and "You:" previews. */
    lastSide: text("last_side").$type<"buyer" | "seller">().notNull().default("buyer"),
    lastPreview: text("last_preview").notNull().default(""),
    /** The last message is the shop's agent answering, so the seller should see it. */
    lastByAgent: boolean("last_by_agent").notNull().default(false),
    /** The agent couldn't answer and handed it to the seller; cleared when they reply. */
    needsSeller: boolean("needs_seller").notNull().default(false),
    buyerReadAt: timestamp("buyer_read_at"),
    sellerReadAt: timestamp("seller_read_at"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("thread_buyer_shop_listing_idx").on(t.buyerId, t.shopId, sql`coalesce(${t.listingId}, '')`),
    index("thread_shop_idx").on(t.shopId, t.lastMessageAt),
    index("thread_buyer_idx").on(t.buyerId, t.lastMessageAt),
  ],
);

export const message = pgTable(
  "message",
  {
    id: id(),
    threadId: text("thread_id")
      .notNull()
      .references(() => thread.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    /** Which side of the thread wrote it: the buyer, or the shop (its owner). */
    side: text("side").$type<"buyer" | "seller">().notNull(),
    /** Written by the shop's agent on the seller's side (store-agent.ts), not the owner. */
    byAgent: boolean("by_agent").notNull().default(false),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("message_thread_idx").on(t.threadId, t.createdAt)],
);

/* Following shops */

export const follow = pgTable(
  "follow",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    shopId: text("shop_id")
      .notNull()
      .references(() => shop.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.shopId] }), index("follow_shop_idx").on(t.shopId)],
);


/* Stats: what people do on stores and listings (B4, C9, B2) */

export type ActivityKind = "view" | "share";

/**
 * Where a view came from, worked out from the referrer and ?ref= / utm_source:
 * "direct" (typed, or a link with no referrer: usually the seller's own link),
 * "marketplace", "store", "search", "social", "qr", "other".
 */
export type ActivitySource = "direct" | "marketplace" | "store" | "search" | "social" | "qr" | "other";

/**
 * Page views and shares. Views are counted once per visitor per page per 30
 * minutes, never the owner's own. Likes and follows have their own tables;
 * offers and orders are counted from theirs.
 */
export const activity = pgTable(
  "activity",
  {
    id: id(),
    kind: text("kind").$type<ActivityKind>().notNull(),
    shopId: text("shop_id")
      .notNull()
      .references(() => shop.id, { onDelete: "cascade" }),
    /** Null for the store's own page. */
    listingId: text("listing_id").references(() => listing.id, { onDelete: "cascade" }),
    /** An anonymous id from a cookie, so one person's refreshes count once. */
    visitorId: text("visitor_id"),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    source: text("source").$type<ActivitySource>(),
    createdAt: createdAt(),
  },
  (t) => [
    index("activity_shop_idx").on(t.shopId, t.kind, t.createdAt),
    index("activity_listing_idx").on(t.listingId, t.kind, t.createdAt),
    index("activity_visitor_idx").on(t.visitorId, t.createdAt),
  ],
);

/** Likes (the heart): someone saved a listing. */
export const favourite = pgTable(
  "favourite",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    listingId: text("listing_id")
      .notNull()
      .references(() => listing.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.listingId] }), index("favourite_listing_idx").on(t.listingId)],
);

/* Developer access: API keys, agent links (MCP) and webhooks (D2, D3) */

/**
 * What a key may do. "read" covers every GET of the owner's own things; the
 * rest each unlock one kind of change. Public marketplace reads need no scope.
 */
export type ApiScope =
  | "read"
  | "shops"
  | "listings"
  | "messages"
  | "offers"
  | "orders"
  | "buying"
  | "webhooks";

/**
 * "api": a secret key for scripts (D3), every scope. "agent": the private link
 * an AI app connects through (D2), with the scopes the owner switched on.
 */
export type ApiKeyKind = "api" | "agent";

/**
 * Keys are looked up by their SHA-256 hash; `start` and `last4` are kept so
 * the screens can show which key it is, and `tokenSealed` (AES-GCM, see
 * apps/app lib/server/api/keys.ts) so the owner can see and copy it again.
 * Revoked keys stay for the record.
 */
export const apiKey = pgTable(
  "api_key",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").$type<ApiKeyKind>().notNull(),
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull(),
    /** The token, encrypted, so its owner can show it again. Null for keys made before 0017. */
    tokenSealed: text("token_sealed"),
    /** The readable front of the key: "rs_live_" or "maya-". */
    start: text("start").notNull(),
    last4: text("last4").notNull(),
    scopes: jsonb("scopes").$type<ApiScope[]>().notNull().default([]),
    /** Scopes the AI app must confirm with the owner before using ("Ask me first"). */
    askFirst: jsonb("ask_first").$type<ApiScope[]>().notNull().default([]),
    /**
     * Agent links: the most it may offer, or agree to, for one thing (P7's
     * "Most it can spend on one order"). Null for no ceiling.
     */
    maxOfferCents: integer("max_offer_cents"),
    lastUsedAt: timestamp("last_used_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("api_key_token_idx").on(t.tokenHash),
    index("api_key_user_idx").on(t.userId, t.kind),
  ],
);

/** Requests per person per calendar month (UTC), for the usage meter and the limit. */
export const apiUsage = pgTable(
  "api_usage",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** "2026-10" */
    month: text("month").notNull(),
    requests: integer("requests").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.month] })],
);

/**
 * What keys changed, one row per write (D2 "What it did lately"). Reads
 * aren't kept. `text` is written for the owner: 'Offered $120 on "Lamp"'.
 */
export const apiActivity = pgTable(
  "api_activity",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    keyId: text("key_id")
      .notNull()
      .references(() => apiKey.id, { onDelete: "cascade" }),
    keyKind: text("key_kind").$type<ApiKeyKind>().notNull(),
    /** The app that did it ("Claude", "ChatGPT"), when we can tell. */
    client: text("client"),
    /** The route: "POST /offers". */
    action: text("action").notNull(),
    text: text("text").notNull(),
    href: text("href"),
    /** It checked with the owner before doing it ("Ask me first"). */
    askedFirst: boolean("asked_first").notNull().default(false),
    /** False when it tried something the key isn't allowed to do. */
    ok: boolean("ok").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("api_activity_user_idx").on(t.userId, t.keyKind, t.createdAt)],
);

/** Which apps use a key, and when each was last seen (D2 "Using your link now"). */
export const apiClient = pgTable(
  "api_client",
  {
    keyId: text("key_id")
      .notNull()
      .references(() => apiKey.id, { onDelete: "cascade" }),
    client: text("client").notNull(),
    firstSeenAt: timestamp("first_seen_at").notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.keyId, t.client] })],
);

/** Things that happen to a seller's shops, told to their server. */
export type WebhookEvent =
  | "listing.sold"
  | "offer.received"
  | "offer.updated"
  | "question.asked"
  | "order.completed"
  | "order.problem"
  | "order.refunded"
  | "payout.sent"
  | "review.created";

/** Where we tell a seller's server about things (one per person; Zaps and other tools use subscriptions). */
export const webhookEndpoint = pgTable("webhook_endpoint", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  /** Signs each delivery (Resell-Signature header). */
  secret: text("secret").notNull(),
  events: jsonb("events").$type<WebhookEvent[]>().notNull().default([]),
  enabled: boolean("enabled").notNull().default(true),
  lastStatus: integer("last_status"),
  lastError: text("last_error"),
  lastDeliveredAt: timestamp("last_delivered_at"),
  /** When deliveries started failing; null while they work. Three days of it turns the webhook off. */
  failingSince: timestamp("failing_since"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Who added a hook subscription: the resell.store Zapier app, the API page (a pasted Zapier or other address), or a key. */
export type WebhookSubscriptionSource = "zapier" | "app" | "api";

/**
 * Extra places to send events, each with its own events (REST hooks). The
 * resell.store Zapier app makes one when a Zap is turned on and deletes it
 * when the Zap is turned off; a seller can also paste a Webhooks by Zapier
 * (or Make, n8n…) address on the API page. Signed like the endpoint, with
 * their own secret.
 */
export const webhookSubscription = pgTable(
  "webhook_subscription",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    events: jsonb("events").$type<WebhookEvent[]>().notNull().default([]),
    secret: text("secret").notNull(),
    source: text("source").$type<WebhookSubscriptionSource>().notNull(),
    /** What the owner sees it called: the Zap's name, or what they typed. */
    name: text("name"),
    enabled: boolean("enabled").notNull().default(true),
    lastStatus: integer("last_status"),
    lastError: text("last_error"),
    lastDeliveredAt: timestamp("last_delivered_at"),
    /** As on the endpoint: three days of failures turns it off. */
    failingSince: timestamp("failing_since"),
    createdAt: createdAt(),
  },
  (t) => [index("webhook_subscription_user_idx").on(t.userId)],
);

export type WebhookDeliveryStatus = "pending" | "delivered" | "failed";

/**
 * One event on its way to a seller's server. A failed send is tried again
 * with backoff by the webhook sweep; the event (and its id) stay the same.
 */
export const webhookDelivery = pgTable(
  "webhook_delivery",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Set when it's going to a subscription; null for the seller's endpoint. */
    subscriptionId: text("subscription_id").references(() => webhookSubscription.id, { onDelete: "cascade" }),
    /** "evt_…", the same on every attempt so receivers can skip repeats. */
    eventId: text("event_id").notNull(),
    type: text("type").notNull(),
    /** The JSON body as sent. */
    body: text("body").notNull(),
    status: text("status").$type<WebhookDeliveryStatus>().notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at"),
    lastStatus: integer("last_status"),
    lastError: text("last_error"),
    deliveredAt: timestamp("delivered_at"),
    createdAt: createdAt(),
  },
  (t) => [
    index("webhook_delivery_due_idx").on(t.status, t.nextAttemptAt),
    index("webhook_delivery_user_idx").on(t.userId, t.createdAt),
  ],
);

/* Shopping sidekick (D4): things checked before buying */

export type PriceCheckStatus = "running" | "done" | "failed";

export const priceCheck = pgTable(
  "price_check",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** What they typed or pasted. */
    query: text("query").notNull(),
    /** What it is, once worked out. */
    name: text("name"),
    status: text("status").$type<PriceCheckStatus>().notNull().default("running"),
    /** What it costs new, and where that came from. */
    retailCents: integer("retail_cents"),
    retailSource: text("retail_source"),
    comps: jsonb("comps").$type<Comps>(),
    error: text("error"),
    /** "I bought it": it's theirs now, ready to list. */
    bought: boolean("bought").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("price_check_user_idx").on(t.userId, t.createdAt)],
);

/* Marketplace logins (D1): the seller's own accounts, signed in through Kernel managed auth */

export type MarketLoginStatus = "pending" | "connected" | "needs_auth" | "failed";

export const marketLogin = pgTable(
  "market_login",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Which site: ebay, facebook, mercari, poshmark, depop. */
    site: text("site").$type<CompSite>().notNull(),
    /** Kernel's auth connection. */
    connectionId: text("connection_id").notNull(),
    /** The Kernel browser profile that holds the signed-in session. */
    profileName: text("profile_name").notNull(),
    status: text("status").$type<MarketLoginStatus>().notNull().default("pending"),
    lastError: text("last_error"),
    connectedAt: timestamp("connected_at"),
    checkedAt: timestamp("checked_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.site] })],
);

/*
 * The shared demo accounts (DEMO=true): "baseline" is when the demo started from
 * the seed, "reset" the last time it was put back. Everything the demo accounts
 * add after the baseline is removed on reset.
 */
export const demoState = pgTable("demo_state", {
  key: text("key").$type<"baseline" | "reset">().primaryKey(),
  at: timestamp("at").notNull(),
});
