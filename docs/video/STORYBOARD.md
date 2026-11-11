---
format: 1920x1080
duration: 2m56s
message: "Snap a photo, say yes, get paid — your agent does the selling in between."
arc: Hook → Friction → The turn → Product → One item, photo to payout → Buyer's agent → Shopping sidekick → Close → How each sponsor powers it → Open source → Mission
audience: PayPal AI Hackathon judges on Devpost, and landing page visitors
mode: collaborative
look: "Brand tokens from packages/ui/src/styles.css. Cream #fffdf2 ground, leaf-900 #14261d ink, lemon-400 #ffd934 primary, leaf-600 #256b4c secondary, pink-400 #ff5fa8 = the agent (its sparkle mark). Bricolage Grotesque ExtraBold for display, Figtree for body. Big rounded cards (24–40px radius), 4px leaf-900 borders on device frames, flat illustrations. Motion: springy pops and reveals like the landing page (components/landing/motion.tsx), never glossy 3D."
music: "Royalty-free, warm indie-pop / upbeat lo-fi, ~112 BPM. Sparse plucks for frames 1–3, the full groove drops on the title (frame 4), it pulls back to a tense minimal loop for the negotiation (frame 10), lifts on Accept (frame 11), and resolves on the end card."
---

# Storyboard — resell.store demo

The spine is one item, **Maya's yellow Le Creuset dutch oven**, going from photo to payout. Every app shot is a real capture from `captures/`. Frame screens inside a browser card (4px leaf-900 border, 24px radius) on the cream ground, and push in on the part that matters rather than showing whole screens at a distance. The pink sparkle = the agent: whenever the agent acts, a pink sparkle pops beside the action.

Times are guides. The VO is in `SCRIPT.md` and is generated separately, so on-screen type must carry each frame's point with the music alone.

## Frame 1 — Hook: the stuff at home

- scene: Flat item illustrations drop and pile up; "$4,267" counts up over them
- card: $4,267 of unused stuff at home
- duration: 7s
- transition_in: cut
- voiceover: "The average American home has over four thousand dollars of stuff it never uses."
- on_screen: "$4,267" / "of unused stuff in the average US home" / src: Mercari 2023 Reuse Report
- assets: the app's flat illustrations (dutch oven, film camera, dress, sweater, record, lamp)
- poster: 5s

Cold open on cream. Items drop in one by one on the beat, bounce and stack into a wobbly pile. The number counts up in Bricolage ExtraBold, leaf-900, with a lemon highlighter swipe under "unused". End with the yellow dutch oven nudged to the top of the pile, since it's our hero.

## Frame 2 — Why it stays there

- scene: A checklist of selling chores fills fast and turns into a mess; "$15.9B lost to fraud" lands as the last line
- card: Price it. Shoot it. Write it. Haggle. Dodge scams.
- duration: 10s
- transition_in: crossfade
- voiceover: "Because selling it means pricing it, photographing it, writing it up, answering the same questions, haggling with lowballers, and dodging scams. So it stays in the cupboard."
- on_screen: "Work out a price · Take photos · Write the listing · 'Is this still available?' · Haggle with lowballers · Dodge scams" then "$15.9B lost to fraud in the US in 2025" / src: FTC, 2026
- poster: 8s

Chores tick in quickly, each a rounded pill, getting faster and more crowded until they jam. Two fake chat bubbles flick past ("is this still available??", "$20 cash today?"). Then hard stop: the pile from frame 1 slides back into a cupboard and the door shuts. Fraud stat in pink-600.

## Frame 3 — The turn

- scene: Two stat cards flip in: "1 in 3" and "6 in 10"
- card: 1 in 3 would sell if AI listed it
- duration: 8s
- transition_in: wipe
- voiceover: "But a third of people who never sell say they would, if AI did the listing. Six in ten would let AI do the haggling. So we built that."
- on_screen: "1 in 3 non-sellers would sell if AI listed it" / "6 in 10 would let AI negotiate their deals" / src: ThredUp 2026 Resale Report
- poster: 6s

