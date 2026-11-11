/*
 * Prototype data. Nothing here is real: it's the cast and props from the Paper
 * file so every screen tells the same story. Swap for real queries later.
 */

export const me = {
  name: "Maya Rivera",
  firstName: "Maya",
  initial: "M",
  handle: "@maya",
  email: "maya@example.com",
};

export type ShopVisibility = "public" | "link" | "private";

export type Shop = {
  slug: string;
  name: string;
  shortName: string;
  domain: string;
  visibility: ShopVisibility;
  /** Tile colour behind the shop icon. */
  tone: "pink" | "leaf" | "muted";
  icon: "dress" | "vase" | "record";
  live: number;
  drafts: number;
  offers: number;
  thisWeek: number;
};

export const shops: Shop[] = [
  {
    slug: "mayas-closet",
    name: "Maya's closet",
    shortName: "Maya's closet",
    domain: "maya.broresell.com",
    visibility: "public",
    tone: "pink",
    icon: "dress",
    live: 38,
    drafts: 2,
    offers: 3,
    thisWeek: 182,
  },
  {
    slug: "home-and-kitchen",
    name: "Home and kitchen finds",
    shortName: "Home and kitchen",
    domain: "maya-home.resell.store",
    visibility: "link",
    tone: "leaf",
    icon: "vase",
    live: 12,
    drafts: 1,
    offers: 0,
    thisWeek: 64,
  },
  {
    slug: "toms-old-records",
    name: "Tom's old records",
    shortName: "Tom's old records",
    domain: "toms-records.resell.store",
    visibility: "private",
    tone: "muted",
    icon: "record",
    live: 0,
    drafts: 4,
    offers: 0,
    thisWeek: 0,
  },
];

export function getShop(slug: string) {
  return shops.find((shop) => shop.slug === slug) ?? shops[0]!;
}

export const visibilityLabel: Record<ShopVisibility, string> = {
  public: "Public",
  link: "Link only",
  private: "Private",
};

/** The listing being made in the C screens. */
export const draftListing = {
  id: "dutch-oven",
  shopSlug: "home-and-kitchen",
  title: "Sunny yellow Le Creuset dutch oven, 5.5 qt",
  item: "Round dutch oven",
  brand: "Le Creuset",
  colour: "Yellow",
  size: "5.5 qt",
  price: 185,
  lowest: 160,
};

/** Number of things in the inbox that need the person. */
export const inboxCount = 3;
