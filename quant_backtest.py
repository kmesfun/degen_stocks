#!/usr/bin/env python3
import csv
import json
import math
import os
import statistics
import time
import urllib.request
from datetime import date, datetime, timezone


START = date(2010, 1, 1)
END = date(2026, 5, 6)
DATA_DIR = "data"
RESULTS_PATH = os.path.join(DATA_DIR, "quant_results.json")
EQUITY_PATH = os.path.join(DATA_DIR, "quant_equity_curves.csv")
RSI_PATH = os.path.join(DATA_DIR, "rsi_backtest.json")

RISK_ASSETS = ["SPY", "QQQ", "IWM", "EFA", "EEM", "TLT", "GLD", "DBC", "VNQ"]
SAFE_ASSET = "SHY"

# Volatile asset universe shown on the dashboard. RSI backtest runs on each.
UNIVERSE = [
    "TQQQ", "SQQQ", "SOXL", "SPXL", "LABU", "UVXY",
    "GME", "AMC", "CVNA", "PLTR", "COIN", "MARA", "SAVA",
]

ALL_SYMBOLS = sorted(set(RISK_ASSETS + [SAFE_ASSET] + UNIVERSE))
TRADING_DAYS = 252
FEE = 0.0005


def timestamp(day):
    return int(datetime(day.year, day.month, day.day, tzinfo=timezone.utc).timestamp())


def fetch_prices(symbol):
    cache_path = os.path.join(DATA_DIR, f"{symbol}.json")
    if os.path.exists(cache_path):
        with open(cache_path, "r", encoding="utf-8") as handle:
            return json.load(handle)

    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
        f"?period1={timestamp(START)}&period2={timestamp(END)}"
        "&interval=1d&events=history&includeAdjustedClose=true"
    )
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.loads(response.read())

    result = payload["chart"]["result"][0]
    stamps = result["timestamp"]
    closes = result["indicators"]["adjclose"][0]["adjclose"]
    series = {}
    for stamp, close in zip(stamps, closes):
        if close is None:
            continue
        day = datetime.fromtimestamp(stamp, timezone.utc).date().isoformat()
        series[day] = round(float(close), 8)

    with open(cache_path, "w", encoding="utf-8") as handle:
        json.dump(series, handle, indent=2, sort_keys=True)
    time.sleep(0.15)
    return series


def pct_change(values, lookback):
    if len(values) <= lookback or values[-lookback - 1] <= 0:
        return None
    return values[-1] / values[-lookback - 1] - 1


def sma(values, window):
    if len(values) < window:
        return None
    return sum(values[-window:]) / window


def rsi_simple(values, window=2):
    """Average-gain/loss RSI over the last `window` bars (Connors style)."""
    if len(values) <= window:
        return None
    gains = []
    losses = []
    for idx in range(-window, 0):
        change = values[idx] - values[idx - 1]
        gains.append(max(change, 0))
        losses.append(abs(min(change, 0)))
    avg_gain = sum(gains) / window
    avg_loss = sum(losses) / window
    if avg_loss == 0:
        return 100
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def rsi_series(closes, window=14):
    """Wilder-smoothed RSI over the full series. Returns a list aligned with `closes`,
    with None for indices where RSI is not yet defined."""
    n = len(closes)
    out = [None] * n
    if n <= window:
        return out
    gains = 0.0
    losses = 0.0
    for i in range(1, window + 1):
        delta = closes[i] - closes[i - 1]
        if delta >= 0:
            gains += delta
        else:
            losses += -delta
    avg_gain = gains / window
    avg_loss = losses / window
    out[window] = 100.0 if avg_loss == 0 else 100 - (100 / (1 + avg_gain / avg_loss))
    for i in range(window + 1, n):
        delta = closes[i] - closes[i - 1]
        gain = max(delta, 0.0)
        loss = max(-delta, 0.0)
        avg_gain = (avg_gain * (window - 1) + gain) / window
        avg_loss = (avg_loss * (window - 1) + loss) / window
        out[i] = 100.0 if avg_loss == 0 else 100 - (100 / (1 + avg_gain / avg_loss))
    return out


def max_drawdown(equity):
    peak = equity[0]
    worst = 0
    for value in equity:
        peak = max(peak, value)
        worst = min(worst, value / peak - 1)
    return worst


def monthly_win_rate(dates, equity):
    months = {}
    for day, value in zip(dates, equity):
        months.setdefault(day[:7], [value, value])
        months[day[:7]][1] = value
    returns = [last / first - 1 for first, last in months.values() if first > 0]
    if not returns:
        return 0
    return sum(1 for item in returns if item > 0) / len(returns)


