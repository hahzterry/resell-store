"use client";

import { useState } from "react";
import { cn } from "@repo/ui/lib/utils";
import { docsUrl } from "../../lib/urls";
import { Container } from "./parts";

/*
 * The demo video, between the hero and "how it works". Paste a YouTube link
 * or a direct .mp4 URL into DEMO_VIDEO_URL. Until then the frame shows a
 * placeholder. YouTube only loads once someone presses play.
 */
const DEMO_VIDEO_URL = "https://www.youtube.com/watch?v=Nus5lpO5wL0";

function youtubeId(url: string) {
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/,
  );
  return m?.[1] ?? null;
}

function PlayButton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-20 items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_12px_32px_-8px_rgb(0_0_0/0.45)] transition-transform group-hover:scale-105 md:size-24",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="ml-1 size-8 md:size-10"
        fill="currentColor"
      >
        <path d="M7 4.8v14.4a1 1 0 0 0 1.5.87l12.2-7.2a1 1 0 0 0 0-1.74L8.5 3.93A1 1 0 0 0 7 4.8Z" />
      </svg>
    </span>
  );
}

function Player() {
  const [playing, setPlaying] = useState(false);
  const id = DEMO_VIDEO_URL ? youtubeId(DEMO_VIDEO_URL) : null;

  if (id) {
    return playing ? (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
        title="resell.store demo"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="size-full"
      />
    ) : (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        aria-label="Play the demo"
        className="group relative flex size-full cursor-pointer items-center justify-center"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- YouTube's own thumbnail */}
        <img
          src={`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
        <PlayButton className="relative" />
      </button>
    );
  }

  if (DEMO_VIDEO_URL) {
    return (
      <video
        src={DEMO_VIDEO_URL}
        controls
        playsInline
        preload="metadata"
        className="size-full bg-black"
      />
    );
  }

  return (
    <div className="flex size-full flex-col items-center justify-center gap-5 text-center">
      <PlayButton className="opacity-90" />
      <p className="text-base font-semibold text-white/70">
        The demo video goes here
      </p>
    </div>
  );
}

const pill =
  "flex h-12 items-center gap-2 rounded-full px-5 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
const softPill =
  "border-[1.5px] border-border bg-surface text-text hover:bg-surface-muted";

export function VideoDemo() {
  return (
    <Container
      id="demo"
      className="flex scroll-mt-6 flex-col items-center gap-10 pb-20 md:gap-12 md:pb-28"
    >
      <div className="flex max-w-[720px] flex-col items-center gap-4 text-center">
        <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-[56px] md:leading-[58px]">
          Watch your agent sell something
        </h2>
        <p className="text-lg text-text-muted md:text-xl md:leading-[30px]">
          One photo in, a paid order out. PayPal holds the money until it
          arrives.
        </p>
      </div>
      <div className="aspect-video w-full max-w-[1120px] overflow-hidden rounded-[24px] border-4 border-leaf-900 bg-leaf-900 md:rounded-[40px]">
        <Player />
      </div>
      <ul className="flex flex-wrap items-center justify-center gap-3">
        <li>
          <a href={docsUrl("/")} className={cn(pill, softPill)}>
            Read the docs
          </a>
        </li>
      </ul>
    </Container>
  );
}