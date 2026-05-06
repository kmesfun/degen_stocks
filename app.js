// Regarded Trade Site — live volatile-asset intelligence
// Data: Yahoo Finance v8 chart endpoint, fetched via public CORS proxies.
// All risk, signal, and event scoring is computed from the real price history
// returned by Yahoo. Nothing on this dashboard is investment advice.

const UNIVERSE = [
  { symbol: "TQQQ", name: "ProShares UltraPro QQQ",                 category: "3x Leveraged ETF",     leverage: 3 },
  { symbol: "SQQQ", name: "ProShares UltraPro Short QQQ",           category: "3x Leveraged ETF",     leverage: 3 },
  { symbol: "SOXL", name: "Direxion Daily Semiconductor Bull 3x",   category: "3x Leveraged ETF",     leverage: 3 },
  { symbol: "SPXL", name: "Direxion Daily S&P 500 Bull 3x",         category: "3x Leveraged ETF",     leverage: 3 },
  { symbol: "LABU", name: "Direxion Daily S&P Biotech Bull 3x",     category: "3x Leveraged ETF",     leverage: 3 },
  { symbol: "UVXY", name: "ProShares Ultra VIX Short-Term Futures", category: "Volatile ETF",         leverage: 1.5 },
  { symbol: "GME",  name: "GameStop Corp.",                         category: "Active Squeeze",       leverage: 1 },
  { symbol: "AMC",  name: "AMC Entertainment Holdings",             category: "Active Squeeze",       leverage: 1 },
  { symbol: "CVNA", name: "Carvana Co.",                            category: "Squeeze Candidate",    leverage: 1 },
  { symbol: "PLTR", name: "Palantir Technologies",                  category: "High-Volatility Stock", leverage: 1 },
  { symbol: "COIN", name: "Coinbase Global",                        category: "High-Volatility Stock", leverage: 1 },
  { symbol: "MARA", name: "Marathon Digital Holdings",              category: "High-Volatility Stock", leverage: 1 },
  { symbol: "SAVA", name: "Cassava Sciences",                       category: "High-Volatility Stock", leverage: 1 },
];

const PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`,
];

const REFRESH_MS = 60_000;
const HISTORY_RANGE = "6mo";
const HISTORY_INTERVAL = "1d";

// Anchored, category-level event windows. Verify exact dates with your broker.
const EVENT_CALENDAR = [
  { date: "Next FOMC week",       title: "Fed policy decision window",       type: "Macro",          affects: "TQQQ, SQQQ, SPXL, UVXY" },
  { date: "Mid-month",            title: "FINRA short interest report",      type: "Short Interest", affects: "GME, AMC, CVNA" },
  { date: "Quarterly",            title: "Earnings season — high-beta names", type: "Earnings",       affects: "PLTR, COIN, CVNA, MARA" },
  { date: "Monthly",              title: "CPI / PPI release",                type: "Macro",          affects: "3x ETFs, Volatility ETFs" },
  { date: "3rd Friday monthly",   title: "Monthly options expiration",       type: "Options",        affects: "Squeeze basket" },
];

const QUANT_BACKTEST = {
  generatedAt: "2026-05-05T22:47:16.224511+00:00",
  period: { start: "2011-01-04", end: "2026-05-04" },
  assumptions: {
    data: "Yahoo Finance adjusted close via chart endpoint",
    transactionCostBps: 5,
    lookahead: "Signals use data available before the return day",
  },
  results: [
    {
      name: "Buy & Hold SPY",
      description: "Always long SPY as a passive market benchmark.",
      totalReturn: 6.4080476191560125,
      cagr: 0.13986188165688995,
      volatility: 0.1709975079953982,
      sharpe: 0.817917660300955,
      maxDrawdown: -0.33717259887837037,
      monthlyWinRate: 0.6810810810810811,
      avgExposure: 1,
    },
    {
      name: "SPY 200D Trend Timing",
      description: "Long SPY only when SPY closes above its 200-day average; otherwise in SHY.",
      totalReturn: 2.474763575784947,
      cagr: 0.08482602364961633,
      volatility: 0.12709850681977916,
      sharpe: 0.6674037781568622,
      maxDrawdown: -0.29162797045999034,
      monthlyWinRate: 0.6864864864864865,
      avgExposure: 0.8425421530479896,
    },
    {
      name: "12M Time-Series Momentum Basket",
      description: "Monthly equal-weight basket of assets with positive 12-month momentum; idle capital goes to SHY.",
      totalReturn: 2.1540479114001334,
      cagr: 0.07798035197153252,
      volatility: 0.13293639055230436,
      sharpe: 0.5865989865344722,
      maxDrawdown: -0.2871993339819019,
      monthlyWinRate: 0.6108108108108108,
      avgExposure: 0.9945525291828794,
    },
    {
      name: "Dual Momentum Top-3",
      description: "Monthly rotation into the top three 12-month momentum assets only if each is above its 200-day average; otherwise SHY.",
      totalReturn: 2.1887016027834485,
      cagr: 0.07875063154507611,
      volatility: 0.13880101910768555,
      sharpe: 0.5673634966900297,
      maxDrawdown: -0.27739126080307885,
      monthlyWinRate: 0.6,
      avgExposure: 0.9452658884565499,
    },
    {
      name: "SPY 2-Day RSI Mean Reversion",
      description: "Long SPY after very short-term oversold readings, exit to SHY after rebound.",
      totalReturn: 0.5290159643380374,
      cagr: 0.02814637623484728,
      volatility: 0.12365263448704154,
      sharpe: 0.22762455771047033,
      maxDrawdown: -0.37260390215875694,
      monthlyWinRate: 0.5621621621621622,
      avgExposure: 0.34941634241245134,
    },
  ],
};

const state = {
  assets: [],
  selectedSymbol: null,
  watchlist: loadWatchlist(),
  signalMode: loadSignalMode(),       // "momentum" | "rsi" | "combined"
  rsiBacktest: null,                  // loaded from ./data/rsi_backtest.json
  lastUpdated: null,
  loading: true,
  error: null,
};

function loadSignalMode() {
  try {
    const v = localStorage.getItem("rts.signalMode");
    if (v === "rsi" || v === "combined" || v === "momentum") return v;
  } catch {}
  return "momentum";
}

function saveSignalMode() {
  try { localStorage.setItem("rts.signalMode", state.signalMode); } catch {}
}

async function loadRsiBacktest() {
  try {
    const res = await fetch("./data/rsi_backtest.json", { cache: "no-store" });
    if (!res.ok) return;
    state.rsiBacktest = await res.json();
  } catch (err) {
    console.warn("[regarded] rsi_backtest.json not loaded:", err.message);
  }
}

/* ---------- helpers ---------- */

const $ = (sel) => document.querySelector(sel);

function loadWatchlist() {
  try {
    const raw = localStorage.getItem("rts.watchlist");
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set(["TQQQ", "GME", "PLTR"]);
}

function saveWatchlist() {
  try { localStorage.setItem("rts.watchlist", JSON.stringify([...state.watchlist])); } catch {}
}

function fmtCurrency(value) {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1000) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (value >= 100)  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (value >= 1)    return `$${value.toFixed(2)}`;
  return `$${value.toFixed(3)}`;
}

function fmtPct(value, signed = true) {
  if (!Number.isFinite(value)) return "—";
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function tier(score) {
  if (score <= 25) return ["Low Risk",       "tier-low"];
  if (score <= 50) return ["Moderate Risk",  "tier-mid"];
  if (score <= 70) return ["High Risk",      "tier-high"];
  if (score <= 85) return ["Very High Risk", "tier-high"];
  return ["Extreme Risk", "tier-extreme"];
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function logoColor(symbol) {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 55% 38%)`;
}