Lemon background wipe. The two cards pop in with the landing page's Pop rotate. On "So we built that", the cupboard door from frame 2 swings open again.

## Frame 4 — Meet resell.store

- scene: Wordmark, then the hero line, then the landing hero slides up in a browser card
- duration: 6s
- transition_in: cut
- voiceover: "This is resell.store. Sell your stuff, without doing the selling."
- on_screen: "Sell your stuff without doing the selling" + pill "Built for the PayPal AI Hackathon"
- assets: captures/desktop/l1-landing-hero.png, @repo/ui/logo wordmark, FlowerMark
- poster: 4s

The music drops here. Wordmark (with the lemon dot) pops center, the FlowerMark spins in, the line types on, then the landing hero capture rises from below. PayPal hackathon pill in the corner.

## Frame 5 — Snap a photo

- scene: Phone: the "What are you selling?" screen; the photo lands, one line types in
- duration: 7s
- transition_in: crossfade
- voiceover: "Maya snaps her old dutch oven and adds one line."
- on_screen: "Step 1 of 1 that's actually yours: snap a photo"
- assets: captures/phone/m-c1-start.png, captures/desktop/c1-start.png
- poster: 5s

Phone frame left-of-center (52px radius, 4px border, like the hero phone). The pot illustration drops into the photo slot, then "Le Creuset dutch oven, the yellow one. It was a wedding gift." types out in the field. Desktop c1 sits blurred behind for depth.

## Frame 6 — The agent does the research

- scene: Research screen: "Looked in 4 places, took 38 seconds", price range bar fills, suggested $185
- duration: 12s
- transition_in: push
- voiceover: "Her agent checks what the same pot really sells for: recent sales, live listings, the maker's own site. Thirty-eight seconds later, it has a fair price."
- on_screen: "Used ones sell for $160 to $210 · Suggested $185"; sponsor tags "Channel3 · product data" and "Kernel · cloud browsers for price research"; pink sparkle on the agent messages
- assets: captures/desktop/c2-research.png (plus a LIVE research run, see below)
- poster: 9s

Push in on the chat column first: the agent bubble, then the "Looked in 4 places" row ticks green. Pan right to "Your listing". The range bar's band and dot animate in, and $185 counts up. Source chips (42 recent sales / The maker's site / 318 buyer reviews) pop one by one. Two small sponsor tags slide in at the bottom-left: Channel3 and Kernel.

## Frame 7 — It asks, then it writes

- scene: Quick 3-shot montage: findings questions → photos → the words
- duration: 8s
- transition_in: cut
- voiceover: "It only asks what a photo can't show, then writes the listing for her."
- on_screen: "It asks what a photo can't show" → "…and writes the rest"
- assets: captures/desktop/c3-findings.png, c5-photos.png, c6-words.png
- poster: 6s

Cut on the beat: c3 zoomed on the question chips ("Yes, the original box / No box"), c5 zoomed on the photo tips, then c6 zoomed on the title "Sunny yellow Le Creuset dutch oven, 5.5 qt" with the description typing. The 5-step progress bar along the top fills Research → Words across the three cuts.

## Frame 8 — Live in her own shop

- scene: Publish → Maya's shop page on desktop and phone
- duration: 8s
- transition_in: zoom
- voiceover: "One tap, and it's live in her own shop, with a link she can share anywhere."
- on_screen: "maya.broresell.com" URL pill; "Link copied. Go show it off." toast
- assets: captures/desktop/c7-publish.png, captures/desktop/p2-store.png, captures/phone/m-p2-store.png
- poster: 6s

Press the "Publish listing" button (cursor tap and ripple) on c7. Zoom out through the button into p2 "Maya's closet". The phone version slides in front at an angle. The black "Link copied" toast from the landing hero pops in.

