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
END = date(2026, 5, 5)
DATA_DIR = "data"
RESULTS_PATH = os.path.join(DATA_DIR, "quant_results.json")
EQUITY_PATH = os.path.join(DATA_DIR, "quant_equity_curves.csv")

RISK_ASSETS = ["SPY", "QQQ", "IWM", "EFA", "EEM", "TLT", "GLD", "DBC", "VNQ"]
SAFE_ASSET = "SHY"
ALL_SYMBOLS = sorted(set(RISK_ASSETS + [SAFE_ASSET]))
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


def rsi(values, window=2):
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
    years = len(daily_returns) / TRADING_DAYS
    total_return = equity[-1] - 1
    cagr = equity[-1] ** (1 / years) - 1
    vol = statistics.pstdev(daily_returns) * math.sqrt(TRADING_DAYS)
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
    common_dates = sorted(set.intersection(*(set(series.keys()) for series in prices.values())))
    common_dates = [day for day in common_dates if day >= "2010-01-01"]
    price = {sym: [prices[sym][day] for day in common_dates] for sym in ALL_SYMBOLS}

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

        signal_rsi = rsi(price["SPY"][:i], 2)
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


if __name__ == "__main__":
    main()
