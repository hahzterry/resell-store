import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingView } from "../../../../components/market/listing/listing-view";
import { OwnerStats } from "../../../../components/market/owner-stats";
import { TrackView } from "../../../../components/market/track-view";
import { listingStats } from "../../../../lib/server/stats";
import {
  getPublicListing,
  listingDetail,
  publicViewer,
  storeShelf,
} from "../../../../lib/server/market";
import { listingPageMetadata } from "../../../../lib/server/share";
import { acceptedOfferFor, agreedCents } from "../../../../lib/server/commerce";
import { toDollars } from "../../../../lib/money";
import { publicReviews, shopRating, toReviewCard } from "../../../../lib/server/reviews";

/* P3 (desktop) and P9 (mobile): maya.broresell.com/linen-wrap-dress */

type Props = { params: Promise<{ store: string; listing: string }> };

async function load(params: Props["params"]) {
  const { store, listing } = await params;
  const viewer = await publicViewer();
  const found = await getPublicListing(store, listing, viewer?.id);
  return found && { ...found, viewerId: viewer?.id ?? null };
}

/** Title, canonical and share tags (price included); ./opengraph-image.tsx adds the image. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { store, listing } = await params;
  const viewer = await publicViewer();
  return listingPageMetadata(store, listing, viewer?.id);
}

export default async function ListingPage({ params }: Props) {
  const found = await load(params);
  if (!found) notFound();
  const { shop, row, listing, isOwner, following, viewerId } = found;

  const [rating, listingReviews] = await Promise.all([
    shopRating(shop.id),
    publicReviews({ listingId: row.id, limit: 4 }),
  ]);
  // The shop's stars by the seller block, once it has any
  const store = rating.count > 0 ? { ...found.store, rating: rating.average, ratings: rating.count } : found.store;

  const [detail, more, accepted, minis] = await Promise.all([
    listingDetail(row, store),
    storeShelf(shop, { exclude: row.id, limit: 4 }),
    // Signed-in buyers with an accepted offer pay that price
    viewerId && !isOwner ? acceptedOfferFor(viewerId, row.id) : null,
    isOwner ? listingStats([row.id]) : null,
  ]);
  const mini = minis?.get(row.id);

  return (
    <>
      <TrackView shop={shop.slug} listing={row.id} />
      {mini && (
        <OwnerStats
          stats={[
            { label: mini.views === 1 ? "view" : "views", value: mini.views },
            { label: "this week", value: mini.views7d },
            { label: mini.likes === 1 ? "like" : "likes", value: mini.likes },
            {
              label: mini.shares === 1 ? "share" : "shares",
              value: mini.shares,
            },
            {
              label: mini.offers === 1 ? "offer" : "offers",
              value: mini.offers,
            },
          ]}
          href={`/listings/${row.id}`}
          hrefLabel="Manage it"
        />
      )}
      <ListingView
        listing={listing}
        store={store}
        detail={detail}
        more={more}
        viewer={{
          own: isOwner,
          accepted: accepted ? toDollars(agreedCents(accepted)) : null,
        }}
        follow={{ shopId: shop.id, following, own: isOwner }}
        reviews={listingReviews.reviews.map((r) => toReviewCard(r))}
      />
    </>
  );
}
