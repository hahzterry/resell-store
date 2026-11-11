import type { Metadata } from "next";
import { A, Callout, DocPage, H2, H3, P, Table, UL } from "../../../../components/docs/page";
import { docsBase } from "../../../../lib/docs/base";
import { siteUrl } from "../../../../lib/urls";

export const metadata: Metadata = { title: "Finding things" };

export default async function Finding() {
  const base = await docsBase();
  return (
    <DocPage
      base={base}
      path="/guides/finding"
      eyebrow="Buying"
      title="Finding things"
      lead="Search the way you'd describe it to a friend, narrow it down, then save the good ones and follow the shops you like."
      toc={[
        { id: "search", title: "Search in your own words" },
        { id: "filters", title: "Filters and sort" },
        { id: "stores", title: "Stores and store pages" },
        { id: "listing", title: "Reading a listing" },
        { id: "sold", title: "Sold things" },
        { id: "save", title: "Saving, following and sharing" },
      ]}
    >
      <H2 id="search" className="mt-0">
        Search in your own words
      </H2>
      <P>
        The search box at the top, <strong>Search things, stores and sellers</strong>, always looks across the whole marketplace,
        even when you&apos;re on one shop&apos;s page. You don&apos;t need the exact name of what you want.
      </P>
      <P>
        Every search runs two ways at once. One matches your words against listing titles, descriptions and shop names. The other
        looks for things that mean what you typed, so &quot;something to cook a stew in&quot; can turn up Maya&apos;s yellow Le
        Creuset dutch oven even though the word &quot;stew&quot; isn&apos;t in the listing. The two sets of results are blended,
        and weak guesses are left out.
      </P>
      <Callout tone="tip">
        Say what matters to you: &quot;a linen dress for summer weddings&quot; or &quot;film camera for a beginner&quot; works better
        than a single word.
      </Callout>

      <H2 id="filters">Filters and sort</H2>
      <P>
        <A href={siteUrl("/discover")}>Shop</A> shows everything for sale, 16 at a time. Tap <strong>Show more things</strong> to
        keep going. Narrow it down with:
      </P>
      <Table
        head={["Filter", "Choices"]}
        rows={[
          ["Category", "Everything, Clothing, Shoes, Bags, Home, Collectibles, Books, Tech, Kids, Garden"],
          ["Price", "Any price, Under $25, $25 to $100, Over $100"],
          ["Open to offers", "Only things where the seller takes offers"],
          ["Sort", "Newest first, Price low to high, Price high to low. When you search, Best match comes first."],
        ]}
      />
      <P>
        Your filters live in the page address. Copy it from your browser and send it to someone, and they&apos;ll see the same
        search with the same filters.
      </P>
      <P>
        Only live listings from open, public shops show up in search. Some sellers share a listing or a whole shop by link only;
        those never appear in search, but the link still works for anyone who has it.
      </P>

      <H2 id="stores">Stores and store pages</H2>
      <P>
        <A href={siteUrl("/stores")}>Stores</A> lists every public shop, busiest first, with its rating, where it is, how many
        things are for sale and how many have sold. A new shop with nothing up yet says <strong>Opening soon</strong>.
      </P>
      <P>
        Every shop has its own address, like <strong>maya.broresell.com</strong>. On a store page you&apos;ll find:
      </P>
      <UL>
        <li>The shop&apos;s picture, name, stars, where it is and when it started selling, plus a short bio.</li>
        <li>
          <strong>Follow</strong>, <strong>Message</strong> the owner, and <strong>Share</strong>, which copies the shop&apos;s
          link.
        </li>
        <li>Three tabs: <strong>For sale</strong>, <strong>Sold</strong> and <strong>Reviews</strong>, with a search just for that shop.</li>
        <li>
          <strong>What buyers say</strong>: reviews from people who actually bought there. Nobody else can leave one.
        </li>
      </UL>
      <P>
        If a shop says its owner is taking a break, the shop is paused. You can look around, but nothing can be bought or offered
        on until they reopen.
      </P>

      <H2 id="listing">Reading a listing</H2>
      <H3>The buy box</H3>
      <UL>
        <li>
          The price, then shipping: &quot;plus $X tracked shipping&quot;, or &quot;pickup in&quot; a city when the seller hands
          it over in person.
        </li>
        <li>
          <strong>Open to offers</strong> means you can suggest a lower price. See{" "}
          <A href={`${base}/guides/making-offers`}>Making an offer</A>.
        </li>
        <li>
          <strong>Buy now</strong> takes you to <A href={`${base}/guides/checkout`}>checkout</A>. If the seller said yes to your
          offer, the button becomes <strong>Pay $X (your accepted offer)</strong>.
        </li>
        <li>A <strong>Just listed</strong> sticker means it went up in the last 2 days.</li>
      </UL>
      <H3>Further down</H3>
      <UL>
        <li>
          <strong>Your money is held, not handed over</strong>: a reminder that PayPal keeps your payment until you say it&apos;s all
          good, or about 13 days after it ships if you don&apos;t report a problem.
        </li>
        <li>
          The details table: what the seller told us about it, plus <strong>Offers: Welcome</strong> or{" "}
          <strong>Price is firm</strong>, and where it ships from.
        </li>
        <li>
          <strong>Ask a question</strong> opens a chat with the shop. Some shops have an assistant that answers straight away from
          the listing; see <A href={`${base}/guides/questions`}>Questions and your shop agent</A>.
        </li>
        <li>Reviews of the shop and <strong>More from</strong> the same shop.</li>
      </UL>

      <H2 id="sold">Sold things</H2>
      <P>
        Once something sells it drops out of search, but its page stays up, marked <strong>Sold</strong>, with a{" "}
        <strong>Find something like it</strong> button. Store pages show recent sales under <strong>Went to new homes</strong> and
        on the <strong>Sold</strong> tab, which is a good way to see what a shop usually sells and for how much.
      </P>

      <H2 id="save">Saving, following and sharing</H2>
      <UL>
        <li>
          Tap the <strong>heart</strong> to save something. It lands in <strong>Saved</strong> on{" "}
          <A href={siteUrl("/account#saved")}>your account</A>, things still for sale first. The heart in the header takes you
          there.
        </li>
        <li>
          <strong>Follow</strong> a shop from its page, a listing or the Stores list. Your <strong>Following</strong> list shows
          how many things each shop has for sale and what&apos;s new this week.
        </li>
        <li>
          Want an email when a shop you follow lists something? Turn on <strong>A shop I follow lists something</strong> in your
          settings. It&apos;s off to start with. See <A href={`${base}/guides/notifications`}>Emails and notifications</A>.
        </li>
        <li>
          <strong>Share this listing</strong> copies its link. Pasted into a chat or social post, it shows a picture and the price.
        </li>
      </UL>
      <P>You&apos;ll need to be signed in to save or follow. If you aren&apos;t, we&apos;ll bring you right back after.</P>
    </DocPage>
  );
}
