import type { Metadata } from "next";
import Link from "next/link";
import { AgentNote } from "@repo/ui/agent-note";
import { BuyBar } from "@repo/ui/buy-bar";
import { Button, IconButton, LikeButton } from "@repo/ui/button";
import { Chip, ChipGroup } from "@repo/ui/chip";
import {
  BagIcon,
  CameraIcon,
  ChatIcon,
  HomeIcon,
  PlusIcon,
  SearchIcon,
  ShareIcon,
  SparkleIcon,
  TruckIcon,
  UserIcon,
} from "@repo/ui/icons";
import { ItemCard } from "@repo/ui/item-card";
import { LinkRow } from "@repo/ui/link-row";
import { Wordmark } from "@repo/ui/logo";
import { SearchField } from "@repo/ui/search-field";
import {
  SegmentedControl,
  SegmentedControlList,
  SegmentedControlTab,
} from "@repo/ui/segmented-control";
import { SellerCard } from "@repo/ui/seller-card";
import { Separator } from "@repo/ui/separator";
import { Sticker } from "@repo/ui/sticker";
import { TabBar, TabBarItem } from "@repo/ui/tab-bar";
import { Tag } from "@repo/ui/tag";
import { TextField } from "@repo/ui/text-field";
import { ToastPill } from "@repo/ui/toast";
import {
  BerriesMark,
  DressIllustration,
  FlowerMark,
  LeafMark,
  SliceMark,
  SparkleMark,
  SweaterIllustration,
  VaseIllustration,
  WedgeMark,
} from "@repo/ui/whimsy";
import { CopyLinkButton } from "../../components/design-system/copy-link-button";
import {
  DocHeader,
  Section,
  Subhead,
} from "../../components/design-system/section";

export const metadata: Metadata = {
  title: "Design system · resell.store",
};

type Swatch = { name: string; hex: string; color: string; outline?: boolean };

const neutrals: Swatch[] = [
  { name: "Ground", hex: "#FFFDF2", color: "bg-background", outline: true },
  { name: "Surface", hex: "#FFFFFF", color: "bg-surface", outline: true },
  { name: "Muted", hex: "#F7F3DF", color: "bg-surface-muted" },
  { name: "Border", hex: "#E8E3CC", color: "bg-border" },
  { name: "Text soft", hex: "#56675E", color: "bg-text-muted" },
  { name: "Branch", hex: "#14261D", color: "bg-leaf-900" },
];
const lemon: Swatch[] = [
  { name: "100", hex: "#FFF6C2", color: "bg-lemon-100" },
  { name: "300", hex: "#FFE873", color: "bg-lemon-300" },
  { name: "400", hex: "#FFD934", color: "bg-lemon-400" },
  { name: "500", hex: "#F5BE0B", color: "bg-lemon-500" },
];
const leaf: Swatch[] = [
  { name: "100", hex: "#DDF0E3", color: "bg-leaf-100" },
  { name: "300 Sage", hex: "#8CC9A4", color: "bg-leaf-300" },
  { name: "600", hex: "#256B4C", color: "bg-leaf-600" },
  { name: "900", hex: "#14261D", color: "bg-leaf-900" },
];
const pink: Swatch[] = [
  { name: "100", hex: "#FFDCEB", color: "bg-pink-100" },
  { name: "400", hex: "#FF5FA8", color: "bg-pink-400" },
  { name: "600 Text", hex: "#C9246F", color: "bg-pink-600" },
];
const berry: Swatch[] = [
  { name: "500", hex: "#D9391B", color: "bg-berry-500" },
];

const typeScale = [
  {
    name: "Display",
    spec: "64 / 64",
    className: "font-display text-5xl font-extrabold tracking-tight",
    sample: "Sold in a weekend.",
  },
  {
    name: "Heading",
    spec: "36 / 40",
    className: "font-display text-3xl font-extrabold tracking-tight",
    sample: "Twelve things listed while you made coffee",
  },
  {
    name: "Title",
    spec: "22 / 28",
    className: "text-xl font-bold tracking-[-0.01em]",
    sample: "Your shop link is ready to share",
  },
  {
    name: "Body",
    spec: "16 / 24",
    className: "max-w-[560px] text-base",
    sample:
      "Snap a photo and your agent writes the listing, sets a fair price, and posts it to your shop. You approve, it handles the rest.",
  },
  {
    name: "Caption",
    spec: "14 / 20",
    className: "text-sm font-medium text-text-muted",
    sample: "Listed 2 days ago, 14 people looked",
  },
];