// Wilder-smoothed RSI. Returns the latest value, or null if insufficient data.
function rsiLatest(closes, window = 14) {
  if (!Array.isArray(closes) || closes.length <= window) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= window; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gains += d; else losses += -d;
  }
  let avgGain = gains / window;
  let avgLoss = losses / window;
  for (let i = window + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    const g = Math.max(d, 0);
    const l = Math.max(-d, 0);
    avgGain = (avgGain * (window - 1) + g) / window;
    avgLoss = (avgLoss * (window - 1) + l) / window;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function rsiZone(rsi) {
  if (!Number.isFinite(rsi)) return ["—", "tier-mid"];
  if (rsi <= 20) return ["Deep oversold", "tier-low"];
  if (rsi <= 30) return ["Oversold", "tier-low"];
  if (rsi >= 80) return ["Deep overbought", "tier-extreme"];
  if (rsi >= 70) return ["Overbought", "tier-high"];
  if (rsi >= 55) return ["Trending up", "tier-low"];
  if (rsi <= 45) return ["Trending down", "tier-high"];
  return ["Neutral", "tier-mid"];
}

// Returns { signal, confidence, target, driver, rule, ruleStats }
function rsiSignal(asset) {
  const closes = asset.series.map((p) => p.c);
  const rsi14 = rsiLatest(closes, 14);
  const rsi2  = rsiLatest(closes, 2);
  const bt = state.rsiBacktest?.perAsset?.[asset.symbol];
  const bestRule = bt && bt.rules.find((r) => r.ruleId === bt.bestRuleId);
  const winRate = bestRule?.winRate ?? 0.5;

  let signal = "Neutral";
  let extremity = 0;
  let usingWindow = "rsi14";
  let liveRsi = rsi14;

  if (bestRule?.ruleId === "rsi2_oversold") {
    usingWindow = "rsi2";
    liveRsi = rsi2;
    if (rsi2 != null && rsi2 < 10)        { signal = "Bullish"; extremity = (10 - rsi2) / 10; }
    else if (rsi2 != null && rsi2 > 70)   { signal = "Bearish"; extremity = (rsi2 - 70) / 30; }
  } else if (bestRule?.ruleId === "rsi14_trend") {
    if (rsi14 != null && rsi14 > 55)      { signal = "Bullish"; extremity = (rsi14 - 50) / 50; }
    else if (rsi14 != null && rsi14 < 45) { signal = "Bearish"; extremity = (50 - rsi14) / 50; }
  } else {
    // Default: RSI(14) mean reversion thresholds
    const entry = bestRule?.ruleId === "rsi14_aggressive" ? 20 : 30;
    const exit  = bestRule?.ruleId === "rsi14_aggressive" ? 65 : 55;
    if (rsi14 != null && rsi14 < entry)      { signal = "Bullish"; extremity = (entry - rsi14) / entry; }
    else if (rsi14 != null && rsi14 > exit)  { signal = "Bearish"; extremity = (rsi14 - exit) / (100 - exit); }
  }

  const confidence = Math.round(clamp(40 + winRate * 50 + extremity * 12, 40, 92));
  const target = asset.price * (1 + (signal === "Bullish" ? 0.04 : signal === "Bearish" ? -0.04 : 0) * (0.5 + extremity));
  const ruleLabel = bestRule?.name || "RSI(14) default";
  const driver = liveRsi != null
    ? `RSI(${usingWindow === "rsi2" ? 2 : 14}) is ${liveRsi.toFixed(1)} — ${rsiZone(liveRsi)[0].toLowerCase()}. Rule: ${ruleLabel}.`
    : "Insufficient history for RSI signal.";

  return { signal, confidence, target, driver, rsi14, rsi2, liveRsi, rule: bestRule, ruleLabel };
}

function combinedSignal(momentum, rsi) {
  if (momentum.signal === rsi.signal && momentum.signal !== "Neutral") {
    return {
      signal: momentum.signal,
      confidence: Math.round(clamp((momentum.confidence + rsi.confidence) / 2 + 5, 40, 95)),
      target: (momentum.target + rsi.target) / 2,
      driver: `Momentum and RSI agree: ${momentum.signal.toLowerCase()}. ${rsi.driver}`,
    };
  }
  return {
    signal: "Neutral",
    confidence: Math.round((momentum.confidence + rsi.confidence) / 2),
    target: rsi.target,
    driver: `Mixed: momentum says ${momentum.signal.toLowerCase()}, RSI says ${rsi.signal.toLowerCase()}.`,
  };
}

function activeSignal(asset) {
  if (state.signalMode === "rsi")      return { ...asset.rsiSignal, mode: "RSI" };
  if (state.signalMode === "combined") return { ...combinedSignal(asset.momentumSignal, asset.rsiSignal), mode: "Combined" };
  return { ...asset.momentumSignal, mode: "Momentum" };
}

/* ---------- data fetching ---------- */

async function fetchOne(symbol) {
  const yahoo = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${HISTORY_RANGE}&interval=${HISTORY_INTERVAL}`;
  let lastErr = null;
  for (const wrap of PROXIES) {
    try {
      const res = await fetch(wrap(yahoo), { cache: "no-store" });
      if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
      const json = await res.json();
      if (json && json.chart && Array.isArray(json.chart.result) && json.chart.result[0]) {
        return json.chart.result[0];
      }
      lastErr = new Error("Malformed response");
    } catch (err) { lastErr = err; }
  }
  throw lastErr || new Error("All proxies failed");
}

async function fetchAll() {
  const settled = await Promise.allSettled(UNIVERSE.map((u) => fetchOne(u.symbol)));
  const ok = [];
  let firstErr = null;
  settled.forEach((s, i) => {
    if (s.status === "fulfilled") {
      ok.push({ ...UNIVERSE[i], raw: s.value });
    } else if (!firstErr) {
      firstErr = s.reason;
    }
  });
  if (!ok.length) throw firstErr || new Error("No data returned");
  return ok;
}

/* ---------- analytics ---------- */

function buildSeries(raw) {
  const ts = raw.timestamp || [];
  const q  = raw.indicators?.quote?.[0] || {};
  const closeRaw = q.close || [];
  const adj = raw.indicators?.adjclose?.[0]?.adjclose;
  const close = (adj && adj.length === closeRaw.length) ? adj : closeRaw;
  const volume = q.volume || [];
  const out = [];
  for (let i = 0; i < ts.length; i++) {
    if (close[i] == null) continue;
    out.push({ t: ts[i] * 1000, c: close[i], v: volume[i] || 0 });
  }
  return out;
}

function computeAnalytics(asset) {
  const series = buildSeries(asset.raw);
  if (series.length < 25) return null;

  const meta = asset.raw.meta || {};
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  const price = meta.regularMarketPrice ?? last.c;
  const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? prev.c;
  const change = ((price - prevClose) / prevClose) * 100;

  const closes = series.map((p) => p.c);
  const volumes = series.map((p) => p.v);

  // Realized volatility, annualized, last 30 sessions
  const window = 30;
  const tail = closes.slice(-window - 1);
  const rets = [];
  for (let i = 1; i < tail.length; i++) rets.push(Math.log(tail[i] / tail[i - 1]));
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
  const dailyVol = Math.sqrt(variance);
  const annVol = dailyVol * Math.sqrt(252) * 100;            // % annualized

  // 30-day max drawdown
  let peak = -Infinity;
  let mdd = 0;
  for (const c of closes.slice(-window)) {
    if (c > peak) peak = c;
    mdd = Math.max(mdd, (peak - c) / peak);
  }
  const drawdownPct = mdd * 100;

  // Volume surge: last 5 avg vs prior 20 avg
  const v5  = avg(volumes.slice(-5));
  const v20 = avg(volumes.slice(-25, -5));
  const volSurge = v20 > 0 ? v5 / v20 : 1;

  // Momentum signal
  const ret5  = closes.length >= 6  ? (closes.at(-1) - closes.at(-6))  / closes.at(-6)  : 0;
  const ret20 = closes.length >= 21 ? (closes.at(-1) - closes.at(-21)) / closes.at(-21) : 0;
  const accel = ret5 - ret20 / 4;
  let momentumSig = "Neutral";
  if (accel >  0.04) momentumSig = "Bullish";
  if (accel < -0.04) momentumSig = "Bearish";
  const momentumConf = Math.round(clamp(40 + Math.abs(accel) * 220, 40, 92));
  const momentumTarget = price * (1 + accel * 0.6);
  const momentumDriver = buildDriver({ signal: momentumSig, accel, annVol, volSurge, ret5, drawdownPct });

  // Risk composite
  const volScore   = clamp(annVol * 0.6, 0, 60);              // vol 100% -> 60
  const levBonus   = asset.leverage >= 3 ? 22 : asset.leverage >= 2 ? 14 : asset.leverage > 1 ? 8 : 0;
  const pennyBonus = price < 5 ? 14 : price < 10 ? 6 : 0;
  const ddBonus    = clamp(drawdownPct * 0.4, 0, 16);
  const risk = Math.round(clamp(volScore + levBonus + pennyBonus + ddBonus, 0, 100));

  // Squeeze proxy: volume surge + 5-day move + risk
  const squeezeRaw =
    clamp((volSurge - 1) * 35, 0, 50) +
    clamp(Math.abs(ret5) * 200, 0, 35) +
    clamp(risk * 0.15, 0, 15);
  const squeeze = Math.round(clamp(squeezeRaw, 0, 100));

  const factors = [
    ["30-day realized volatility", Math.round(clamp(annVol, 0, 200) / 2)],
    ["Leverage exposure",          asset.leverage >= 3 ? 95 : asset.leverage >= 2 ? 70 : asset.leverage > 1 ? 50 : 25],
    [price < 5 ? "Sub-$5 price level" : "30-day drawdown", price < 5 ? 88 : Math.round(clamp(drawdownPct * 2, 0, 100))],
  ];

  const partial = {
    symbol: asset.symbol, price, change, prevClose,
    annVol, drawdownPct, volSurge, ret5, ret20, accel,
    risk, squeeze, factors, series,
    name: meta.longName || meta.shortName || asset.name,
  };

  // Momentum and RSI signals are kept side-by-side. activeSignal() picks one
  // based on the current state.signalMode.
  partial.momentumSignal = {
    signal: momentumSig, confidence: momentumConf, target: momentumTarget, driver: momentumDriver,
  };
  partial.rsiSignal = rsiSignal(partial);
  return partial;
}

function avg(arr) {
  if (!arr.length) return 0;
  let s = 0; for (const v of arr) s += v;
  return s / arr.length;
}

function buildDriver({ signal, accel, annVol, volSurge, ret5, drawdownPct }) {
  const parts = [];
  if (Math.abs(ret5) > 0.05) parts.push(`5-day move ${(ret5 * 100).toFixed(1)}%`);
  if (volSurge > 1.4) parts.push(`volume ${volSurge.toFixed(1)}× the 20-day average`);
  if (annVol > 80) parts.push(`realized vol elevated at ${annVol.toFixed(0)}%`);
  if (drawdownPct > 15) parts.push(`drawdown ${drawdownPct.toFixed(0)}% off the recent peak`);
  if (!parts.length) parts.push("price action is range-bound with no decisive momentum");
  const lead = signal === "Bullish" ? "Momentum is constructive" :
               signal === "Bearish" ? "Momentum has rolled over" :
                                      "Momentum is mixed";
  return `${lead}: ${parts.join(", ")}.`;
}

/* ---------- prediction log ---------- */

function buildPredictionLog(assets) {
  const log = [];
  for (const a of assets) {
    const closes = a.series.map((p) => p.c);
    if (closes.length < 30) continue;

    const horizons = [{ ago: 5, label: "5-day" }, { ago: 10, label: "10-day" }];
    for (const h of horizons) {
      const i = closes.length - 1 - h.ago;
      if (i < 21) continue;
      const c0    = closes[i];
      const cNow  = closes.at(-1);
      const win5  = closes.slice(i - 5, i);
      const win20 = closes.slice(i - 20, i);
      if (win5.length < 5 || win20.length < 20) continue;

      const r5  = (c0 - win5[0])  / win5[0];
      const r20 = (c0 - win20[0]) / win20[0];
      const acc = r5 - r20 / 4;
      const dir = acc > 0.04 ? "Bullish" : acc < -0.04 ? "Bearish" : "Neutral";
      const conf = Math.round(clamp(40 + Math.abs(acc) * 220, 40, 92));
      const target = c0 * (1 + acc * 0.6);
      const realized = (cNow - c0) / c0;

      let grade = "Miss", gradeClass = "grade-miss";
      if (dir === "Bullish") {
        if (realized >  0.05) { grade = "Hit";     gradeClass = "grade-hit"; }
        else if (realized > 0) { grade = "Partial"; gradeClass = "grade-partial"; }
      } else if (dir === "Bearish") {
        if (realized < -0.05) { grade = "Hit";     gradeClass = "grade-hit"; }
        else if (realized < 0) { grade = "Partial"; gradeClass = "grade-partial"; }
      } else {
        if (Math.abs(realized) < 0.04) { grade = "Hit";     gradeClass = "grade-hit"; }
        else if (Math.abs(realized) < 0.08) { grade = "Partial"; gradeClass = "grade-partial"; }
      }

      log.push({
        symbol: a.symbol, direction: dir, horizon: h.label, confidence: conf,
        target, actual: cNow, entry: c0, realized: realized * 100,
        grade, gradeClass,
      });
    }
  }
  log.sort((a, b) => Math.abs(b.realized) - Math.abs(a.realized));
  return log.slice(0, 12);
}

function buildAccuracyBars(log) {
  const groups = [
    { label: "Bullish calls",  test: (r) => r.direction === "Bullish" },
    { label: "Bearish calls",  test: (r) => r.direction === "Bearish" },
    { label: "Neutral calls",  test: (r) => r.direction === "Neutral" },
    { label: "High confidence (≥75)", test: (r) => r.confidence >= 75 },
    { label: "5-day horizon",  test: (r) => r.horizon === "5-day" },
    { label: "10-day horizon", test: (r) => r.horizon === "10-day" },
  ];
  return groups
    .map((g) => {
      const subset = log.filter(g.test);
      if (!subset.length) return [g.label, 0, 0];
      const hits = subset.filter((r) => r.grade === "Hit").length;
      const partials = subset.filter((r) => r.grade === "Partial").length;
      const score = Math.round(((hits + partials * 0.5) / subset.length) * 100);
      return [g.label, score, subset.length];
    })
    .filter(([, , n]) => n > 0);
}

function buildAutoEvents(assets) {
  const events = [];
  for (const a of assets) {
    if (Math.abs(a.change) >= 6) {
      events.push({
        title: `${a.symbol} ${a.change >= 0 ? "rallied" : "sold off"} ${Math.abs(a.change).toFixed(1)}% intraday`,
        assets: a.symbol,
        sentiment: a.change >= 0 ? "Bullish" : "Bearish",
        urgency: "Price",
        summary: a.momentumSignal.driver,
      });
    }
    if (a.volSurge >= 1.8) {
      events.push({
        title: `${a.symbol} volume surge: ${a.volSurge.toFixed(1)}× the 20-day average`,
        assets: a.symbol,
        sentiment: a.ret5 >= 0 ? "Bullish" : "Bearish",
        urgency: "Volume",
        summary: `Recent 5-session volume is running ${a.volSurge.toFixed(1)}× the prior 20-session baseline.`,
      });
    }
    if (a.annVol >= 90) {
      events.push({
        title: `${a.symbol} realized volatility above 90% (annualized)`,
        assets: a.symbol,
        sentiment: "Neutral",
        urgency: "Volatility",
        summary: `30-day realized volatility printed ${a.annVol.toFixed(0)}%; option premiums likely reflect a wide range.`,
      });
    }
    if (a.drawdownPct >= 25) {
      events.push({
        title: `${a.symbol} drawdown ${a.drawdownPct.toFixed(0)}% from 30-day peak`,
        assets: a.symbol,
        sentiment: "Bearish",
        urgency: "Drawdown",
        summary: `Closed ${a.drawdownPct.toFixed(0)}% below its highest close of the last 30 sessions.`,
      });
    }
  }
  events.sort((a, b) => sevRank(b) - sevRank(a));
  return events.slice(0, 8);
}

function sevRank(ev) {
  const order = { Drawdown: 4, Volume: 3, Price: 2, Volatility: 1 };
  return order[ev.urgency] || 0;
}

/* ---------- rendering ---------- */

function filteredAssets() {
  const category = $("#categoryFilter").value;
  const minRisk  = Number($("#riskFilter").value);
  const search   = $("#assetSearch").value.trim().toLowerCase();
  const sort     = $("#sortSelect").value;

  const sortVal = (a) => {
    if (sort === "risk")       return a.risk;
    if (sort === "change")     return a.change;
    if (sort === "squeeze")    return a.squeeze;
    if (sort === "vol")        return a.annVol;
    if (sort === "confidence") return activeSignal(a).confidence;
    if (sort === "rsi")        return a.rsiSignal?.liveRsi ?? 0;
    return 0;
  };

  return state.assets
    .filter((a) => category === "All" || a.category === category)
    .filter((a) => a.risk >= minRisk)
    .filter((a) => !search || `${a.symbol} ${a.name}`.toLowerCase().includes(search))
    .sort((a, b) => (sortVal(b) || 0) - (sortVal(a) || 0));
}

function renderTicker() {
  const html = state.assets
    .map((a) => `
      <div class="ticker-item">
        <strong>${a.symbol}</strong>
        <span class="num">${fmtCurrency(a.price)}</span>
        <span class="num ${a.change >= 0 ? "positive" : "negative"}">${fmtPct(a.change)}</span>
      </div>
    `).join("");
  $("#ticker").innerHTML = html;
}

function signalPill(signal, confidence) {
  const cls = signal === "Bullish" ? "signal-bullish" :
              signal === "Bearish" ? "signal-bearish" : "signal-neutral";
  return `<span class="signal-pill ${cls}">${signal}<span class="signal-conf">${confidence}</span></span>`;
}

function renderAssets() {
  const rows = filteredAssets();
  if (!rows.length) {
    $("#assetRows").innerHTML = `<tr class="skeleton-row"><td colspan="9">No assets match the current filters.</td></tr>`;
    return;
  }
  $("#assetRows").innerHTML = rows.map((a) => {
    const [label, klass] = tier(a.risk);
    const dir = a.change >= 0 ? "positive" : "negative";
    const sel = a.symbol === state.selectedSymbol ? "selected" : "";
    const sig = activeSignal(a);
    const rsi = a.rsiSignal?.liveRsi;
    const [zone, zoneClass] = rsiZone(rsi);
    return `
      <tr class="${sel}" data-symbol="${a.symbol}">
        <td>
          <div class="asset-cell">
            <div class="asset-logo" style="background:${logoColor(a.symbol)}">${a.symbol.slice(0, 2)}</div>
            <div class="asset-cell-text"><strong>${a.symbol}</strong><span>${a.name}</span></div>
          </div>
        </td>
        <td>${a.category}</td>
        <td class="num">${fmtCurrency(a.price)}</td>
        <td class="num ${dir}">${fmtPct(a.change)}</td>
        <td class="num"><span class="badge ${klass}">${a.risk} · ${label}</span></td>
        <td class="num"><span class="badge ${zoneClass}" title="${zone}">${rsi != null ? rsi.toFixed(0) : "—"}</span></td>
        <td>${signalPill(sig.signal, sig.confidence)}</td>
        <td class="num">${a.squeeze}</td>
        <td><button class="row-button" data-symbol="${a.symbol}">Open</button></td>
      </tr>
    `;
  }).join("");

  document.querySelectorAll("#assetRows tr[data-symbol]").forEach((tr) => {
    tr.addEventListener("click", () => {
      state.selectedSymbol = tr.dataset.symbol;
      renderAssets();
      renderDetail();
    });
  });
}

function renderDetail() {
  const a = state.assets.find((x) => x.symbol === state.selectedSymbol) || state.assets[0];
  if (!a) return;
  const [label, klass] = tier(a.risk);

  $("#detailSymbol").textContent = a.symbol;
  $("#detailName").textContent = a.name;
  $("#gaugeScore").textContent = a.risk;
  const lbl = $("#gaugeLabel");
  lbl.textContent = label;
  lbl.className = klass;

  // Needle: 0 -> -90deg, 100 -> +90deg
  const angle = -90 + (a.risk / 100) * 180;
  $("#gaugeNeedle").setAttribute("transform", `rotate(${angle} 100 100)`);

  const sig = activeSignal(a);
  $("#predictionPill").innerHTML = `${signalPill(sig.signal, sig.confidence)} <span class="signal-mode-tag">${sig.mode}</span>`;
  $("#predictionTarget").textContent = `${fmtCurrency(sig.target)} 5-day target`;
  $("#predictionDriver").textContent = sig.driver;
  renderRsiCard(a);

  const watched = state.watchlist.has(a.symbol);
  const wb = $("#watchButton");
  wb.setAttribute("aria-pressed", watched ? "true" : "false");
  wb.title = watched ? "Remove from watchlist" : "Add to watchlist";

  $("#riskFactors").innerHTML = a.factors.map(([n, score]) => `
    <div class="factor">
      <span>${n}</span><strong>${score}</strong>
      <div class="factor-bar"><i style="width:${clamp(score, 0, 100)}%"></i></div>
    </div>
  `).join("");

  drawSparkline("#miniChart", a.series.slice(-60), { stroke: a.change >= 0 ? "#3ddc97" : "#ff7558" });
  const slice = a.series.slice(-60);
  const lo = Math.min(...slice.map((p) => p.c));
  const hi = Math.max(...slice.map((p) => p.c));
  $("#miniChartRange").textContent = `${fmtCurrency(lo)} – ${fmtCurrency(hi)}`;
}

function drawSparkline(selector, series, { stroke = "var(--accent)" } = {}) {
  const svg = document.querySelector(selector);
  if (!svg || !series.length) return;
  const W = 320, H = 110, P = 4;
  const xs = series.map((_, i) => i);
  const ys = series.map((p) => p.c);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const yRange = yMax - yMin || 1;
  const xMax = xs.at(-1) || 1;
  const sx = (x) => P + (x / xMax) * (W - 2 * P);
  const sy = (y) => H - P - ((y - yMin) / yRange) * (H - 2 * P);
  let d = "";
  series.forEach((p, i) => { d += `${i === 0 ? "M" : "L"}${sx(i).toFixed(2)} ${sy(p.c).toFixed(2)} `; });
  const area = `${d} L ${sx(xMax).toFixed(2)} ${H - P} L ${sx(0).toFixed(2)} ${H - P} Z`;
  svg.innerHTML = `
    <defs>
      <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%"   stop-color="${stroke}" stop-opacity="0.30"/>
        <stop offset="100%" stop-color="${stroke}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="${area}" fill="url(#sparkFill)" stroke="none"/>
    <path d="${d}" fill="none" stroke="${stroke}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  `;
}

function renderMetrics() {
  $("#totalAssets").textContent  = state.assets.length;
  $("#extremeAssets").textContent = state.assets.filter((a) => a.risk > 80).length;
  const vols = state.assets.map((a) => a.annVol).filter(Number.isFinite);
  $("#avgVol").textContent = vols.length ? `${(avg(vols)).toFixed(0)}%` : "—";
  $("#breakingCount").textContent = state.autoEvents
    .filter((ev) => ev.assets.split(", ").some((s) => state.watchlist.has(s))).length;
}

function renderPredictionLog() {
  const items = state.predictionLog || [];
  if (!items.length) { $("#predictionLog").innerHTML = `<div class="empty">No graded signals yet.</div>`; return; }
  $("#predictionLog").innerHTML = items.map((r) => `
    <article class="log-item">
      <div class="log-top">
        <strong>${r.symbol} · ${r.direction} · ${r.horizon}</strong>
        <span class="${r.gradeClass}">${r.grade}</span>
      </div>
      <p>Entry ${fmtCurrency(r.entry)} · target ${fmtCurrency(r.target)} · current ${fmtCurrency(r.actual)} (${fmtPct(r.realized)}).</p>
      <small>Confidence ${r.confidence} · graded ${r.horizon} after the call.</small>
    </article>
  `).join("");
}

function renderAccuracy() {
  const bars = state.accuracyBars || [];
  if (!bars.length) { $("#accuracyBars").innerHTML = `<div class="empty">Insufficient history.</div>`; return; }
  $("#accuracyBars").innerHTML = bars.map(([label, value, n]) => `
    <div class="bar-item">
      <div class="log-top">
        <strong>${label}</strong>
        <span class="num">${value}% · n=${n}</span>
      </div>
      <div class="bar-track"><span style="width:${value}%"></span></div>
    </div>
  `).join("");

  const log = state.predictionLog || [];
  const hits = log.filter((r) => r.grade === "Hit").length;
  const total = log.length;
  const hi = log.filter((r) => r.confidence >= 75);
  const hiHits = hi.filter((r) => r.grade === "Hit").length;
  $("#streakGrid").innerHTML = `
    <div><strong>${total ? Math.round(hits / total * 100) : 0}%</strong><span>overall hit rate</span></div>
    <div><strong>${total}</strong><span>graded signals</span></div>
    <div><strong>${hi.length ? Math.round(hiHits / hi.length * 100) : 0}%</strong><span>high-confidence hits</span></div>
  `;
}

function renderRiskRanking() {
  $("#riskRanking").innerHTML = [...state.assets]
    .sort((a, b) => b.risk - a.risk)
    .map((a) => {
      const [label, klass] = tier(a.risk);
      return `
        <article class="risk-row">
          <div class="asset-cell">
            <div class="asset-logo" style="background:${logoColor(a.symbol)}">${a.symbol.slice(0, 2)}</div>
            <div class="asset-cell-text"><strong>${a.symbol}</strong><span>${a.name}</span></div>
          </div>
          <span class="badge ${klass}">${a.risk} · ${label}</span>
        </article>
      `;
    }).join("");
}

function renderNews() {
  const events = state.autoEvents || [];
  if (!events.length) {
    $("#newsList").innerHTML = `<div class="empty">No notable signals in the universe right now.</div>`;
  } else {
    $("#newsList").innerHTML = events.map((it) => {
      const klass = it.sentiment === "Bullish" ? "tier-low" : it.sentiment === "Bearish" ? "tier-extreme" : "tier-mid";
      return `
        <article class="news-item">
          <div class="news-top">
            <strong>${it.title}</strong>
            <span class="badge ${klass}">${it.sentiment}</span>
          </div>
          <p>${it.summary}</p>
          <small>${it.urgency} · ${it.assets}</small>
        </article>
      `;
    }).join("");
  }

  $("#eventList").innerHTML = EVENT_CALENDAR.map((e) => `
    <article class="event-item">
      <div class="event-top"><strong>${e.date}</strong><span class="pill tier-mid">${e.type}</span></div>
      <p>${e.title}</p>
      <small>${e.affects}</small>
    </article>
  `).join("");
}

function renderWatchlist() {
  const saved = state.assets.filter((a) => state.watchlist.has(a.symbol));
  if (!saved.length) {
    $("#watchlistGrid").innerHTML = `<div class="empty">No saved assets. Open an asset and tap the star.</div>`;
    return;
  }
  $("#watchlistGrid").innerHTML = saved.map((a) => {
    const [label, klass] = tier(a.risk);
    return `
      <article class="watch-card">
        <div class="watch-symbol">
          <div class="asset-logo" style="background:${logoColor(a.symbol)}">${a.symbol.slice(0, 2)}</div>
          <div class="asset-cell-text"><strong>${a.symbol}</strong><span>${a.name}</span></div>
        </div>
        <p class="num ${a.change >= 0 ? "positive" : "negative"}">${fmtCurrency(a.price)} · ${fmtPct(a.change)}</p>
        <svg class="spark" id="spark-${a.symbol}" viewBox="0 0 320 110" preserveAspectRatio="none"></svg>
        <span class="badge ${klass}">${a.risk} · ${label}</span>
      </article>
    `;
  }).join("");
  saved.forEach((a) => drawSparkline(`#spark-${a.symbol}`, a.series.slice(-60),
    { stroke: a.change >= 0 ? "#3ddc97" : "#ff7558" }));
}

function fmtDecimalPct(value) {
  if (!Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(2)}%`;
}

function renderRsiCard(asset) {
  const card = $("#rsiCard");
  if (!card) return;
  const rsi = asset.rsiSignal?.liveRsi;
  const [zone, zoneClass] = rsiZone(rsi);
  const bt = state.rsiBacktest?.perAsset?.[asset.symbol];
  const best = bt && bt.rules.find((r) => r.ruleId === bt.bestRuleId);

  let footnote = "Run <code>python3 quant_backtest.py</code> to populate the RSI backtest.";
  if (best) {
    const beat = best.cagr - (bt.buyHold?.cagr ?? 0);
    const beatLbl = `${beat >= 0 ? "+" : ""}${(beat * 100).toFixed(1)} pts vs buy-and-hold`;
    footnote = `<strong>Best historical rule:</strong> ${best.name} · CAGR ${fmtDecimalPct(best.cagr)} · Sharpe ${best.sharpe.toFixed(2)} · win rate ${(best.winRate * 100).toFixed(0)}% over ${best.tradeCount} trades · ${beatLbl}.`;
  }

  card.innerHTML = `
    <div class="rsi-head">
      <span>RSI snapshot</span>
      <strong class="num">${rsi != null ? rsi.toFixed(1) : "—"}</strong>
    </div>
    <div class="rsi-bar">
      <span class="rsi-bar-fill" style="width:${rsi != null ? rsi : 0}%"></span>
      <span class="rsi-mark" style="left:30%"></span>
      <span class="rsi-mark" style="left:70%"></span>
      ${rsi != null ? `<span class="rsi-needle" style="left:${clamp(rsi, 0, 100)}%"></span>` : ""}
    </div>
    <div class="rsi-zone"><span class="badge ${zoneClass}">${zone}</span></div>
    <p class="rsi-footnote">${footnote}</p>
  `;
}

function renderRsiBacktestPanel() {
  const target = $("#rsiBacktestList");
  if (!target) return;
  const bt = state.rsiBacktest;
  if (!bt || !bt.perAsset) {
    target.innerHTML = `<div class="empty">RSI backtest data not loaded — run <code>python3 quant_backtest.py</code> to generate <code>data/rsi_backtest.json</code>.</div>`;
    return;
  }

  const rows = Object.entries(bt.perAsset).map(([sym, data]) => {
    const best = data.rules.find((r) => r.ruleId === data.bestRuleId);
    if (!best) return null;
    const beat = best.cagr - (data.buyHold?.cagr ?? 0);
    return { sym, data, best, beat };
  }).filter(Boolean).sort((a, b) => b.best.sharpe - a.best.sharpe);

  target.innerHTML = rows.map(({ sym, data, best, beat }) => {
    const beatClass = beat >= 0 ? "positive" : "negative";
    return `
      <article class="rsi-row">
        <div class="rsi-row-head">
          <div class="asset-cell">
            <div class="asset-logo" style="background:${logoColor(sym)}">${sym.slice(0, 2)}</div>
            <div class="asset-cell-text">
              <strong>${sym}</strong>
              <span>${best.name}</span>
            </div>
          </div>
          <span class="badge ${best.sharpe > 0.5 ? "tier-low" : best.sharpe > 0 ? "tier-mid" : "tier-high"}">Sharpe ${best.sharpe.toFixed(2)}</span>
        </div>
        <div class="rsi-row-stats">
          <div><span>Strategy CAGR</span><strong>${fmtDecimalPct(best.cagr)}</strong></div>
          <div><span>Buy & Hold CAGR</span><strong>${fmtDecimalPct(data.buyHold?.cagr)}</strong></div>
          <div><span>vs B&amp;H</span><strong class="${beatClass}">${beat >= 0 ? "+" : ""}${(beat * 100).toFixed(1)} pts</strong></div>
          <div><span>Win rate</span><strong>${(best.winRate * 100).toFixed(0)}%</strong></div>
          <div><span>Trades</span><strong>${best.tradeCount}</strong></div>
          <div><span>Avg hold</span><strong>${best.avgHoldDays.toFixed(0)}d</strong></div>
          <div><span>Max DD</span><strong>${fmtDecimalPct(best.maxDrawdown)}</strong></div>
          <div><span>Exposure</span><strong>${fmtDecimalPct(best.exposure)}</strong></div>
        </div>
      </article>
    `;
  }).join("");

  const period = $("#rsiBacktestPeriod");
  if (period && rows.length) {
    const ds = rows[0].data;
    period.textContent = `Per-asset RSI backtest from ${ds.startDate} (varies by symbol). Best rule chosen by Sharpe; ${bt.rules.length} rule variants tested per asset.`;
  }
}

function renderQuant() {
  const sorted = [...QUANT_BACKTEST.results].sort((a, b) => (b.sharpe - a.sharpe) || (b.cagr - a.cagr));
  const best = sorted[0];
  $("#quantBestName").textContent = best.name;
  $("#quantBestSharpe").textContent = best.sharpe.toFixed(2);
  $("#quantPeriod").textContent =
    `${QUANT_BACKTEST.period.start} to ${QUANT_BACKTEST.period.end}; ${QUANT_BACKTEST.assumptions.transactionCostBps} bps turnover cost; no look-ahead.`;
  $("#quantTakeaway").textContent =
    "The honest result: passive SPY buy-and-hold beat the tested quant rules on CAGR and Sharpe in this sample. Trend and momentum rules lowered drawdown somewhat, but did not improve absolute performance.";

  $("#quantResults").innerHTML = sorted.map((item, idx) => `
    <article class="quant-row ${idx === 0 ? "best" : ""}">
      <div class="quant-row-top">
        <div>
          <strong>${idx + 1}. ${item.name}</strong>
          <p>${item.description}</p>
        </div>
        <span class="badge ${idx === 0 ? "tier-low" : "tier-mid"}">${idx === 0 ? "Best" : "Tested"}</span>
      </div>
      <div class="quant-stats">
        <div class="quant-stat"><span>CAGR</span><strong>${fmtDecimalPct(item.cagr)}</strong></div>
        <div class="quant-stat"><span>Sharpe</span><strong>${item.sharpe.toFixed(2)}</strong></div>
        <div class="quant-stat"><span>Max DD</span><strong>${fmtDecimalPct(item.maxDrawdown)}</strong></div>
        <div class="quant-stat"><span>Total</span><strong>${fmtDecimalPct(item.totalReturn)}</strong></div>
        <div class="quant-stat"><span>Exposure</span><strong>${fmtDecimalPct(item.avgExposure)}</strong></div>
      </div>
    </article>
  `).join("");
}

function renderAll() {
  renderTicker();
  renderAssets();
  renderDetail();
  renderMetrics();
  renderPredictionLog();
  renderAccuracy();
  renderRiskRanking();
  renderNews();
  renderWatchlist();
  renderQuant();
  renderRsiBacktestPanel();
}

/* ---------- views & status ---------- */

function setView(view) {
  const titles = {
    dashboard: "Unified Asset Dashboard",
    ai:        "Signal Intelligence",
    quant:     "Quant Lab",
    risk:      "Risk Center",
    news:      "Market Events",
    watchlist: "Watchlist",
  };
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.view === view));
  document.querySelectorAll(".view").forEach((s) => s.classList.toggle("active", s.id === `${view}View`));
  $("#pageTitle").textContent = titles[view];
}

function setStatus(kind, message) {
  const card = $("#marketStatus");
  card.classList.remove("is-error", "is-loading");
  if (kind === "error")    card.classList.add("is-error");
  if (kind === "loading")  card.classList.add("is-loading");
  $("#marketStatusLabel").textContent =
    kind === "error" ? "Live feed unavailable" :
    kind === "loading" ? "Fetching live quotes…" :
                         "Live feed connected";
  $("#streamLatency").textContent = message;
}

/* ---------- export ---------- */

function exportCsv() {
  const header = ["Symbol", "Name", "Category", "Price", "Change %", "30d Vol %", "Risk", "Mode", "Signal", "Confidence", "RSI(14)", "Squeeze"];
  const rows = filteredAssets().map((a) => {
    const sig = activeSignal(a);
    const rsi = a.rsiSignal?.liveRsi;
    return [
      a.symbol, a.name, a.category,
      a.price.toFixed(4), a.change.toFixed(2), a.annVol.toFixed(2),
      a.risk, sig.mode, sig.signal, sig.confidence,
      rsi != null ? rsi.toFixed(1) : "", a.squeeze,
    ];
  });
  const csv = [header, ...rows]
    .map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `regarded-trade-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/* ---------- refresh loop ---------- */

async function refresh() {
  setStatus("loading", "Fetching live quotes…");
  try {
    const raw = await fetchAll();
    const enriched = raw.map((a) => {
      const an = computeAnalytics(a);
      if (!an) return null;
      return { ...a, ...an };
    }).filter(Boolean);

    if (!enriched.length) throw new Error("No usable data");

    state.assets = enriched;
    state.lastUpdated = new Date();
    state.predictionLog = buildPredictionLog(enriched);
    state.accuracyBars  = buildAccuracyBars(state.predictionLog);
    state.autoEvents    = buildAutoEvents(enriched);

    if (!state.selectedSymbol || !enriched.find((a) => a.symbol === state.selectedSymbol)) {
      state.selectedSymbol = enriched[0].symbol;
    }

    state.loading = false;
    state.error = null;
    renderAll();
    setStatus("ok", `Updated ${state.lastUpdated.toLocaleTimeString()}`);
  } catch (err) {
    console.error("[regarded] fetch failed", err);
    state.error = err;
    setStatus("error", "Open via http://localhost or use a CORS-friendly proxy.");
    if (!state.assets.length) {
      $("#assetRows").innerHTML = `
        <tr class="skeleton-row">
          <td colspan="8">
            Couldn't reach the market data feed.
            Try refreshing, or serve this folder over <code>http://localhost</code>
            (e.g. <code>python3 -m http.server</code>) — public CORS proxies block <code>file://</code> origins.
          </td>
        </tr>`;
    }
  }
}

/* ---------- wiring ---------- */

$("#navList").addEventListener("click", (e) => {
  const item = e.target.closest(".nav-item");
  if (item) setView(item.dataset.view);
});

["categoryFilter", "riskFilter", "sortSelect", "assetSearch"].forEach((id) => {
  $(`#${id}`).addEventListener("input", () => {
    $("#riskValue").textContent = $("#riskFilter").value;
    renderAssets();
  });
});

$("#watchButton").addEventListener("click", () => {
  if (!state.selectedSymbol) return;
  if (state.watchlist.has(state.selectedSymbol)) state.watchlist.delete(state.selectedSymbol);
  else state.watchlist.add(state.selectedSymbol);
  saveWatchlist();
  renderDetail();
  renderMetrics();
  renderWatchlist();
});

$("#themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("light");
  try { localStorage.setItem("rts.theme", document.body.classList.contains("light") ? "light" : "dark"); } catch {}
});

$("#refreshBtn").addEventListener("click", () => {
  $("#refreshBtn").classList.remove("spin");
  void $("#refreshBtn").offsetWidth;        // restart animation
  $("#refreshBtn").classList.add("spin");
  refresh();
});

$("#exportCsv").addEventListener("click", exportCsv);

$("#signalMode")?.addEventListener("change", (e) => {
  state.signalMode = e.target.value;
  saveSignalMode();
  // Re-run RSI signals so they pick up the latest backtest stats, then re-render.
  state.assets.forEach((a) => { a.rsiSignal = rsiSignal(a); });
  renderAssets();
  renderDetail();
});

try { if (localStorage.getItem("rts.theme") === "light") document.body.classList.add("light"); } catch {}

const sm = $("#signalMode");
if (sm) sm.value = state.signalMode;

(async () => {
  await loadRsiBacktest();
  await refresh();
  // After the backtest is loaded, recompute RSI signals (they were computed
  // earlier without backtest stats) so per-asset best-rule logic kicks in.
  state.assets.forEach((a) => { a.rsiSignal = rsiSignal(a); });
  renderAll();
  setInterval(refresh, REFRESH_MS);
})();
