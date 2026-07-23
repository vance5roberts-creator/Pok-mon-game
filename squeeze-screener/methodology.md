# Short Squeeze / Catalyst Screener — Methodology

Use this file as a standing prompt. Paste it (or say "run the squeeze screen")
into a Claude chat with web search enabled, and it will source candidates and
score them using the model below.

## 1. Build the candidate list

Search for current squeeze-shaped names using queries like:
- "unusual options activity today"
- "most shorted stocks short interest [current month/year]"
- "short squeeze candidates [current month/year]"
- "[specific sector] high short interest"

Keep candidates that are optionable, have a market cap above ~$300M (avoid
illiquid micro-caps where data is unreliable), and show short interest
elevated versus their sector peers.

## 2. Score each candidate on three factors (equal weight, 1/3 each)

### Fuel score (short-interest mechanics)
- **Short interest % of float** — from Fintel, MarketBeat, Nasdaq/FINRA short
  interest reports, ChartExchange, or Benzinga's short interest pages.
- **Days to cover** — shares short ÷ average daily volume.

`fuel = 0.6 * min(100, (SI% / 50) * 100) + 0.4 * min(100, (DTC / 10) * 100)`

### Catalyst score (why now)
Confirmed, dated triggers only — not vibes:
- Earnings date within ~2 weeks
- M&A, contract win, FDA/trial readout, guidance change, financing event
- Price move on volume ≥ 2x the 30-day average (confirms the catalyst is live,
  not just scheduled)

Score 0–100 qualitatively based on how concrete and imminent the trigger is.

### Options Flow score (delayed 1–2 days is fine)
Pull from Benzinga's Unusual Options Activity calendar, Barchart's Unusual
Options Activity / Volume Change pages, or OptionStrat Flow:
- **Call/Put volume ratio** — bullish skew vs. baseline of 1.0
- **Volume ÷ Open Interest ratio** — high ratio signals fresh positioning,
  not stale contracts

`opt_flow = 0.5 * min(100, ((C/P - 1)/2)*100) + 0.5 * min(100, ((Vol/OI - 1)/2)*100)`

## 3. Composite and rating

`composite = (fuel + catalyst + opt_flow) / 3`

- **Hot**: composite ≥ 70
- **Warm**: 50–69
- **Cold**: < 50

## 4. Output format

A table ranked by composite, descending:

| Symbol | Price | SI% Float | DTC | Fuel | Catalyst (note) | Opt Flow | Composite | Rating |

Flag any input that's stale (short interest updates only twice monthly via
FINRA) or unverified, rather than presenting it as current.

## Notes
- No live/real-time data feed is available — this is a daily/EOD screen, not
  an intraday one, and that's by design (per Vance).
- If options flow data can't be found for a smaller name, note the gap rather
  than guessing at a ratio.