const radii = [
  { name: "sm 8", className: "rounded-sm bg-secondary-soft" },
  { name: "md 14", className: "rounded-md bg-secondary-soft" },
  { name: "lg 20", className: "rounded-lg bg-secondary-soft" },
  { name: "xl 28", className: "rounded-xl bg-secondary-soft" },
  { name: "full", className: "rounded-full bg-leaf-300" },
];

const spacing = [4, 8, 12, 16, 24, 32, 48, 64];

function Swatches({ title, swatches }: { title: string; swatches: Swatch[] }) {
  return (
    <div className="flex flex-col gap-3">
      <Subhead>{title}</Subhead>
      <div className="flex flex-wrap gap-2">
        {swatches.map((s) => (
          <div key={s.name + s.hex} className="flex w-[84px] flex-col gap-2">
            <div
              className={`h-16 rounded-md ${s.color} ${s.outline ? "border border-border" : ""}`}
            />
            <div className="text-sm font-semibold">{s.name}</div>
            <div className="text-sm text-text-muted">{s.hex}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <main className="mx-auto flex max-w-[1344px] flex-col gap-24 px-4 py-12 md:px-12 md:py-16">
      {/* ——— 01 Foundations ——— */}
      <div className="flex flex-col gap-16">
        <DocHeader label="Design system 0.1 / Foundations">
          <Link href="/" aria-label="resell.store home">
            <Wordmark />
          </Link>
        </DocHeader>
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end lg:gap-16">
          <h1 className="max-w-[820px] font-display text-5xl font-extrabold tracking-[-0.04em] md:text-[112px] md:leading-[104px]">
            Your closet, open for business.
          </h1>
          <p className="max-w-[320px] pb-3 text-lg text-text-muted">
            A lemonade-stand theme: clean cards on a pale lemon ground, with
            yellow doing the work, green keeping it calm, and pink showing up
            only for the fun parts.
          </p>
        </div>
      </div>

      <Section index="01" title="Color">
        <div className="flex flex-col gap-10">
          <div className="grid gap-2 md:flex md:h-60 [&>div]:min-h-36 [&>div]:min-w-0">
            <div className="flex flex-[5] flex-col justify-end gap-0.5 rounded-xl bg-primary p-6 text-on-primary">
              <span className="font-display text-2xl font-extrabold tracking-tight">
                Lemon rind
              </span>
              <span className="text-sm font-medium">Primary / #FFD934</span>
            </div>
            <div className="flex flex-[3] flex-col justify-end gap-0.5 rounded-xl bg-secondary p-6 text-on-secondary">
              <span className="font-display text-2xl font-extrabold tracking-tight">
                Leaf
              </span>
              <span className="text-sm font-medium">Secondary / #256B4C</span>
            </div>
            <div className="flex flex-[1.4] flex-col justify-end gap-0.5 rounded-xl bg-accent p-6 text-text">
              <span className="font-display text-xl font-extrabold tracking-tight">
                Pink lemonade
              </span>
              <span className="text-sm font-medium">Accent / #FF5FA8</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-24 gap-y-10">
            <Swatches title="Neutrals" swatches={neutrals} />
            <Swatches title="Lemon" swatches={lemon} />
          </div>
          <div className="flex flex-wrap gap-x-24 gap-y-10">
            <Swatches title="Leaf" swatches={leaf} />
            <Swatches title="Pink" swatches={pink} />
            <Swatches title="Berry" swatches={berry} />
          </div>
        </div>
      </Section>

      <Section index="02" title="Type">
        <div className="flex flex-col gap-10">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="flex items-end justify-between gap-4 rounded-xl border border-border bg-surface p-8">
              <span className="font-display text-[144px] leading-[120px] font-extrabold tracking-[-0.04em]">
                Aa
              </span>
              <span className="flex flex-col items-end gap-0.5 text-right">
                <span className="text-base font-bold">Bricolage Grotesque</span>
                <span className="text-sm text-text-muted">
                  Display / ExtraBold 800
                </span>
              </span>
            </div>
            <div className="flex items-end justify-between gap-4 rounded-xl bg-primary-soft p-8">
              <span className="text-[144px] leading-[120px] font-medium tracking-[-0.04em]">
                Aa
              </span>
              <span className="flex flex-col items-end gap-0.5 text-right">
                <span className="text-base font-bold">Figtree</span>
                <span className="text-sm text-text-muted">
                  Interface / 400, 500, 600, 700
                </span>
              </span>
            </div>
          </div>
          <div className="flex flex-col border-b border-border">
            {typeScale.map((row) => (
              <div
                key={row.name}
                className="flex flex-col gap-2 border-t border-border py-6 md:flex-row md:items-baseline md:gap-6"
              >
                <span className="w-24 shrink-0 text-sm font-semibold">
                  {row.name}
                </span>
                <span className="w-24 shrink-0 text-sm text-text-muted">
                  {row.spec}
                </span>
                <span className={row.className}>{row.sample}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section index="03" title="Shape">
        <div className="flex flex-wrap gap-x-24 gap-y-10">
          <div className="flex flex-col gap-4">
            <Subhead>
              Radius: soft everywhere, pills for anything you tap
            </Subhead>
            <div className="flex flex-wrap items-end gap-4">
              {radii.map((r) => (
                <div key={r.name} className="flex flex-col gap-2">
                  <div className={`size-[88px] ${r.className}`} />
                  <span className="text-sm font-medium text-text-muted">
                    {r.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-between gap-4">
            <Subhead>Spacing: a 4px step</Subhead>
            <div className="flex flex-wrap items-end gap-3">
              {spacing.map((px) => (
                <div
                  key={px}
                  className="flex flex-col items-center gap-2"
                  style={{ width: Math.max(28, px) }}
                >
                  <div
                    className="bg-primary"
                    style={{
                      width: px,
                      height: px,
                      borderRadius: Math.max(1, Math.round(px / 5)),
                    }}
                  />
                  <span className="text-sm font-medium text-text-muted">
                    {px}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section index="04" title="Whimsy">
        <div className="flex flex-col gap-10">
          <p className="max-w-[560px] text-lg text-text-muted">
            Two devices, used sparingly: little garden marks and tilted
            stickers. One or two per screen. If a screen feels busy, the whimsy
            goes first.
          </p>
          <div className="flex flex-wrap items-center gap-10">
            <SliceMark />
            <FlowerMark />
            <LeafMark />
            <SparkleMark />
            <BerriesMark />
            <WedgeMark />
          </div>
          <div className="flex flex-wrap items-center gap-7 py-2">
            <Sticker tone="primary" size="lg" rotate={-5}>
              $24
            </Sticker>
            <Sticker tone="accent" rotate={4} className="text-white">
              Just listed
            </Sticker>
            <Sticker tone="secondary" rotate={-3}>
              Sold
            </Sticker>
            <Sticker tone="leaf" rotate={3}>
              One of a kind
            </Sticker>
          </div>
        </div>
      </Section>

      {/* ——— 02 Components ——— */}
      <div className="flex flex-col gap-16 border-t border-border pt-24">
        <DocHeader label="Design system 0.1 / Components">
          <Wordmark />
        </DocHeader>
        <h1 className="font-display text-5xl font-extrabold tracking-tight">
          The pieces.
        </h1>
      </div>

      <Section index="01" title="Buttons">
        <div className="flex flex-col gap-8">
          <div className="flex flex-wrap items-center gap-4">
            <Button>
              <SparkleIcon />
              List it for me
            </Button>
            <Button variant="secondary">Buy now</Button>
            <Button variant="soft">Share shop</Button>
            <Button variant="ghost">Maybe later</Button>
            <Button disabled>Sold out</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="md">Add a thing</Button>
            <Button size="md" variant="secondary">
              Make an offer
            </Button>
            <Button size="md" variant="soft">
              Follow
            </Button>
            <Separator orientation="vertical" />
            <IconButton variant="primary" aria-label="Add a thing">
              <PlusIcon size={22} />
            </IconButton>
            <LikeButton />
            <LikeButton defaultPressed />
            <IconButton aria-label="Share">
              <ShareIcon />
            </IconButton>
          </div>
        </div>
      </Section>

      <Section index="02" title="Controls">
        <div className="flex flex-col gap-10">
          <div className="flex flex-wrap items-center gap-2">
            <ChipGroup defaultValue={["everything"]} aria-label="Category">
              <Chip value="everything">Everything</Chip>
              <Chip value="dresses">Dresses</Chip>
              <Chip value="shoes">Shoes</Chip>
              <Chip value="under-25">Under $25</Chip>
            </ChipGroup>
            <Separator orientation="vertical" className="mx-1" />
            <Tag variant="available">Available</Tag>
            <Tag variant="hold">On hold</Tag>
            <Tag variant="new">New today</Tag>
            <Tag variant="sale">$6 off</Tag>
          </div>
          <div className="flex flex-wrap items-end gap-6">
            <SegmentedControl defaultValue="shop">
              <SegmentedControlList aria-label="Shop sections">
                <SegmentedControlTab value="shop">Shop</SegmentedControlTab>
                <SegmentedControlTab value="links">Links</SegmentedControlTab>
                <SegmentedControlTab value="sold">Sold</SegmentedControlTab>
              </SegmentedControlList>
            </SegmentedControl>
            <SearchField
              placeholder="Search Maya's closet"
              containerClassName="min-w-[280px] flex-1"
            />
            <TextField
              label="Your price"
              defaultValue="$24"
              hint="Fair price"
              className="w-[260px]"
            />
          </div>
        </div>
      </Section>

      <Section index="03" title="Cards">
        <div className="flex flex-col gap-12">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(3,208px)_1fr]">
            <ItemCard
              tone="pink"
              image={<DressIllustration />}
              price="$24"
              title="Linen wrap dress"
              meta="Size M, worn twice"
            />
            <ItemCard
              tone="leaf"
              image={<SweaterIllustration />}
              price="$38"
              defaultLiked
              title="Chunky knit sweater"
              meta="Size S, like new"
            />
            <ItemCard
              tone="lemon"
              image={<VaseIllustration />}
              sold
              title="Ceramic bud vase"
              meta="Went to a new home"
            />
            <SellerCard
              initial="M"
              name="Maya's closet"
              handle="maya.broresell.com"
              bio="Good things I no longer wear, looking for someone who will."
              stats={[
                { value: 38, label: "listed" },
                { value: 112, label: "sold" },
              ]}
            />
          </div>
          <div className="grid gap-6 lg:grid-cols-[440px_1fr]">
            <div className="flex flex-col gap-3">
              <LinkRow featured href="#" icon={<BagIcon />}>
                Shop the whole closet
              </LinkRow>
              <LinkRow href="#" icon={<CameraIcon />} iconTone="secondary">
                See how I style it
              </LinkRow>
              <LinkRow href="#" icon={<TruckIcon />} iconTone="accent">
                Shipping and returns
              </LinkRow>
            </div>
            <div className="flex flex-col items-start gap-4">
              <AgentNote
                className="w-full"
                meta="Your agent, 2 min ago"
                title="3 new things are ready to list"
                actions={
                  <>
                    <Button size="md">Review and post</Button>
                    <Button size="md" variant="ghost">
                      Not now
                    </Button>
                  </>
                }
              >
                Photos tidied, descriptions written, prices checked against
                similar sales. Have a look before they go live.
              </AgentNote>
              <div className="flex flex-wrap items-center gap-4">
                <ToastPill>Link copied. Go show it off.</ToastPill>
                <CopyLinkButton />
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section index="04" title="Bars">
        <div className="flex flex-wrap items-center gap-8">
          <TabBar aria-label="Main">
            <TabBarItem href="#" active aria-label="Home">
              <HomeIcon />
            </TabBarItem>
            <TabBarItem href="#" aria-label="Search">
              <SearchIcon />
            </TabBarItem>
            <TabBarItem href="#" emphasis aria-label="Sell something">
              <PlusIcon strokeWidth={2.6} />
            </TabBarItem>
            <TabBarItem href="#" aria-label="Inbox">
              <ChatIcon />
            </TabBarItem>
            <TabBarItem href="#" aria-label="Me">
              <UserIcon />
            </TabBarItem>
          </TabBar>
          <BuyBar
            className="min-w-[320px] flex-1"
            price="$24"
            note="plus $5 shipping"
            action={
              <Button variant="secondary" className="px-8">
                Buy now
              </Button>
            }
          />
        </div>
      </Section>
    </main>
  );
}
