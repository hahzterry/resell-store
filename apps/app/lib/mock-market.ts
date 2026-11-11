/*
 * Public marketplace catalog for the P-series screens (P1–P10). Front-end only:
 * every store, listing and review here is made up. Swap for real queries later;
 * the shapes are what the pages read.
 */

import type { ArtKey } from "../components/market/art";

export type StoreTone = "lemon" | "leaf" | "pink" | "mint" | "forest" | "ink";

export type Store = {
  /** Subdomain: maya → maya.broresell.com */
  slug: string;
  name: string;
  /** Who runs it, as buyers address them */
  owner: string;
  initial: string;
  tone: StoreTone;
  /** One line under the name in lists */
  tagline: string;
  location: string;
  since: string;
  bio: string;
  forSale: number;
  sold: number;
  rating: number;
  ratings: number;
  shipsIn: string;
  repliesIn: string;
};

export const stores: Store[] = [
  {
    slug: "maya",
    name: "Maya's closet",
    owner: "Maya",
    initial: "M",
    tone: "lemon",
    tagline: "Linen, knits and things for the house",
    location: "Vancouver, BC",
    since: "March 2024",
    bio: "Good things I no longer wear, looking for someone who will. Mostly linen and knits, plus the odd thing for the house. Everything is washed, measured and photographed in daylight.",
    forSale: 38,
    sold: 112,
    rating: 4.9,
    ratings: 86,
    shipsIn: "2 days",
    repliesIn: "1 hour",
  },
  {
    slug: "secondshutter",
    name: "Second Shutter",
    owner: "Sam",
    initial: "S",
    tone: "mint",
    tagline: "Film cameras, all tested",
    location: "Portland, OR",
    since: "June 2023",
    bio: "Film cameras and lenses I've serviced and shot a roll through myself. If it's here, it works.",
    forSale: 27,
    sold: 214,
    rating: 4.9,
    ratings: 173,
    shipsIn: "2 days",
    repliesIn: "1 hour",
  },
  {
    slug: "billy",
    name: "Billy's bins",
    owner: "Billy",
    initial: "B",
    tone: "pink",
    tagline: "Records, mostly soul and jazz",
    location: "Toronto, ON",
    since: "January 2025",
    bio: "Crate-dug records, cleaned and play-tested. Grades are honest, sleeves are photographed front and back.",
    forSale: 64,
    sold: 58,
    rating: 4.8,
    ratings: 41,
    shipsIn: "3 days",
    repliesIn: "3 hours",
  },
  {
    slug: "june",
    name: "June's finds",
    owner: "June",
    initial: "J",
    tone: "pink",
    tagline: "Lamps and little things for the house",
    location: "Victoria, BC",
    since: "August 2024",
    bio: "Estate-sale lamps, rewired, and small things for the house.",
    forSale: 19,
    sold: 47,
    rating: 5.0,
    ratings: 33,
    shipsIn: "2 days",
    repliesIn: "2 hours",
  },
  {
    slug: "cardcorner",
    name: "Card Corner",
    owner: "Chris",
    initial: "C",
    tone: "forest",
    tagline: "Graded cards and sealed sets",
    location: "Calgary, AB",
    since: "May 2023",
    bio: "Graded cards and sealed sets, shipped in hard cases.",
    forSale: 112,
    sold: 390,
    rating: 4.9,
    ratings: 260,
    shipsIn: "1 day",
    repliesIn: "1 hour",
  },
  {
    slug: "nina",
    name: "Nina at home",
    owner: "Nina",
    initial: "N",
    tone: "leaf",
    tagline: "Furniture, pickup in Vancouver",
    location: "Vancouver, BC",
    since: "February 2025",
    bio: "Solid wood furniture from our move. Pickup in East Van, or I can help arrange a courier.",
    forSale: 8,
    sold: 12,
    rating: 4.9,
    ratings: 10,
    shipsIn: "Pickup",
    repliesIn: "1 hour",
  },
  {
    slug: "tom",
    name: "Tom's tools",
    owner: "Tom",
    initial: "T",
    tone: "ink",
    tagline: "Hand tools, sharpened",
    location: "Hamilton, ON",
    since: "April 2024",
    bio: "Old hand tools, cleaned up and sharpened.",
    forSale: 31,
    sold: 76,
    rating: 4.8,
    ratings: 52,
    shipsIn: "3 days",
    repliesIn: "4 hours",
  },
];

