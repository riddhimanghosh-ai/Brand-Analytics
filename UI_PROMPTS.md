# UI Prompts — Brand Analytics Dashboard Features

Dark-themed analytics dashboard. Background: near-black (`#0f0f11`). Cards: slightly lighter (`#17171a`) with a 1px subtle border. Monospace font for numbers and labels. All data loads from an API; show skeleton loaders while fetching. Primary accent: blue (`#3b82f6`). Use INR formatting (₹) for currency. Compact, dense layout — this is a power-user tool, not a consumer app.

---

## 1. Events & Campaigns

**Page title**: `📅 Events & Campaigns`
**Subtitle**: `Log every growth lever. See what actually moved revenue.`

### Layout

Two sections stacked vertically:

---

#### Top section — Add Event form (collapsible card)

A card with a `+ Log New Event` button in the top right of the page header. Clicking it expands an inline form (not a modal) directly below the header. Form fields in a single row on desktop:

- **Event name** — text input, placeholder "Diwali Flash Sale"
- **Type** — dropdown: Sale / Influencer Campaign / Product Launch / Email Campaign / Other
- **Start date** — date picker
- **End date** — date picker
- **Revenue target** — number input, optional, placeholder "₹1,00,000"
- **Save** button (primary blue) + **Cancel** link

---

#### Bottom section — Events table

Full-width table with these columns:

| Column | Description |
|--------|-------------|
| Event | Name + type badge (colour-coded pill: sale=orange, campaign=purple, launch=green, other=grey) |
| Period | "Nov 1 – Nov 6" with a small "6 days" note below |
| Status | Pill: `Upcoming` (blue), `Ongoing` (green with a subtle pulse dot), `Ended` (grey) |
| Revenue During | ₹87,400 — large number |
| Daily Run Rate | ₹14,567/day |
| vs Baseline | `+58.3%` in green or `-12.0%` in red. Baseline shown as small grey text below: "Baseline ₹9,200/day" |
| Goal | Progress bar + "97% of ₹90,000 target". Bar is green if ≥100%, amber if 70–99%, red if <70%. Hidden if no target was set. |
| Actions | Trash icon to delete. No edit — delete and re-log. |

Rows sorted newest first. Upcoming events at the top with a blue left border. Ended events slightly dimmed.

Below the table, a `by event type` summary row: small chips showing "Sale avg +74% lift · Campaign avg -10% lift" etc.

---

## 2. Social Comments

**Page title**: `💬 Social Comments`
**Subtitle**: `Live comments from your Meta ads with AI sentiment — public social proof you can act on`

### Top bar
Right-aligned: `↺ Refresh` button + global date range dropdown.

---

### KPI strip — 5 cards in a row

| Card | Value shown |
|------|-------------|
| Comments Pulled | Large number. Subtext: "Readable text, all sources" |
| Positive | Number in green. Subtext: "AI-classified" |
| Negative | Number in red. Subtext: "X% of total" |
| Purchase Intent | Number in amber. Subtext: `"price", "link", "where to buy"…` |
| Instagram / Facebook | "10 / 10". Subtext: "By platform" |

---

### Filter bar

Two rows:

**Row 1 — Sentiment tabs** (pill buttons, only one active at a time):
`All (20)` · `😠 Negative (5)` · `😊 Positive (10)` · `😐 Neutral (5)` · `🛒 Purchase Intent (10)`

**Row 2 — Ad filter** (right-aligned dropdown):
`All ads (4)` → dropdown lists each ad name

---

### Comment feed — scrollable list

Each comment is a card with a **coloured left border**:
- Positive → green border
- Negative → red border
- Neutral → grey border
- Purchase intent → amber border (overrides sentiment colour)

**Inside each card** (single row layout):

```
[Platform icon]  Comment text (full, not truncated)              [🛒 INTENT badge]  [😊 POSITIVE badge]
                 @author · 3h ago · 📢 Earbuds — Feature Reel (IG)
```

