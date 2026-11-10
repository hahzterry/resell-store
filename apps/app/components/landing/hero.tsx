import Link from "next/link";
import { Button } from "@repo/ui/button";
import { ArrowUpRightIcon, CheckIcon } from "@repo/ui/icons";
import { FlowerMark } from "@repo/ui/whimsy";
import { cn } from "@repo/ui/lib/utils";
import { AddToAgent } from "./add-to-agent";
import { HeroPhone } from "./hero-phone";
import { Float, Pop } from "./motion";
import {
  authorUrl,
  bigButton,
  Container,
  renderDeployUrl,
} from "./parts";
import { PayPalLogo } from "./paypal-logo";

function HeroVisual() {
  return (
    <div className="relative hidden h-[720px] w-[520px] shrink-0 md:block">
      <div className="absolute top-[290px] left-[170px]">
        <div className="size-[430px] rounded-full bg-lemon-300" />
      </div>
      <div className="absolute top-0 left-[61px]">
        <div className="h-[720px] w-[398px] overflow-hidden rounded-[52px] border-4 border-leaf-900 bg-background">
          <HeroPhone className="h-full" />
        </div>
      </div>
      <Pop className="absolute -top-[18px] left-6" delay={0.7} rotate={-90}>
        <Float tilt={18} duration={5}>
          <FlowerMark size={64} />
        </Float>
      </Pop>
      <Pop className="absolute top-[604px] -left-14" delay={1.1} rotate={-8}>
        <div className="flex h-14 items-center gap-3 rounded-full bg-text pr-5 pl-4">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
            <CheckIcon size={16} />
          </span>
          <span className="text-base font-semibold whitespace-nowrap text-background">
            Link copied. Go show it off.
          </span>
        </div>
      </Pop>
    </div>
  );
}

export function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <Container className="flex flex-col items-center gap-16 overflow-x-clip pt-8 pb-20 md:pt-12 xl:flex-row xl:pb-24">
      <div className="flex min-w-0 flex-1 flex-col gap-7">
        <h1 className="font-display text-[44px] leading-[46px] font-extrabold tracking-[-0.035em] md:text-[64px] md:leading-[66px] xl:text-[76px] xl:leading-[76px]">
          Sell your stuff without doing the selling
        </h1>
        <p className="max-w-[600px] text-lg text-text-muted md:text-xl md:leading-8">
          Snap a photo. Your agent works out a fair price, writes the listing,
          answers buyers, haggles for you and gets you paid through PayPal. You
          just say yes.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            className={bigButton}
            render={<Link href={signedIn ? "/home" : "/welcome"} />}
            nativeButton={false}
          >
            {signedIn ? "Go to your shop" : "Open your shop in 5 minutes"}
          </Button>
          <Button
            variant="soft"
            className={cn(bigButton, "border px-7")}
            render={<Link href="/discover" />}
            nativeButton={false}
          >
            Shop the marketplace
          </Button>
        </div>
        <AddToAgent signedIn={signedIn} />
        <div className="mt-3 flex w-fit flex-col gap-3 rounded-2xl border border-border bg-surface px-6 py-5 shadow-[0_10px_30px_-18px_rgb(0_41_145/0.45)] sm:flex-row sm:items-center sm:gap-6">
          <PayPalLogo className="h-9 w-auto shrink-0 self-start text-[#002991] sm:self-center" />
          <span aria-hidden className="hidden h-11 w-px bg-border sm:block" />
          <div className="flex flex-col justify-center">
            <span className="font-semibold">
              Every payment runs through PayPal
            </span>
          </div>
        </div>
        <div className="mt-4 ml-1 flex flex-wrap items-center gap-x-5 gap-y-3">
          <a
            href={renderDeployUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 transition-opacity hover:opacity-85"
          >
            {/* Render's official button artwork */}
            <img
              src="https://render.com/images/deploy-to-render-button.svg"
              alt="Deploy to Render"
              width={153}
              height={40}
            />
          </a>
          <a
            href={authorUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text hover:underline"
          >
            Built by Wizard of Hahz
            <ArrowUpRightIcon size={14} strokeWidth={2.6} />
          </a>
        </div>
      </div>
      <HeroVisual />
    </Container>
  );
}