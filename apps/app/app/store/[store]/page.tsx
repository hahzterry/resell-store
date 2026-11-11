import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteLink } from "../../../components/market/links";
import { StoreIntro } from "../../../components/market/store/store-intro";
import { StoreShelves } from "../../../components/market/store/store-shelves";
import { OwnerStats } from "../../../components/market/owner-stats";
import { TrackView } from "../../../components/market/track-view";
import { shopMiniStats } from "../../../lib/server/stats";
import { publicReviews, shopRatingBreakdown, toReviewCard } from "../../../lib/server/reviews";
import {
  getPublicStore,
  publicViewer,
  storeShelf,
  storeSold,
} from "../../../lib/server/market";
import { storePageMetadata } from "../../../lib/server/share";

type Props = { params: Promise<{ store: string }> };

/** Title, canonical (the subdomain) and share tags; ./opengraph-image.tsx adds the image. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const viewer = await publicViewer();
  return storePageMetadata((await params).store, viewer?.id);
}

/** P2: a store's home page, e.g. maya.broresell.com. */
export default async function StorePage({ params }: Props) {
  const viewer = await publicViewer();
  const found = await getPublicStore((await params).store, viewer?.id);
  if (!found) notFound();
  const { shop, isOwner, following } = found;

  const [listings, sold, mini, rating, firstReviews] = await Promise.all([
    storeShelf(shop),
    storeSold(shop),
    isOwner ? shopMiniStats(shop.id) : null,
    shopRatingBreakdown(shop.id),
    publicReviews({ shopId: shop.id, limit: 6 }),
  ]);
  // Stars by the name, in the stats and on the Reviews tab, once there are any
  const store = rating.count > 0 ? { ...found.store, rating: rating.average, ratings: rating.count } : found.store;

  return (
    <>
      <TrackView shop={shop.slug} />
      {mini && (
        <OwnerStats
          stats={[
            { label: "views this week", value: mini.views7d },
            {
              label: mini.followers === 1 ? "follower" : "followers",
              value: mini.followers,
            },
            { label: mini.likes === 1 ? "like" : "likes", value: mini.likes },
            {
              label: mini.shares === 1 ? "share" : "shares",
              value: mini.shares,
            },
            { label: "offers waiting", value: mini.offersWaiting },
          ]}
          href={`/stats?shop=${shop.slug}`}
          hrefLabel="All stats"
        />
      )}
      <main className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 pt-8 pb-[72px] desk:px-16">
        <nav aria-label="Breadcrumb" className="text-sm text-public-text-muted">
          <SiteLink href="/stores" className="hover:text-text hover:underline">
            Stores
          </SiteLink>{" "}
          / <span aria-current="page">{store.name}</span>
        </nav>

        <StoreIntro
          store={store}
          follow={{ shopId: shop.id, following, own: isOwner }}
        />

        <StoreShelves
          store={store}
          listings={listings}
          sold={sold}
          reviews={[]}
          liveReviews={{
            shopId: shop.id,
            ...rating,
            reviews: firstReviews.reviews.map((r) => toReviewCard(r)),
            nextCursor: firstReviews.nextCursor,
          }}
          isOwner={isOwner}
        />
      </main>
    </>
  );
}