## Frame 9 — It answers buyers

- scene: Seller inbox: "Your agent handled" list; a buyer's question gets an instant agent answer
- duration: 7s
- transition_in: crossfade
- voiceover: "When buyers ask questions, her agent answers from the listing, and hands over to Maya when it can't."
- on_screen: "Answered in seconds" · "Needs you" chip
- assets: captures/desktop/a5-inbox.png, captures/desktop/p6-messages.png
- poster: 5s

Zoom into a5's "Your agent handled" column. The rows tick in with pink sparkles. Then a tight crop of p6's "Second Shutter's agent answered from the listing in a few seconds" bubble as proof from the buyer's side.

## Frame 10 — Two agents haggle

- scene: Offer screen: "Jess offered $170"; the "How it went" timeline builds row by row, $150 → $178 → $165 → $175 → $170
- duration: 14s
- transition_in: cut
- voiceover: "Then Jess's agent makes an offer. Maya's agent counters, asks for a deposit to show she's serious, and comes back ten dollars over Maya's lowest. But it never accepts on its own. Good offers wait for your yes."
- on_screen: "Her agent and yours went back and forth for 29 minutes"; "$20 hold paid" chip (PayPal); end card line "Good offers wait for your yes."; stat chip "Only 12% trust AI to pay without asking — Accenture 2026"
- assets: captures/desktop/c10-offer.png (mask and reveal row by row), captures/phone/m-c10-offer.png
- poster: 12s

This is the "agentic commerce" money shot, so give it room. Music goes minimal. The timeline reveals one row per beat, prices counting, with Jess's agent rows from the left (pink-100 avatar) and "Your agent" rows from the right (pink sparkle). The "$20 hold paid" chip pops with a small PayPal shield. Push to the right card: "I'd take it. It's $10 over your lowest…". Hold on it, then "Good offers wait for your yes." in big type over a lemon panel, with the Accenture stat in the corner as the reason.

## Frame 11 — Say yes, PayPal does the rest

- scene: Tap "Accept $170" → PayPal sandbox approval (live) → "Where your money waits" → Sales and payouts "$96 on its way"
- duration: 12s
- transition_in: cut
- voiceover: "Maya taps accept. PayPal takes the payment, holds it until the pot arrives, then pays her out."
- on_screen: "Paid" → "Held until it arrives" → "Paid out" along the money timeline
- assets: captures/desktop/c10-offer.png (Accept button), LIVE PayPal sandbox recording, captures/desktop/p4-checkout.png ("Where your money waits"), captures/desktop/b5-sales-payouts.png
- poster: 10s

Cursor taps "Accept $170": the button squishes and the music lifts. Cut to the live PayPal sandbox approval (2–3s). Then p4's "Where your money waits" timeline (Today: PayPal holds it → Ships → Paid out) draws as a progress line. Land on b5 with the "$96 on its way" figure counting. Keep it quick: frame 18 explains PayPal in detail.

## Frame 12 — Buyers can send their own agent

- scene: "Send your agent shopping." Chat: "Find me a tested 35mm film camera under $150" → the agent finds it → "Go no higher than $126" → hand it to your agent
- duration: 10s
- transition_in: wipe
- voiceover: "And buyers can send their own agent. Add resell.store to the AI assistant you already use, set a limit, and it shops, makes offers, and asks before it pays."
- on_screen: "One MCP link. Any agent." / "AI shopping traffic up 693% last holiday — Adobe" / the MCP link pill from the hero
- assets: captures/desktop/p7-buyer-agent.png, captures/desktop/p6-messages.png (right rail), captures/desktop/d3-api.png (code card)
- poster: 8s

Flip the perspective: the background turns leaf-900, white type. p7's right card plays as a chat: the user bubble, then the "Your assistant, using resell.store" answer, then the camera result card. Cut to p6's right rail: the "$126" ceiling types, then the hand-off button (crop or cover its label, which names an assistant). A quick flash of the d3 API code card ("list something with one request") says this is a real API underneath. No third-party names or logos: crop p7 above its "Pick your assistant" row.