- **Platform icon**: Instagram camera icon (purple gradient) or Facebook `f` (blue). 16px, rounded square.
- **Comment text**: Full message, no truncation. Font size 14px. Hinglish renders fine as plain text.
- **Author + time + ad name**: Small grey row below the comment. Ad name is a small `📢` prefixed text in a lighter colour — clickable could filter to that ad.
- **INTENT badge**: Only shown if the comment matches purchase-intent keywords. Amber pill, `🛒 INTENT` label, left of the sentiment badge.
- **Sentiment badge**: Pill with emoji + label. Green `😊 POSITIVE`, red `😠 NEGATIVE`, grey `😐 NEUTRAL`.

---

### Empty/error states

- No Meta token connected → full-width amber warning card with setup instructions
- Facebook comments blocked → inline grey note: "Facebook page comments unavailable — token needs page admin access"
- Loading → skeleton cards (3 placeholder rows, animated shimmer)

---

## 3. Competitor Price Tracker

**Page title**: `🔍 Price Tracker`
**Subtitle**: `Live competitor catalog — price moves, new SKUs, stock changes`

### Top bar
Right-aligned: `+ Add Store` button (opens inline form).

---

### Add store form (inline, appears above the store list when triggered)

Single row:
- Store URL input: placeholder `https://competitor.myshopify.com`
- Display name input: placeholder `Competitor Brand`
- `Add & Scan` button (primary)
- `Cancel` link

---

### Store cards — one card per tracked competitor

Each card is a full-width row with:

```
[Store name]  [URL in grey]               Last scanned: 2h ago   [Scan Now button]  [Remove ✕]
─────────────────────────────────────────────────────────────────────────────────────────────
  42 products   ₹299 – ₹4,999 price range   3 changes since last scan
```

Clicking a store expands a **product table** inline below that store's row:

| Product | Price | Compare-at | In Stock | Change |
|---------|-------|------------|----------|--------|
| Product name | ₹1,299 | ~~₹1,999~~ | ✅ Yes | `↓ ₹200` in green (price drop) |
| Another product | ₹899 | — | ❌ No | `Out of stock` in red |
| New product | ₹2,499 | — | ✅ Yes | `🆕 New` in blue |

Price change badges:
- `↑ ₹X` — red (price went up)
- `↓ ₹X` — green (price dropped, opportunity)
- `🆕 New` — blue pill
- `Out of stock` — red text
- `Back in stock` — green text

Below the table: small grey text "Baseline from first scan on [date]"

---

### Change feed (bottom of page)

A reverse-chronological feed of all changes across all stores:

```
[2h ago]  Competitor A  ↓ Price drop  "Wireless Earbuds Pro" ₹1,999 → ₹1,599
[5h ago]  Competitor B  🆕 New product  "Smart Band Lite" at ₹799
[1d ago]  Competitor A  Out of stock  "Noise Cancelling Headphones"
```

Each row has a left-border colour matching change type (green=drop, red=up/stockout, blue=new).

---

## 4. New Launch Detector

**Page title**: `🚀 New Launch Detector`
**Subtitle**: `Know about competitor launches the day they go live — not weeks later from Instagram`

### Top bar
Right-aligned: date filter tabs — `Last 7 days` · `Last 30 days` · `All time`
`Scan All Stores` button (primary, right-aligned).

---

### Launch feed — sorted newest first

Each launch is a card:

```
🆕  [Competitor name]                                         2 days ago
    [Product title]
    ₹2,499  ·  In Stock  ·  Published 7 Jul 2026
    [View on store →]
```

Left border: blue (new launch).

If no launches since last scan:
```
✅ No new launches detected across 3 competitors in the last 30 days.
   Last scanned: 2 hours ago.
   [Scan Now]
```

---

### Summary strip (above feed)

3 small KPI chips in a row:
- `4 launches` in the selected period
- `2 competitors` had new launches
- `Avg price ₹1,840`

---

### Empty state (no stores added yet)

Full-width card:
```
Add competitor stores in Price Tracker to start detecting new launches.
[Go to Price Tracker →]
```

---

## 5. Stockout Sniper

**Page title**: `🎯 Stockout Sniper`
**Subtitle**: `When a competitor's bestseller runs dry, their demand has nowhere to go — except to you`

### Top bar
`Scan All Stores` button. Tab filter: `Active Opportunities` · `Recovered` · `All`

