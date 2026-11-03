#!/usr/bin/env python3
"""Rebuild data/watchlist.json for the Catalyst Flow site's Substack watchlist chart.

Pulls free, keyless daily closing prices from Stooq for every ticker below plus
SPY, computes each one's percent return since the day it was first posted on
Substack, and writes the result as JSON for the website to fetch.

To add a new call: add one entry to WATCHLIST with the ticker, the date
(YYYY-MM-DD) it was posted, and a one-sentence "about" line on what the
business is exposed to sector-wise. Everything else updates automatically
the next time this script runs.
"""
import datetime
import json
import os
import urllib.error
import urllib.request

# Ticker -> { start: day first posted on Substack, about: one-sentence sector/fundamental exposure }.
WATCHLIST = {
    "ALNT": {
        "start": "2026-08-21",
        "about": "Allient Inc. makes precision motion-control components (motors, servo drives, encoders) for industrial, vehicle, aerospace/defense, and medical equipment.",
    },
    "INOD": {
        "start": "2026-08-28",
        "about": "Innodata is a data-engineering company that prepares, annotates, and curates training data enterprises and big tech use to build and deploy AI models.",
    },
    "NXT": {
        "start": "2026-09-02",
        "about": "Nextracker (rebranding as Nextpower) makes solar tracker hardware and control software for utility-scale solar power plants.",
    },
    "CW": {
        "start": "2026-09-15",
        "about": "Curtiss-Wright is an aerospace & defense engineered-products maker: actuation and sensor systems, defense electronics, and naval propulsion/power equipment.",
    },
    "RRX": {
        "start": "2026-09-23",
        "about": "Regal Rexnord makes industrial motion and power equipment — electric motors, power transmission components, and automation/control products.",
    },
    "POWL": {
        "start": "2026-10-06",
        "about": "Powell Industries builds custom electrical switchgear and power-distribution equipment for oil & gas, utilities, and heavy industry.",
    },
}
BENCHMARK = "SPY"
BENCHMARK_START = min(v["start"] for v in WATCHLIST.values())
BENCHMARK_ABOUT = "Tracks the S&P 500 — broad exposure across all major U.S. sectors, used here as the benchmark."
BLENDED_ABOUT = "Simple average of the active ticker calls above — not sector-specific, it's the combined performance of this watchlist."

COLORS = {
    "ALNT": "#f5c842",
    "INOD": "#1baf7a",
    "NXT": "#ff5c1a",
    "CW": "#3aa0ff",
    "RRX": "#c65bd6",
    "POWL": "#ff6b9d",
    "SPY": "#a89578",
    "Blended": "#c8f230",
}

OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "watchlist.json")


def fetch_closes(symbol, start_date):
    """Return {date_str: close_float} for a US ticker from Stooq, from start_date to today."""
    url = (
        "https://stooq.com/q/d/l/?s="
        + symbol.lower()
        + ".us&d1="
        + start_date.replace("-", "")
        + "&i=d"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "catalyst-flow-watchlist-bot/1.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        text = resp.read().decode("utf-8")

    lines = text.strip().splitlines()
    if not lines or not lines[0].lower().startswith("date"):
        raise RuntimeError(f"Unexpected response for {symbol}: {text[:150]!r}")

    closes = {}
    for line in lines[1:]:
        parts = line.split(",")
        if len(parts) < 5:
            continue
        date, close = parts[0], parts[4]
        try:
            closes[date] = float(close)
        except ValueError:
            continue
    if not closes:
        raise RuntimeError(f"No price rows returned for {symbol} (start {start_date})")
    return closes


def build_series(raw_closes, start_date, all_dates):
    """Return (percent-return list aligned to all_dates, the actual base date used)."""
    dates_sorted = sorted(raw_closes.keys())
    base_date = next((d for d in dates_sorted if d >= start_date), None)
    base_price = raw_closes.get(base_date) if base_date else None

    points = []
    for d in all_dates:
        if base_price is None or base_date is None or d < base_date or d not in raw_closes:
            points.append(None)
        else:
            points.append(round((raw_closes[d] / base_price - 1) * 100, 2))
    return points, base_date


def main():
    symbols = [(t, v["start"]) for t, v in WATCHLIST.items()] + [(BENCHMARK, BENCHMARK_START)]

    raw = {}
    errors = []
    for sym, start in symbols:
        try:
            raw[sym] = fetch_closes(sym, start)
        except (urllib.error.URLError, RuntimeError) as exc:
            errors.append(f"{sym}: {exc}")

    if BENCHMARK not in raw:
        raise SystemExit("Could not fetch SPY data; aborting so the site keeps its last good data.\n" + "\n".join(errors))

    all_dates = sorted(set().union(*[set(c.keys()) for c in raw.values()]))

    series_values = {}
    since_dates = {}
    for sym, start in symbols:
        if sym not in raw:
            continue
        points, base_date = build_series(raw[sym], start, all_dates)
        series_values[sym] = points
        since_dates[sym] = base_date

    tickers = [t for t in WATCHLIST if t in series_values]

    blended = []
    for i in range(len(all_dates)):
        vals = [series_values[t][i] for t in tickers if series_values[t][i] is not None]
        blended.append(round(sum(vals) / len(vals), 2) if vals else None)

    labels = [
        str(datetime.date.fromisoformat(d).month) + "/" + str(datetime.date.fromisoformat(d).day)
        for d in all_dates
    ]

    out = {
        "updated": datetime.date.today().isoformat(),
        "dates": all_dates,
        "labels": labels,
        "colors": COLORS,
        "tickers": tickers,
        "series": {t: series_values[t] for t in tickers},
        "since": {t: since_dates[t] for t in tickers},
        "about": {t: WATCHLIST[t]["about"] for t in tickers},
        "spy": series_values.get(BENCHMARK, []),
        "spySince": since_dates.get(BENCHMARK),
        "spyAbout": BENCHMARK_ABOUT,
        "blended": blended,
        "blendedAbout": BLENDED_ABOUT,
    }
    if errors:
        out["errors"] = errors

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w") as f:
        json.dump(out, f, indent=2)

    print(f"Wrote {OUT_PATH}: {len(all_dates)} trading days through {all_dates[-1] if all_dates else 'n/a'}")
    if errors:
        print("Warnings (kept last-known data for these):")
        for e in errors:
            print(" -", e)


if __name__ == "__main__":
    main()