## Frame 13 — The shopping sidekick

- scene: Shopping sidekick: "Know what it's worth before you buy it." Two dresses at the same $120: one sells on for $70, the other for $25, and a "Better buy" sticker lands
- card: Know what it's worth before you buy it
- duration: 10s
- transition_in: wipe
- voiceover: "Buyers get a shopping sidekick too. Snap a tag or paste a link, and see what it'll be worth later. Not to flip it. Just to buy smarter."
- on_screen: "Know what it's worth before you buy it" · "Same $120. Sells on for $70 vs $25." · "Better buy" sticker · "Not to flip. Just to know."
- assets: captures/desktop/d4-sidekick.png, captures/desktop/d4-sidekick-full.png ("Things you've checked"), captures/phone/m-d4-sidekick.png
- poster: 7s

Start on the phone (m-d4-sidekick), as if you're in a shop: "black wrap dress, $120" types into the field and "Check it" taps. Cut to the desktop hero: the two dress cards flip in, the "$70" and "$25" figures count, and the pink "Better buy" sticker slaps onto the wrap dress with the landing page's Pop rotate. Pull down to "Things you've checked": the "Holds its value" and "Loses most of it" chips pop. End on the last row, "Yellow dutch oven · You own this · List it". That's the callback: what you buy smart today is easy to sell tomorrow, and it loops back to Maya's pot. Runs on the same research as listing (Channel3 + Kernel).

## Frame 14 — Close

- scene: Market stat counts up, then the payoff line
- card: We made selling as easy as saying yes.
- duration: 6s
- transition_in: zoom
- voiceover: "US resale is heading for three hundred billion dollars. We made selling as easy as saying yes."
- on_screen: "$306.5B US resale market by 2030 — OfferUp 2025 Recommerce Report" → "We made selling as easy as saying yes."
- poster: 5s

The stat counts up for 2s, then swaps for the line in big type. The music resolves here, then drops to a lighter "credits" groove for the sponsor screens.

## Frame 15 — Render: where it all runs

- scene: Sponsor screen: "Render" title card, a services diagram (web, Postgres, Workflow, cron), shop subdomain URLs, and the timed-jobs list ticking
- card: Render — hosting, Postgres, Workflows
- duration: 7s
- transition_in: push
- voiceover: "Render runs it all: the app, every shop on its own subdomain, the Postgres database, and a background workflow that expires offers, nudges sellers to ship, and releases payouts on time."
- on_screen: "Render" · "Hosts the app, every shop at name.resell.store, plus api., docs. and mcp." · "Postgres with pgvector for search" · "Render Workflows run the timed jobs: offers expire · ship-by reminders · unshipped orders cancel · 'did it arrive?' check · payouts release · quiet disputes escalate" · "One render.yaml deploys the lot"
- assets: render.yaml (services: resell-store web, resell-db, resell-sweeps workflow, resell-sweeps-cron), captures/desktop/p2-store.png (maya.broresell.com URL), LIVE Render dashboard recording (optional)
- poster: 5s

Same template for frames 15–18: the sponsor name big on the left in Bricolage, and on the right a mini diagram or the app screen it powers, with 3–5 short lines popping in one by one. For Render, draw four service boxes (web · Postgres · Workflow · cron) wired together, with shop URLs (maya., secondshutter.) peeling off the web box. The Workflow box ticks through its timed jobs like a checklist.

## Frame 16 — Channel3: what the item really is

