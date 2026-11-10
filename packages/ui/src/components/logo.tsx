import type { ComponentProps, SVGProps } from "react";
import { cn } from "../lib/utils";

/** The yellow dot on its own, for tight spots where the wordmark won't fit. */
export function DotMark({
  size = 28,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      aria-hidden
      focusable={false}
      {...props}
    >
      <circle cx="22" cy="22" r="22" fill="var(--color-lemon-400)" />
    </svg>
  );
}

const wordmarkSizes = {
  sm: "text-xl",
  md: "text-2xl",
} as const;

/**
 * "broresell" in the display face, with the period drawn as a yellow dot.
 * Sized in em, so a className font size scales the dot with the text.
 */
export function Wordmark({
  size = "md",
  className,
  ...props
}: ComponentProps<"span"> & { size?: keyof typeof wordmarkSizes }) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-display font-extrabold tracking-tight text-text",
        wordmarkSizes[size],
        className,
      )}
      {...props}
    >
      Bro Resell
      <span
        aria-hidden
        className="mx-[0.06em] inline-block size-[0.34em] shrink-0 rounded-full bg-lemon-400"
      />
    </span>
  );
}