/** What a store's reputation adds. Mock stores have it all; live stores don't yet. */
type StoreReputation = "rating" | "ratings" | "shipsIn" | "repliesIn";

/**
 * A store as the public pages render it: a mock `Store`, or a live shop from
 * lib/server/market.ts. Live shops have no reviews, habits or bio yet, so those
 * are optional and the pages hide what's missing rather than make it up.
 */
export type PublicStore = Omit<Store, StoreReputation | "location" | "bio"> &
  Partial<Pick<Store, StoreReputation | "location" | "bio">> & {
    /** From the database rather than this file. Turns off prototype-only extras. */
    live?: boolean;
    /** The seller has paused the shop: reachable by link, not listed, can't sell. */
    paused?: boolean;
    /** The shop's picture, shown instead of the initial. */
    picture?: string;
  };

export function getStore(slug: string) {
  return stores.find((s) => s.slug === slug);
}

export type Category =
  | "Clothing"
  | "Shoes"
  | "Bags"
  | "Home"
  | "Collectibles"
  | "Books"
  | "Tech"
  | "Kids"
  | "Garden";

export const categories: Category[] = [
  "Clothing",
  "Shoes",
  "Bags",
  "Home",
  "Collectibles",
  "Books",
  "Tech",
  "Kids",
  "Garden",
];

export type Listing = {
  /** URL slug inside its store: maya.broresell.com/linen-wrap-dress */
  slug: string;
  store: string;
  /** Short name on cards */
  title: string;
  /** Full name on the listing page */
  fullTitle?: string;
  /** Line under the title on cards */
  short: string;
  price: number;
  shipping: number;
  art: ArtKey;
  category: Category;
  /** Section within the store, for its filter chips */
  section?: string;
  openToOffers?: boolean;
  justListed?: boolean;
  /** Live data: it's gone. The page stays up, read-only. */
  sold?: boolean;
};

/**
 * A listing as the public pages render it: a mock `Listing`, or a live one with a
 * real photo instead of a drawing and any category the seller's research chose.
 */
export type PublicListing = Omit<Listing, "art" | "category" | "shipping"> & {
  /** Database id. Live checkout and offer links use it, since slugs repeat across stores. */
  id?: string;
  art?: ArtKey;
  /** Cover photo URL. Shown instead of `art` when present. */
  photo?: string;
  category: string;
  /** Null when the seller hasn't set shipping yet. */
  shipping: number | null;
  /** The store's face, so cards don't look it up in the mock catalog. */
  seller?: Pick<PublicStore, "name" | "initial" | "tone" | "picture">;
};

