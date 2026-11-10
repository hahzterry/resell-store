import type { CSSProperties, ReactNode } from "react";
import {
  Body,
  Button as EmailButton,
  Column,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "react-email";
import { money, siteUrl } from "./config";
import { color, font, fontsHref, radius } from "./theme";

/*
 * The pieces every email is built from. Tables and inline styles only: no
 * flex, gap or CSS variables, which Gmail and Outlook drop.
 */

export function EmailLayout({
  preview,
  children,
  footer,
}: {
  /** The grey line inboxes show after the subject. */
  preview: string;
  children: ReactNode;
  /** Why they got this email. Defaults to the sign-in wording. */
  footer?: ReactNode;
}) {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light" />
        <link rel="stylesheet" href={fontsHref} />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={{ padding: "8px 8px 20px" }}>
            <Link href={siteUrl} style={{ textDecoration: "none" }}>
              <span style={styles.wordmark}>
                resell
                <span style={styles.wordmarkDot} aria-hidden="true" />
                <span style={styles.srOnly}>.</span>
                store
              </span>
            </Link>
          </Section>

          <Section style={styles.card}>{children}</Section>

          <Section style={{ padding: "24px 8px 8px" }}>
            <Text style={styles.footer}>{footer}</Text>
            <Text style={{ ...styles.footer, marginTop: 12 }}>
              <Link href={siteUrl} style={styles.footerLink}>
                Bro Resell
              </Link>
              {"  ·  "}Sell your stuff, with an agent that does the boring parts.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/** Footer line for notification emails: why they got it, and where to stop it. */
export function NotifyFooter({ reason }: { reason: string }) {
  return (
    <>
      You're getting this because you asked for an email when {reason}.{" "}
      <Link href={`${siteUrl}/me`} style={styles.footerLink}>
        Change what we email you
      </Link>
      .
    </>
  );
}

const tagTones = {
  pink: { background: color.pink100, color: color.pink600 },
  leaf: { background: color.leaf100, color: color.leaf600 },
  lemon: { background: color.lemon300, color: color.leaf900 },
  muted: { background: color.surfaceMuted, color: color.textMuted },
} as const;

export type Tone = keyof typeof tagTones;

/** A small pill above the title: "New offer", "Sold". */
export function Tag({ tone = "leaf", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <Text style={{ margin: "0 0 14px" }}>
      <span style={{ ...styles.tag, ...tagTones[tone] }}>{children}</span>
    </Text>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Lead({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <Text style={{ ...styles.lead, ...style }}>{children}</Text>;
}

export function Small({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <Text style={{ ...styles.small, ...style }}>{children}</Text>;
}

/** Pill buttons. Primary is lemon, secondary is outlined. */
export function Button({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "dark";
}) {
  return (
    <EmailButton href={href} style={{ ...styles.button, ...buttonVariants[variant] }}>
      {children}
    </EmailButton>
  );
}

/** One or two buttons side by side, wrapping on narrow screens. */
export function Actions({ children }: { children: ReactNode }) {
  return <Section style={{ marginTop: 28 }}>{children}</Section>;
}

/** Listing photo, title and a line under it. */
export function ListingRow({
  title,
  imageUrl,
  meta,
  href,
}: {
  title: string;
  imageUrl?: string | null;
  meta?: ReactNode;
  href?: string;
}) {
  const name = <span style={styles.listingTitle}>{title}</span>;
  return (
    <Section style={styles.listingRow}>
      <Row>
        <Column style={{ width: 76, verticalAlign: "middle" }}>
          <Thumb src={imageUrl} alt={title} size={64} />
        </Column>
        <Column style={{ verticalAlign: "middle" }}>
          {href ? (
            <Link href={href} style={{ textDecoration: "none" }}>
              {name}
            </Link>
          ) : (
            name
          )}
          {meta && <Text style={{ ...styles.small, margin: "4px 0 0" }}>{meta}</Text>}
        </Column>
      </Row>
    </Section>
  );
}

/** A square photo, or a lemon tile when there isn't one. Fluid fills its column up to `size`. */
export function Thumb({
  src,
  alt,
  size,
  fluid,
}: {
  src?: string | null;
  alt: string;
  size: number;
  fluid?: boolean;
}) {
  if (src) {
    return (
      <Img
        src={src}
        alt={alt}
        width={size}
        height={fluid ? undefined : size}
        style={{
          display: "block",
          borderRadius: radius.md,
          objectFit: "cover",
          ...(fluid && { width: "100%", maxWidth: size, height: "auto" }),
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: fluid ? "100%" : size,
        height: size,
        borderRadius: radius.md,
        background: color.lemon100,
        textAlign: "center",
        lineHeight: `${size}px`,
        fontFamily: font.display,
        fontWeight: 800,
        fontSize: size * 0.4,
        color: color.lemon500,
      }}
    >
      {alt.trim()[0]?.toUpperCase()}
    </div>
  );
}

/** Up to three numbers in a row: "Offer $20 · Your price $24 · Lowest $20". */
export function Stats({
  items,
}: {
  items: { label: string; value: string; highlight?: boolean }[];
}) {
  return (
    <Section style={{ marginTop: 16 }}>
      <Row>
        {items.map((item, i) => (
          <Column
            key={item.label}
            style={{
              ...styles.stat,
              background: item.highlight ? color.lemon100 : color.surfaceMuted,
              borderLeft: i === 0 ? undefined : `4px solid ${color.surface}`,
            }}
          >
            <Text style={styles.statLabel}>{item.label}</Text>
            <Text style={styles.statValue}>{item.value}</Text>
          </Column>
        ))}
      </Row>
    </Section>
  );
}

const noteTones = {
  agent: { background: color.leaf100, label: color.leaf600 },
  lemon: { background: color.lemon100, label: color.leaf900 },
  pink: { background: color.pink100, label: color.pink600 },
  muted: { background: color.surfaceMuted, label: color.textMuted },
} as const;

/** A tinted box. The agent's take, a hold, a heads-up. */
export function Note({
  tone = "muted",
  label,
  title,
  children,
}: {
  tone?: keyof typeof noteTones;
  label?: string;
  title?: string;
  children: ReactNode;
}) {
  const t = noteTones[tone];
  return (
    <Section style={{ ...styles.note, background: t.background }}>
      {label && <Text style={{ ...styles.noteLabel, color: t.label }}>{label}</Text>}
      {title && <Text style={styles.noteTitle}>{title}</Text>}
      <Text style={styles.noteBody}>{children}</Text>
    </Section>
  );
}

/** Label / amount lines with a bold last line. */
export function Receipt({
  lines,
  total,
}: {
  lines: { label: string; amount: number }[];
  total: { label: string; amount: number };
}) {
  return (
    <Section style={{ marginTop: 20 }}>
      {lines.map((line) => (
        <Row key={line.label}>
          <Column>
            <Text style={styles.receiptLine}>{line.label}</Text>
          </Column>
          <Column align="right">
            <Text style={styles.receiptLine}>
              {line.amount < 0 ? `−${money(-line.amount)}` : money(line.amount)}
            </Text>
          </Column>
        </Row>
      ))}
      <Row style={{ borderTop: `1px solid ${color.border}` }}>
        <Column>
          <Text style={styles.receiptTotal}>{total.label}</Text>
        </Column>
        <Column align="right">
          <Text style={styles.receiptTotal}>{money(total.amount)}</Text>
        </Column>
      </Row>
    </Section>
  );
}

/** Numbered steps: "1 Print the label  2 Pack it  3 Drop it off". */
export function Steps({ steps }: { steps: { title: string; body?: string }[] }) {
  return (
    <Section style={{ marginTop: 20 }}>
      {steps.map((step, i) => (
        <Row key={step.title} style={{ marginBottom: 12 }}>
          <Column style={{ width: 40, verticalAlign: "top" }}>
            <div style={styles.stepNumber}>{i + 1}</div>
          </Column>
          <Column style={{ verticalAlign: "top" }}>
            <Text style={{ ...styles.listingTitle, margin: "3px 0 0", fontSize: 16 }}>
              {step.title}
            </Text>
            {step.body && <Text style={{ ...styles.small, margin: "2px 0 0" }}>{step.body}</Text>}
          </Column>
        </Row>
      ))}
    </Section>
  );
}

export function Divider() {
  return <Section style={{ borderTop: `1px solid ${color.border}`, margin: "28px 0 24px" }} />;
}

const buttonVariants = {
  primary: { background: color.lemon400, color: color.leaf900, border: `2px solid ${color.lemon400}` },
  secondary: { background: color.surface, color: color.leaf900, border: `2px solid ${color.border}` },
  dark: { background: color.leaf900, color: color.background, border: `2px solid ${color.leaf900}` },
} as const;

export const styles = {
  body: {
    margin: 0,
    padding: "24px 0",
    background: color.background,
    color: color.text,
    fontFamily: font.sans,
    WebkitFontSmoothing: "antialiased",
  },
  container: { width: "100%", maxWidth: 560, margin: "0 auto", padding: "0 12px" },
  wordmark: {
    fontFamily: font.display,
    fontWeight: 800,
    fontSize: 22,
    letterSpacing: "-0.03em",
    color: color.text,
  },
  /* The period, drawn as the yellow dot. */
  wordmarkDot: {
    display: "inline-block",
    width: 7,
    height: 7,
    margin: "0 1px",
    borderRadius: "50%",
    background: color.lemon400,
  },
  srOnly: {
    display: "inline-block",
    width: 0,
    height: 0,
    overflow: "hidden",
    fontSize: 0,
  },
  card: {
    background: color.surface,
    border: `1px solid ${color.border}`,
    borderRadius: radius.lg,
    padding: "32px 28px",
  },
  tag: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: radius.full,
    fontSize: 13,
    lineHeight: "18px",
    fontWeight: 700,
  },
  title: {
    margin: 0,
    fontFamily: font.display,
    fontWeight: 800,
    fontSize: 30,
    lineHeight: "34px",
    letterSpacing: "-0.03em",
    color: color.text,
  },
  lead: { margin: "12px 0 0", fontSize: 17, lineHeight: "26px", color: color.text },
  small: { margin: "8px 0 0", fontSize: 14, lineHeight: "20px", color: color.textMuted },
  button: {
    display: "inline-block",
    padding: "13px 24px",
    marginRight: 8,
    marginBottom: 8,
    borderRadius: radius.full,
    fontSize: 16,
    lineHeight: "20px",
    fontWeight: 700,
    textDecoration: "none",
  },
  listingRow: {
    marginTop: 24,
    padding: 12,
    border: `1px solid ${color.border}`,
    borderRadius: radius.lg,
  },
  listingTitle: {
    fontSize: 17,
    lineHeight: "22px",
    fontWeight: 700,
    color: color.text,
    margin: 0,
  },
  stat: { padding: "12px 14px", borderRadius: radius.md, verticalAlign: "top" },
  statLabel: { margin: 0, fontSize: 13, lineHeight: "18px", fontWeight: 500, color: color.textMuted },
  statValue: {
    margin: "2px 0 0",
    fontFamily: font.display,
    fontWeight: 800,
    fontSize: 24,
    lineHeight: "28px",
    letterSpacing: "-0.02em",
    color: color.text,
  },
  note: { marginTop: 16, padding: "16px 18px", borderRadius: radius.md },
  noteLabel: {
    margin: 0,
    fontSize: 12,
    lineHeight: "16px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  noteTitle: { margin: "6px 0 0", fontSize: 17, lineHeight: "24px", fontWeight: 700, color: color.text },
  noteBody: { margin: "4px 0 0", fontSize: 15, lineHeight: "22px", color: color.text },
  receiptLine: { margin: "6px 0", fontSize: 15, lineHeight: "22px", color: color.textMuted },
  receiptTotal: { margin: "10px 0 0", fontSize: 17, lineHeight: "24px", fontWeight: 700, color: color.text },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    background: color.lemon300,
    textAlign: "center",
    lineHeight: "28px",
    fontSize: 14,
    fontWeight: 700,
    color: color.leaf900,
  },
  footer: { margin: 0, fontSize: 13, lineHeight: "20px", color: color.textMuted },
  footerLink: { color: color.textMuted, textDecoration: "underline" },
} satisfies Record<string, CSSProperties>;