---

### Active opportunities — cards (2-column grid on desktop)

Each card represents a competitor product currently out of stock:

```
┌─────────────────────────────────────────────────┐
│  [Competitor name]                  🔴 OUT OF STOCK │
│  Wireless Earbuds Pro                               │
│  Was ₹1,999  ·  Window open: 4 days                │
│                                                     │
│  💡 Opportunity: Run ads targeting "wireless        │
│     earbuds pro" searches or their brand name.      │
└─────────────────────────────────────────────────┘
```

Left border: red.
`Window open: X days` — amber badge, gets more intense the longer it's open.

---

### Recovered products section (below active)

Dimmer cards, grey left border:

```
Competitor B · "Smart Band Lite"
Was out of stock for 6 days · Back in stock 2026-07-01 · ₹799
```

---

### Empty state (no stockouts)

```
✅ All competitor products are currently in stock.
   Keep scanning — stockouts happen fast and windows close fast.
   [Scan All →]
```

---

## 6. Event ROI

**Page title**: `🧪 Event ROI`
**Subtitle**: `Did your campaigns actually lift revenue? Each event vs its pre-event baseline`

### Top bar
Right-aligned: `+ Log Event` button (same form as Events & Campaigns page, or links to that page).

---

### Summary strip — 3 KPI chips

- `Best event: Black Friday +204%`
- `Avg lift across all sales: +74%`
- `Campaigns avg: -10%`  ← shown in red if negative

---

### Event ROI table

Full-width table, sorted by start date descending:

| Column | Detail |
|--------|--------|
| Event | Name + type badge |
| Period | "Nov 29 – Dec 2 · 4 days" |
| Status | Upcoming / Ongoing / Ended pill |
| Revenue | ₹1,12,000 — large. Below: "687 orders" in grey |
| Daily Rate | ₹28,000/day |
| Lift | `+204.3%` in large bold green text. Below in grey: "Baseline ₹9,200/day" |
| Goal | "112% of ₹1,00,000" — green progress bar fully filled + small overflow |

Lift column colour rules:
- ≥50% → bright green
- 10–49% → light green
- -10% to +10% → grey (no meaningful lift)
- < -10% → red

Row with `Ongoing` status has a faint green left border + subtle pulse dot next to the status badge.
Row with `Upcoming` has a blue left border, lift shown as `—` (not yet calculable).

---

### By event type — summary row (below table)

Horizontal strip of chips:

```
🏷️ Sale  3 events · avg +87.5% lift · ₹1,99,400 total revenue
📣 Campaign  2 events · avg -10.6% lift · ₹1,23,200 total revenue
```

Chips are colour-coded by average lift (green/red).

---

### Empty state (no events logged)

```
No events logged yet.
Log your first sale or campaign to start measuring real lift.
[+ Log Event]
```

---

## General UI Rules Across All Pages

1. **Loading state**: Skeleton cards with animated shimmer. Match the approximate shape of the real content (e.g., skeleton rows in a table, skeleton KPI cards in a strip).
2. **Error state**: Red-tinted card with `❌` prefix and the raw error message. Never crash the page.
3. **Empty state**: Always a full-width card with a clear message and a call-to-action button.
4. **Refresh button**: Top-right of every page. Clicking re-fetches without a full page reload.
5. **Numbers**: Use Indian number formatting (`en-IN` locale) — ₹1,00,000 not ₹100,000.
6. **Dates**: Relative for recency (`3h ago`, `2 days ago`), absolute for event dates (`7 Jul 2026`).
7. **Badges/pills**: Small, rounded, 9–11px font, uppercase, 0.06em letter spacing. Coloured background at ~8% opacity with matching text colour.
8. **Left border accent**: 3px solid coloured left border on cards to signal status at a glance without reading text. Green = positive/healthy, Red = critical/negative, Amber = warning/intent, Blue = new/upcoming.
9. **Tables**: No zebra striping. Subtle hover row highlight (`rgba(255,255,255,0.03)`). Sticky header on scroll.
10. **Buttons**: Primary = blue filled. Secondary = dark card background with border. Destructive = no fill, red text, only visible on hover.
