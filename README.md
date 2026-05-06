# Regarded Trade Site

Single-page volatile-asset dashboard. Fetches **real** daily price data from
Yahoo Finance (proxied through public CORS proxies), then computes everything
on the client:

- Live price + intraday change vs. previous close
- 30-day annualized realized volatility
- Recent drawdown and 5/20-session momentum
- Composite 0–100 risk score (vol + leverage + price tier + drawdown)
- Heuristic momentum signal (Bullish / Bearish / Neutral) with confidence
- Squeeze proxy from volume surge × short-term price acceleration
- Auto-detected market events (vol spikes, drawdowns, volume surges)
- Replayed signal-vs-outcome log graded mechanically against today's price
- Quant Lab backtest for trend, momentum, mean-reversion, and SPY benchmark rules
- Per-asset RSI backtest (4 rule variants per symbol) with the best historical
  rule wired into a selectable RSI signal mode for live predictions

## Run

The app calls Yahoo Finance through a CORS proxy. Public CORS proxies block
`file://` origins, so serve the folder over a localhost server:

```sh
cd degen_stocks
python3 -m http.server 5173
# open http://localhost:5173
```

Refreshes automatically every 60 seconds; click the refresh button to force one.

## Data

- Source: `query1.finance.yahoo.com/v8/finance/chart` (6 months, daily candles)
- Proxies tried in order: `corsproxy.io`, `api.allorigins.win`, `api.codetabs.com`
- All scoring is computed client-side from the returned closes/volumes

Quotes are delayed by Yahoo's normal feed delay. Nothing in this app is
investment advice.

## Quant Backtest

Run the backtest script to refresh the Quant Lab data:

```sh
python3 quant_backtest.py
```

The script downloads adjusted daily ETF prices from Yahoo Finance, caches them
in `data/`, and writes `data/quant_results.json` plus
`data/quant_equity_curves.csv`.

It also runs a long-only RSI backtest on the volatile-asset universe (TQQQ,
SQQQ, SOXL, SPXL, LABU, UVXY, GME, AMC, CVNA, PLTR, COIN, MARA, SAVA) and
writes `data/rsi_backtest.json`. Four rules are tested per symbol:

- **RSI(14) Mean Reversion** — buy < 30, exit > 55
- **RSI(14) Aggressive Reversion** — buy < 20, exit > 65
- **RSI(2) Oversold (Connors)** — buy < 10, exit > 70
- **RSI(14) Trend Follow** — long while RSI > 50

Each asset's best rule (by Sharpe) is loaded by the dashboard. Choose
**Signal mode → RSI** in the filter row to drive live predictions from the
asset's historically best RSI rule, or **Combined** to require both the
momentum and RSI signals to agree.