- scene: Sponsor screen: "Channel3", one API call fanning out into the facts on the research screen
- card: Channel3 — real-time product data
- duration: 7s
- transition_in: push
- voiceover: "Channel3 tells the agent exactly what the item is: what it costs new, what it resells for, and the maker's own photos, all from one API."
- on_screen: "Channel3" · "Identifies the item from a photo and a line" · "Live price new: 'Still sold new, $420'" · "Resale offers across retailers" · "Maker photos for the listing"
- assets: captures/desktop/c2-research.png (the "Still sold new / Yes, for $420" row and the "The maker's site" chip), captures/desktop/c5-photos.png (maker photos)
- poster: 5s

Show a short request line ("search: Le Creuset dutch oven, yellow") fanning into four result cards, then cut to c2's right column with those values highlighted.

## Frame 17 — Kernel: research in real browsers

- scene: Sponsor screen: "Kernel", cloud browser windows tiling in (resale marketplaces, the open web, a signed-in account), with listings flowing back into the price range
- card: Kernel — cloud browsers for real listing research
- duration: 7s
- transition_in: push
- voiceover: "Kernel gives the agent real browsers in the cloud. It searches the popular resale marketplaces and the wider web, and with managed sign-in, sellers can let it use their own accounts on the big platforms."
- on_screen: "Kernel" · "Cloud browsers the agent drives" · "Searches popular resale marketplaces and the web" · "Managed sign-in: use your own accounts on popular platforms" · "Real listings, not guesses → $160 to $210"
- assets: LIVE recording of Kernel browser sessions (Kernel's live view) during a research run, captures/desktop/c2-research.png (the price range bar)
- poster: 5s

Three or four small browser frames tile in with generic labels only ("Resale marketplace", "The web", "Your account"): no site names, no logos, and blur the address bars in any live recording. A small padlock with "Signed in as you" sits on the account frame. Listing cards slide out of the windows into c2's price range bar, which fills. **Build check:** today `kernel.ts` searches public marketplace listings only, and managed sign-in isn't built yet. Ship it before the video goes out, since judges check that what's shown works, or drop the sign-in line.

## Frame 18 — PayPal: every dollar, start to finish

- scene: Sponsor screen: "PayPal" as lead sponsor, the money path from connect to payout with each step lighting up
- card: PayPal — paying, holding, fees, disputes
- duration: 8s
- transition_in: push
- voiceover: "And PayPal moves every dollar. Sellers connect in a tap, buyers can pay later, the money's held until the item arrives, our fee comes off automatically, and refunds and disputes are handled."
- on_screen: "PayPal — lead sponsor" · "Sellers connect in a tap" · "Checkout, with Pay Later" · "Deposits on offers" · "Money held until it arrives" · "Our fee taken automatically" · "Payouts when it lands" · "Refunds and disputes, synced by webhook"
- assets: apps/app/components/landing/paypal-logo.tsx, captures/desktop/d1-connections.png (Connect PayPal), captures/desktop/p4-checkout.png (Pay Later, "Where your money waits"), captures/desktop/b5-sales-payouts.png, LIVE PayPal sandbox recording
- poster: 6s

Give PayPal the biggest of the four, on the leaf-900 card from the landing page PayPal block. Draw the money path left to right (Connect → Pay → Hold → Fee → Payout, with Refund/Dispute as a branch off Hold). Each node lights up with its line, and the matching screen flashes in a small window beside it.

## Frame 19 — Open source, every step covered

- scene: "resell.store is open source." A grid of tiles, each a mini capture, checks off every piece that ships: sales page, sign-in, seller app, two-sided marketplace, shop pages, agents, API + MCP + docs, PayPal payments, notification emails, design system, tests, one-file Render deploy
- card: Open source. Every step covered.
- duration: 12s
- transition_in: crossfade
- voiceover: "And resell.store is open source. You get the whole thing: the sales page, sign-in, a full two-sided marketplace, the design system, the agents, the API, payments and the notification emails. Every step, covered."
- on_screen: "resell.store is open source" · tiles: "Sales page" · "Sign-in" · "Seller app" · "Two-sided marketplace" · "Shop pages" · "Selling + buying agents" · "API, MCP + docs" · "PayPal payments" · "Notification emails" · "Design system" · "Tests" · "Deploys to Render in one file" · end line "Every step, covered." · "github.com/impactvelocity/resell-store"
- assets: captures/desktop/l1-landing-full.png (sales page), a1-welcome.png (sign-in), a3-home-selling.png (seller app), p1-discover.png + p2-store.png (marketplace, shops), c10-offer.png (agents), d3-api.png + d6-api-docs.png (API, MCP, docs), p4-checkout.png (payments), captures/email/e-offer-received.png + e-agent-summary.png + e-sold.png + e-paid-out.png (emails), d5-design-system.png (UI), render.yaml (deploy)
- poster: 10s

A 4×3 grid on cream. Each tile pops in on the beat with a tiny live thumbnail and a green check, quick enough to feel like a lot. The emails get a little extra: two or three of the email captures fan out like a hand of cards from their tile. When the grid is full, everything nudges back and "Every step, covered." lands big, with the GitHub URL under it. This frame is for builders and judges: it shows the size of what was built.

## Frame 20 — The mission

- scene: Callback to frame 1: the pile of unused things empties as each item flies off to a new owner, then the mission line, then the wordmark end card
- card: Nothing good goes unused.
- duration: 10s
- transition_in: zoom
- voiceover: "Our mission: nothing good goes unused. Sellers get the value back, buyers pay a fair price, and every thing finds its next home. resell.store."
- on_screen: "$560 billion of unused stuff in US homes" / src: Mercari 2023 Reuse Report → "Nothing good goes unused." → "Sellers get the value back. Buyers pay a fair price. Everything finds its next home." → end card: "resell.store" · "Snap a photo. Say yes. Get paid." · "Built for the PayPal AI Hackathon" · "Open source on GitHub" · "Open your shop in 5 minutes"
- assets: the frame 1 item illustrations, frame 2's cupboard, @repo/ui/logo, FlowerMark, lemon circle from the hero
- poster: 7s

Bookend the film. Start on the frame 1 pile with the cupboard behind it and "$560 billion" counting up over it. Then, one per beat, each item pops off the pile and arcs out to a small card for its new owner (a shop tile, a buyer avatar, a "Sold" chip). The dutch oven goes last and lands with Jess. The cupboard is left open and empty. "Nothing good goes unused." lands big in leaf-900, with the two lines under it. Then the lemon circle from the hero grows to fill the frame, and the wordmark, tagline and badges pop in with the FlowerMark spinning on the final beat. Hold the end card for 3s, since it doubles as the YouTube end frame and the landing page poster.

---

## Live footage to record

The captures are the designed prototype. Devpost judges "working end-to-end", so record these from the **live** app (screen recording at 1600×1000, so it matches the captures) and cut them in:

1. **PayPal sandbox checkout** (frames 11, 18): accept the offer → PayPal approval page → back to the order. Use the demo buyer from `.env.local` (`PAYPAL_DEMO_BUYER_*`). Blur the email field.
2. **Research running** (frame 6): a real `/list/new` → research job filling in. Speed it up 4–8×, with a "real time: 38s" tag.
3. **Kernel browsers** (frame 17): Kernel's live view of the cloud browsers during that same research run.
4. Optional: **the Render dashboard** (frame 15), showing the services and a resell-sweeps workflow run.
5. Optional: **an MCP client** using the buyer MCP to search and make an offer (frame 12). Show it as text and UI only, without the assistant's logo.
6. Optional: **the negotiator countering** a real lowball offer (frame 10).

## Landing page version

The same cut drops into `VideoDemo` (`apps/app/components/landing/video-demo.tsx`). Upload it to YouTube and paste the link into `DEMO_VIDEO_URL`. Use the frame 20 end card (its last 3s) (or the frame 10 "Good offers wait for your yes" frame) as the YouTube thumbnail, since the player shows `maxresdefault.jpg`.