export const listings: Listing[] = [
  // Maya's closet
  { slug: "linen-wrap-dress", store: "maya", title: "Linen wrap dress", short: "Size M, worn twice", price: 24, shipping: 8, art: "dress", category: "Clothing", section: "Dresses", openToOffers: true, justListed: true },
  { slug: "chunky-knit-sweater", store: "maya", title: "Chunky knit sweater", short: "Size S, like new", price: 38, shipping: 8, art: "sweater", category: "Clothing", section: "Knitwear" },
  { slug: "canvas-market-tote", store: "maya", title: "Canvas market tote", short: "Barely used", price: 16, shipping: 6, art: "tote", category: "Bags", section: "Shoes and bags" },
  { slug: "straw-sun-hat", store: "maya", title: "Straw sun hat", short: "One size, one summer", price: 20, shipping: 8, art: "sunHat", category: "Clothing", section: "Tops" },
  { slug: "leather-ankle-boots", store: "maya", title: "Leather ankle boots", short: "Size 8, resoled this year", price: 55, shipping: 12, art: "boots", category: "Shoes", section: "Shoes and bags", openToOffers: true },
  { slug: "striped-cotton-tee", store: "maya", title: "Striped cotton tee", short: "Size M, soft from washing", price: 14, shipping: 6, art: "stripedTee", category: "Clothing", section: "Tops" },
  { slug: "silk-neck-scarf", store: "maya", title: "Silk neck scarf", short: "Never worn, still folded", price: 18, shipping: 5, art: "scarf", category: "Clothing", section: "Tops" },
  { slug: "stoneware-mugs", store: "maya", title: "Stoneware mugs, set of 4", short: "No chips, pickup or post", price: 28, shipping: 14, art: "mugs", category: "Home", section: "Home" },

  // Second Shutter
  { slug: "35mm-film-camera", store: "secondshutter", title: "35mm film camera", fullTitle: "35mm film camera with 50mm lens", short: "Tested, light meter works", price: 140, shipping: 12, art: "camera", category: "Tech", openToOffers: true },
  { slug: "50mm-lens", store: "secondshutter", title: "50mm f/1.4 lens", short: "Clean glass, smooth focus", price: 95, shipping: 10, art: "lens", category: "Tech", openToOffers: true },
  { slug: "rangefinder-1965", store: "secondshutter", title: "Rangefinder camera, 1965", short: "Serviced, meter works", price: 180, shipping: 12, art: "rangefinder", category: "Tech" },
  { slug: "handheld-light-meter", store: "secondshutter", title: "Handheld light meter", short: "Accurate, with case", price: 40, shipping: 8, art: "lightMeter", category: "Tech" },
  { slug: "colour-film-3-rolls", store: "secondshutter", title: "Colour film, 3 fresh rolls", short: "Kept in the fridge", price: 30, shipping: 6, art: "filmRolls", category: "Tech" },

  // Elsewhere
  { slug: "first-pressing-soul-lp", store: "billy", title: "First-pressing soul LP", short: "Sleeve very good, plays clean", price: 32, shipping: 12, art: "record", category: "Collectibles" },
  { slug: "brass-desk-lamp", store: "june", title: "Brass desk lamp", short: "Rewired last year", price: 45, shipping: 14, art: "lamp", category: "Home", openToOffers: true },
  { slug: "holo-trading-card-1999", store: "cardcorner", title: "Holo trading card, 1999", short: "Graded 8, open to offers", price: 210, shipping: 8, art: "card", category: "Collectibles", openToOffers: true },
  { slug: "oak-dining-chair", store: "nina", title: "Oak dining chair", short: "Solid, pickup in Vancouver", price: 80, shipping: 0, art: "chair", category: "Home" },
];

export function getListing(store: string, slug: string) {
  return listings.find((l) => l.store === store && l.slug === slug);
}

/** Look a listing up by slug alone, for marketplace routes like /checkout/[listing]. */
export function findListing(slug: string) {
  return listings.find((l) => l.slug === slug);
}

export function storeListings(store: string) {
  return listings.filter((l) => l.store === store);
}

/** P1's grid, in the order the design shows it. */
export const discoverOrder = [
  "linen-wrap-dress",
  "35mm-film-camera",
  "chunky-knit-sweater",
  "first-pressing-soul-lp",
  "brass-desk-lamp",
  "holo-trading-card-1999",
  "canvas-market-tote",
  "oak-dining-chair",
];

export type SoldItem = {
  title: string;
  price: number;
  when: string;
  art?: ArtKey;
  /** Live sold listings show their cover photo instead of a drawing. */
  photo?: string;
};

/** "Went to new homes" — what a store sold lately. */
export const soldItems: Record<string, SoldItem[]> = {
  maya: [
    { title: "Ceramic bud vase", price: 22, when: "three days ago", art: "budVase" },
    { title: "Wool beret", price: 15, when: "last week", art: "beret" },
    { title: "Wool picnic blanket", price: 40, when: "last week", art: "picnicBlanket" },
    { title: "Denim midi skirt", price: 26, when: "two weeks ago", art: "midiSkirt" },
    { title: "Beeswax candle pair", price: 12, when: "two weeks ago", art: "candles" },
  ],
};

export type Review = { quote: string; by: string };

export const reviews: Record<string, Review[]> = {
  maya: [
    {
      quote:
        "The dress looked exactly like the photos and the measurements were right. Packed with a little note, arrived in three days.",
      by: "Priya bought a linen shirt dress, September",
    },
    {
      quote:
        "I offered a bit under asking and had a friendly yes within the hour. My deposit came off the price like it said it would.",
      by: "Tom bought a wool picnic blanket, September",
    },
    {
      quote:
        "Maya flagged a tiny glaze mark before I paid, which I would never have noticed. Honest seller, lovely vase.",
      by: "June bought a ceramic bud vase, this week",
    },
  ],
};

/** Stores the marketplace suggests following (P1). */
export const suggestedStores = ["maya", "secondshutter", "cardcorner"];

export function formatPrice(n: number, cents = false) {
  return cents
    ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$${n.toLocaleString("en-US")}`;
}
