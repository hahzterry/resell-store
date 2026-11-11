import { listingImage } from "../../../../lib/server/og-images";

/* maya.broresell.com/linen-wrap-dress's share image. See ../opengraph-image.tsx for how it's reached. */

export const alt = "A listing on resell.store";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ store: string; listing: string }> }) {
  const { store, listing } = await params;
  return listingImage(store, listing);
}