def metrics(name, description, dates, equity, daily_returns, avg_exposure):
    years = max(len(daily_returns) / TRADING_DAYS, 1e-9)
    total_return = equity[-1] - 1
    cagr = equity[-1] ** (1 / years) - 1 if equity[-1] > 0 else -1
    vol = statistics.pstdev(daily_returns) * math.sqrt(TRADING_DAYS) if len(daily_returns) > 1 else 0
    sharpe = cagr / vol if vol else 0
    return {
        "name": name,
        "description": description,
        "totalReturn": total_return,
        "cagr": cagr,
        "volatility": vol,
        "sharpe": sharpe,
        "maxDrawdown": max_drawdown(equity),
        "monthlyWinRate": monthly_win_rate(dates, equity),
        "finalEquity": equity[-1],
        "avgExposure": avg_exposure,
    }


def turnover_cost(old_weights, new_weights):
    symbols = set(old_weights) | set(new_weights)
    turnover = sum(abs(new_weights.get(sym, 0) - old_weights.get(sym, 0)) for sym in symbols)
    return turnover * FEE


def run_backtest(prices):
    common_dates = sorted(set.intersection(*(set(prices[sym].keys()) for sym in RISK_ASSETS + [SAFE_ASSET])))
    common_dates = [day for day in common_dates if day >= "2010-01-01"]
    price = {sym: [prices[sym][day] for day in common_dates] for sym in RISK_ASSETS + [SAFE_ASSET]}

    strategies = {
        "buyHoldSpy": {
            "name": "Buy & Hold SPY",
            "description": "Always long SPY as a passive market benchmark.",
            "weights": [],
        },
        "smaTiming": {
            "name": "SPY 200D Trend Timing",
            "description": "Long SPY only when SPY closes above its 200-day average; otherwise in SHY.",
            "weights": [],
        },
        "timeSeriesMomentum": {
            "name": "12M Time-Series Momentum Basket",
            "description": "Monthly equal-weight basket of assets with positive 12-month momentum; idle capital goes to SHY.",
            "weights": [],
        },
        "dualMomentum": {
            "name": "Dual Momentum Top-3",
            "description": "Monthly rotation into the top three 12-month momentum assets only if each is above its 200-day average; otherwise SHY.",
            "weights": [],
        },
        "meanReversion": {
            "name": "SPY 2-Day RSI Mean Reversion",
            "description": "Long SPY after very short-term oversold readings, exit to SHY after rebound.",
            "weights": [],
        },
    }

    current = {key: {} for key in strategies}
    mr_long = False
    last_month = None

    for i, day in enumerate(common_dates):
        if i < 253:
            for item in strategies.values():
                item["weights"].append({})
            continue

        month = day[:7]
        if month != last_month:
            last_month = month
            current["buyHoldSpy"] = {"SPY": 1.0}

            spy_sma = sma(price["SPY"][:i], 200)
            current["smaTiming"] = {"SPY": 1.0} if price["SPY"][i - 1] > spy_sma else {"SHY": 1.0}

            positive = []
            ranked = []
            for sym in RISK_ASSETS:
                momentum = pct_change(price[sym][:i], 252)
                avg_200 = sma(price[sym][:i], 200)
                if momentum is None or avg_200 is None:
                    continue
                ranked.append((momentum, sym, avg_200))
                if momentum > 0:
                    positive.append(sym)

            if positive:
                weight = 1 / len(positive)
                current["timeSeriesMomentum"] = {sym: weight for sym in positive}
            else:
                current["timeSeriesMomentum"] = {"SHY": 1.0}

            selected = [sym for momentum, sym, avg_200 in sorted(ranked, reverse=True) if momentum > 0 and price[sym][i - 1] > avg_200][:3]
            if selected:
                weight = 1 / len(selected)
                current["dualMomentum"] = {sym: weight for sym in selected}
            else:
                current["dualMomentum"] = {"SHY": 1.0}

        signal_rsi = rsi_simple(price["SPY"][:i], 2)
        if signal_rsi is not None and signal_rsi < 10:
            mr_long = True
        elif signal_rsi is not None and signal_rsi > 70:
            mr_long = False
        current["meanReversion"] = {"SPY": 1.0} if mr_long else {"SHY": 1.0}

        for key, item in strategies.items():
            item["weights"].append(dict(current[key]))

    results = []
    curves = {}
    active_dates = common_dates[253:]
    for key, item in strategies.items():
        equity = [1.0]
        returns = []
        old_weights = {}
        exposure = []
        for i in range(253, len(common_dates)):
            weights = item["weights"][i - 1]
            day_return = 0
            for sym, weight in weights.items():
                asset_return = price[sym][i] / price[sym][i - 1] - 1
                day_return += weight * asset_return
            cost = turnover_cost(old_weights, weights) if i == 253 or weights != old_weights else 0
            day_return -= cost
            returns.append(day_return)
            equity.append(equity[-1] * (1 + day_return))
            exposure.append(1 - weights.get("SHY", 0))
            old_weights = weights
        curves[key] = equity[1:]
        results.append(metrics(item["name"], item["description"], active_dates, equity[1:], returns, sum(exposure) / len(exposure)))

    results.sort(key=lambda item: (item["sharpe"], item["cagr"]), reverse=True)
    return common_dates, active_dates, results, curves


