import Link from "next/link";
import { Button } from "@repo/ui/button";
import { CodeIcon } from "@repo/ui/icons";
import { Wordmark } from "@repo/ui/logo";
import { BerriesMark, SliceMark } from "@repo/ui/whimsy";
import { cn } from "@repo/ui/lib/utils";
import { Pop } from "./motion";
import { bigButton, Container, githubUrl } from "./parts";

/* The closing lemon panel and the dark footer. */

export function FinalCta({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 pb-12 md:px-12">
      <div className="relative flex flex-col items-center gap-8 overflow-hidden rounded-[32px] bg-primary px-6 pt-24 pb-24 text-center text-on-primary md:rounded-[40px] md:px-12 md:pt-28 md:pb-[120px]">
        <h2 className="max-w-[920px] font-display text-5xl font-extrabold tracking-[-0.035em] md:text-[88px] md:leading-[86px]">
          Your closet is worth more than you think
        </h2>
        <p className="max-w-[620px] text-lg font-medium md:text-xl md:leading-8">
          Open your shop, snap the first thing, and let your agent take it from
          there.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            className={cn(
              bigButton,
              "bg-leaf-900 px-9 text-white hover:bg-secondary",
            )}
            render={<Link href={signedIn ? "/home" : "/welcome"} />}
            nativeButton={false}
          >
            {signedIn ? "Go to your shop" : "Open your shop in 5 minutes"}
          </Button>
          <Button
            variant="soft"
            className={cn(bigButton, "border-0 px-7")}
            render={<Link href="/discover" />}
            nativeButton={false}
          >
            Shop the marketplace
          </Button>
        </div>
        <Pop
          rotate={-180}
          delay={0.4}
          className="absolute top-6 left-4 hidden sm:block md:top-[72px] md:left-[120px]"
        >
          <SliceMark size={96} className="-rotate-12" />
        </Pop>
        <Pop
          rotate={30}
          delay={0.55}
          className="absolute right-6 bottom-6 hidden sm:block md:right-[140px] md:bottom-[84px]"
        >
          <BerriesMark size={88} />
        </Pop>
      </div>
    </section>
  );
}

const columns = [
  {
    title: "Sell",
    links: [
      { label: "Open your shop", href: "/welcome" },
      { label: "Your seller agent", href: "/#seller-agent" },
      { label: "Offers and deposits", href: "/#seller-agent" },
      { label: "Getting paid", href: "/sales" },
    ],
  },
  {
    title: "Buy",
    links: [
      { label: "Marketplace", href: "/discover" },
      { label: "Shopping sidekick", href: "/#sidekick" },
      { label: "Buyer protection", href: "/discover" },
      { label: "Connect your agent", href: "/agent" },
    ],
  },
  {
    title: "Build",
    links: [
      { label: "MCP link", href: "/tools/agent" },
      { label: "API", href: "/tools/api" },
      { label: "MIT license", href: `${githubUrl}/blob/main/LICENSE` },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="bg-leaf-900 text-white">
      <Container className="flex flex-col gap-16 pt-20 pb-10">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
          <div className="flex max-w-[360px] flex-col gap-5">
            <Wordmark className="text-white" />
            <p className="text-lg text-white/80">
              Your closet, open for business. A personal seller for the things
              you no longer use.
            </p>
          </div>
          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-10 sm:grid-cols-3 sm:gap-20"
          >
            {columns.map((col) => (
              <div key={col.title} className="flex flex-col gap-3">
                <p className="pb-1 text-sm font-bold tracking-wide text-lemon-400 uppercase">
                  {col.title}
                </p>
                {col.links.map((link) =>
                  link.href.startsWith("http") ? (
                    <a
                      key={link.label}
                      href={link.href}
                      className="text-base hover:underline"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="text-base hover:underline"
                    >
                      {link.label}
                    </Link>
                  ),
                )}
              </div>
            ))}
          </nav>
        </div>
        <div className="flex flex-col gap-2 border-t border-leaf-600 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-base">
            Made by Wizard of Hahz
            <a
              href="https://www.linkedin.com/in/wizard-of-hahz"
              className="font-bold text-lemon-400 hover:underline"
            >
              Linkedin
            </a>
          </p>
        </div>
      </Container>
    </footer>
  );
}
