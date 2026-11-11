import { storeImage } from "../../../lib/server/og-images";

/*
 * maya.broresell.com's share image. Pages link it as
 * resell.store/store/maya/opengraph-image, which proxy.ts serves on the
 * marketplace host; maya.broresell.com/opengraph-image reaches it too.
 */

export const alt = "A store on resell.store";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ store: string }> }) {
  return storeImage((await params).store);
}