# ---------- per-asset RSI backtest ----------

RSI_RULES = [
    {
        "id": "rsi14_meanrev",
        "name": "RSI(14) Mean Reversion",
        "description": "Buy when RSI(14) crosses below 30; exit when RSI(14) crosses above 55.",
        "window": 14,
        "entry": 30,
        "exit": 55,
        "direction": "long",
    },
    {
        "id": "rsi14_aggressive",
        "name": "RSI(14) Aggressive Reversion",
        "description": "Buy when RSI(14) crosses below 20; exit when RSI(14) crosses above 65.",
        "window": 14,
        "entry": 20,
        "exit": 65,
        "direction": "long",
    },
    {
        "id": "rsi2_oversold",
        "name": "RSI(2) Oversold (Connors)",
        "description": "Buy when RSI(2) < 10; exit when RSI(2) > 70.",
        "window": 2,
        "entry": 10,
        "exit": 70,
        "direction": "long",
    },
    {
        "id": "rsi14_trend",
        "name": "RSI(14) Trend Follow",
        "description": "Long whenever RSI(14) > 50; in cash otherwise.",
        "window": 14,
        "trend_threshold": 50,
        "direction": "trend",
    },
]


def backtest_rsi_rule(closes, dates, rule):
    """Long-only RSI backtest. Returns (metrics dict, equity list)."""
    n = len(closes)
    if n < rule["window"] + 5:
        return None, None
    rsi_vals = rsi_series(closes, rule["window"])

    in_pos = False
    entry_price = 0.0
    entry_idx = 0
    equity = [1.0]
    returns = []
    trades = []
    exposure = 0
    for i in range(1, n):
        # Daily return on the position held the prior day
        if in_pos:
            r = closes[i] / closes[i - 1] - 1
        else:
            r = 0.0
        returns.append(r)
        equity.append(equity[-1] * (1 + r))
        exposure += 1 if in_pos else 0

        # Decide next-day position from yesterday's RSI (no look-ahead)
        rsi_now = rsi_vals[i]
        if rsi_now is None:
            continue
        if rule["direction"] == "long":
            if not in_pos and rsi_now < rule["entry"]:
                in_pos = True
                entry_price = closes[i]
                entry_idx = i
                # entry cost
                equity[-1] *= (1 - FEE)
            elif in_pos and rsi_now > rule["exit"]:
                in_pos = False
                trade_return = closes[i] / entry_price - 1 - FEE
                trades.append({"return": trade_return, "days": i - entry_idx})
        elif rule["direction"] == "trend":
            target = rsi_now > rule["trend_threshold"]
            if target != in_pos:
                if not in_pos:
                    in_pos = True
                    entry_price = closes[i]
                    entry_idx = i
                    equity[-1] *= (1 - FEE)
                else:
                    in_pos = False
                    trade_return = closes[i] / entry_price - 1 - FEE
                    trades.append({"return": trade_return, "days": i - entry_idx})
    if in_pos:
        # Close any open position at the final bar for clean accounting
        trade_return = closes[-1] / entry_price - 1 - FEE
        trades.append({"return": trade_return, "days": (n - 1) - entry_idx})

    years = max(len(returns) / TRADING_DAYS, 1e-9)
    total_return = equity[-1] - 1
    cagr = equity[-1] ** (1 / years) - 1 if equity[-1] > 0 else -1
    vol = statistics.pstdev(returns) * math.sqrt(TRADING_DAYS) if len(returns) > 1 else 0
    sharpe = cagr / vol if vol else 0
    win_rate = (sum(1 for t in trades if t["return"] > 0) / len(trades)) if trades else 0
    avg_trade = (sum(t["return"] for t in trades) / len(trades)) if trades else 0
    avg_hold = (sum(t["days"] for t in trades) / len(trades)) if trades else 0
    return {
        "ruleId": rule["id"],
        "name": rule["name"],
        "description": rule["description"],
        "totalReturn": total_return,
        "cagr": cagr,
        "volatility": vol,
        "sharpe": sharpe,
        "maxDrawdown": max_drawdown(equity),
        "winRate": win_rate,
        "tradeCount": len(trades),
        "avgTradeReturn": avg_trade,
        "avgHoldDays": avg_hold,
        "exposure": (exposure / (n - 1)) if n > 1 else 0,
    }, equity


def buy_hold_metrics(closes, dates):
    n = len(closes)
    if n < 2:
        return None
    returns = [closes[i] / closes[i - 1] - 1 for i in range(1, n)]
    equity = [1.0]
    for r in returns:
        equity.append(equity[-1] * (1 + r))
    years = max(len(returns) / TRADING_DAYS, 1e-9)
    vol = statistics.pstdev(returns) * math.sqrt(TRADING_DAYS) if len(returns) > 1 else 0
    cagr = equity[-1] ** (1 / years) - 1 if equity[-1] > 0 else -1
    return {
        "totalReturn": equity[-1] - 1,
        "cagr": cagr,
        "volatility": vol,
        "sharpe": cagr / vol if vol else 0,
        "maxDrawdown": max_drawdown(equity),
    }


def run_rsi_backtest(prices):
    per_asset = {}
    for symbol in UNIVERSE:
        series = prices.get(symbol)
        if not series:
            continue
        dates = sorted(series.keys())
        closes = [series[d] for d in dates]
        if len(closes) < 50:
            continue
        bh = buy_hold_metrics(closes, dates)
        rule_results = []
        for rule in RSI_RULES:
            metrics_out, _ = backtest_rsi_rule(closes, dates, rule)
            if metrics_out:
                rule_results.append(metrics_out)
        # Best rule by Sharpe, with a small tie-breaker on CAGR
        best = max(rule_results, key=lambda r: (r["sharpe"], r["cagr"])) if rule_results else None
        per_asset[symbol] = {
            "startDate": dates[0],
            "endDate": dates[-1],
            "samples": len(closes),
            "buyHold": bh,
            "rules": rule_results,
            "bestRuleId": best["ruleId"] if best else None,
        }
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "rules": [
            {"id": r["id"], "name": r["name"], "description": r["description"]}
            for r in RSI_RULES
        ],
        "perAsset": per_asset,
    }


def save_outputs(active_dates, results, curves):
    os.makedirs(DATA_DIR, exist_ok=True)
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "period": {"start": active_dates[0], "end": active_dates[-1]},
        "universe": RISK_ASSETS,
        "safeAsset": SAFE_ASSET,
        "assumptions": {
            "data": "Yahoo Finance adjusted close via chart endpoint",
            "rebalance": "Monthly for trend/momentum rules; daily state update for RSI rule",
            "transactionCostBps": FEE * 10000,
            "lookahead": "Signals use data available before the return day",
        },
        "results": results,
        "best": results[0],
    }
    with open(RESULTS_PATH, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)

    with open(EQUITY_PATH, "w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        keys = list(curves.keys())
        writer.writerow(["date"] + keys)
        for idx, day in enumerate(active_dates):
            writer.writerow([day] + [round(curves[key][idx], 6) for key in keys])
    return payload


def save_rsi_outputs(rsi_payload):
    with open(RSI_PATH, "w", encoding="utf-8") as handle:
        json.dump(rsi_payload, handle, indent=2)


def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    prices = {symbol: fetch_prices(symbol) for symbol in ALL_SYMBOLS}

    _, active_dates, results, curves = run_backtest(prices)
    payload = save_outputs(active_dates, results, curves)

    print(f"Backtest period: {payload['period']['start']} to {payload['period']['end']}")
    print(f"Best strategy: {payload['best']['name']}")
    for item in payload["results"]:
        print(
            f"{item['name']}: CAGR {item['cagr']:.2%}, Sharpe {item['sharpe']:.2f}, "
            f"MaxDD {item['maxDrawdown']:.2%}, Total {item['totalReturn']:.2%}"
        )

    rsi_payload = run_rsi_backtest(prices)
    save_rsi_outputs(rsi_payload)
    print()
    print(f"RSI backtest covers {len(rsi_payload['perAsset'])} symbols")
    for symbol, data in rsi_payload["perAsset"].items():
        best_id = data["bestRuleId"]
        best = next((r for r in data["rules"] if r["ruleId"] == best_id), None)
        if best:
            print(
                f"  {symbol:5s} best={best['name']:32s} "
                f"CAGR {best['cagr']:7.2%} Sharpe {best['sharpe']:5.2f} "
                f"WinRate {best['winRate']:5.1%} Trades {best['tradeCount']:3d} "
                f"vs buy&hold CAGR {data['buyHold']['cagr']:7.2%}"
            )


if __name__ == "__main__":
    main()
