const assets = [
  {
    symbol: "TQQQ",
    name: "ProShares UltraPro QQQ",
    category: "3x Leveraged ETF",
    price: 88.14,
    change: 3.4,
    risk: 84,
    squeeze: 22,
    ai: "Bullish",
    confidence: 72,
    target: 92.2,
    driver: "Index momentum and options flow outweigh elevated compounding decay.",
    factors: [
      ["Leverage factor", 94],
      ["30-day realized volatility", 82],
      ["Beta to market", 76],
    ],
    history: [69, 72, 70, 73, 76, 75, 79, 81, 84, 82, 85, 84],
  },
  {
    symbol: "SOXL",
    name: "Direxion Daily Semiconductor Bull 3x",
    category: "3x Leveraged ETF",
    price: 42.38,
    change: -2.1,
    risk: 88,
    squeeze: 18,
    ai: "Neutral",
    confidence: 61,
    target: 41.5,
    driver: "Semiconductor breadth is weakening while implied volatility remains elevated.",
    factors: [
      ["Leverage factor", 95],
      ["Implied volatility rank", 87],
      ["Event proximity", 71],
    ],
    history: [78, 80, 82, 79, 83, 86, 88, 89, 86, 87, 90, 88],
  },
  {
    symbol: "LABU",
    name: "Direxion Daily S&P Biotech Bull 3x",
    category: "3x Leveraged ETF",
    price: 105.66,
    change: 4.8,
    risk: 91,
    squeeze: 34,
    ai: "Bearish",
    confidence: 69,
    target: 98.4,
    driver: "Biotech catalyst dispersion is high and recent upside is stretched.",
    factors: [
      ["Leverage factor", 96],
      ["Event proximity", 88],
      ["Liquidity risk", 72],
    ],
    history: [82, 83, 85, 86, 87, 85, 89, 92, 90, 91, 93, 91],
  },
  {
    symbol: "GME",
    name: "GameStop Corp.",
    category: "Active Squeeze",
    price: 28.73,
    change: 9.7,
    risk: 86,
    squeeze: 91,
    ai: "Bullish",
    confidence: 78,
    target: 34.9,
    driver: "Mention velocity, call skew, and borrow pressure are accelerating together.",
    factors: [
      ["Short interest % of float", 84],
      ["Retail sentiment extremes", 93],
      ["Options imbalance", 79],
    ],
    history: [62, 66, 71, 78, 81, 84, 88, 90, 87, 85, 86, 86],
  },
  {
    symbol: "CVNA",
    name: "Carvana Co.",
    category: "Squeeze Candidate",
    price: 212.59,
    change: 5.6,
    risk: 79,
    squeeze: 82,
    ai: "Bullish",
    confidence: 74,
    target: 229.0,
    driver: "High short interest is meeting unusually persistent upside volume.",
    factors: [
      ["Short interest % of float", 81],
      ["Days to cover", 73],
      ["Volume surge", 84],
    ],
    history: [64, 65, 67, 70, 72, 75, 77, 78, 81, 80, 78, 79],
  },
  {
    symbol: "SAVA",
    name: "Cassava Sciences",
    category: "Penny Stock",
    price: 3.84,
    change: -6.2,
    risk: 93,
    squeeze: 67,
    ai: "Bearish",
    confidence: 81,
    target: 3.2,
    driver: "Dilution risk and regulatory overhang dominate the setup.",
    factors: [
      ["SEC / regulatory alert", 91],
      ["Dilution risk", 88],
      ["Liquidity risk", 84],
    ],
    history: [89, 92, 90, 91, 94, 93, 95, 94, 96, 92, 93, 93],
  },
  {
    symbol: "MULN",
    name: "Mullen Automotive",
    category: "Penny Stock",
    price: 0.71,
    change: -11.4,
    risk: 98,
    squeeze: 59,
    ai: "Bearish",
    confidence: 87,
    target: 0.54,
    driver: "Sub-dollar price action, dilution signals, and weak liquidity stack risk.",
    factors: [
      ["Market cap / liquidity", 96],
      ["Dilution / insider selling", 92],
      ["Price distance from 52W low", 89],
    ],
    history: [92, 91, 94, 95, 96, 95, 97, 96, 98, 99, 97, 98],
  },
  {
    symbol: "UVXY",
    name: "ProShares Ultra VIX Short-Term Futures",
    category: "Volatile ETF",
    price: 24.17,
    change: 7.9,
    risk: 90,
    squeeze: 12,
    ai: "Neutral",
    confidence: 66,
    target: 23.8,
    driver: "Macro event risk supports volatility, but carry decay is severe.",
    factors: [
      ["Volatility decay", 95],
      ["Macro event proximity", 86],
      ["Beta to market", 78],
    ],
    history: [83, 84, 86, 88, 87, 89, 91, 90, 92, 91, 89, 90],
  },
  {
    symbol: "PLTR",
    name: "Palantir Technologies",
    category: "High-Volatility Stock",
    price: 127.65,
    change: 2.8,
    risk: 62,
    squeeze: 41,
    ai: "Bullish",
    confidence: 70,
    target: 134.3,
    driver: "Momentum remains constructive, though valuation sensitivity is high.",
    factors: [
      ["IV rank", 63],
      ["Beta to market", 68],
      ["Retail sentiment extremes", 57],
    ],
    history: [54, 56, 58, 61, 59, 60, 64, 63, 61, 62, 64, 62],
  },
  {
    symbol: "SPXL",
    name: "Direxion Daily S&P 500 Bull 3x",
    category: "3x Leveraged ETF",
    price: 168.22,
    change: 1.2,
    risk: 71,
    squeeze: 10,
    ai: "Neutral",
    confidence: 58,
    target: 169.8,
    driver: "Broad-market trend is intact, but near-term macro catalysts limit conviction.",
    factors: [
      ["Leverage factor", 90],
      ["Realized volatility", 59],
      ["Event proximity", 64],
    ],
    history: [61, 63, 65, 68, 67, 70, 69, 72, 73, 71, 72, 71],
  },
];

const predictions = [
  ["GME", "Bullish", "$34.90", "$35.72", "Exact Hit", "1-week", 78],
  ["SAVA", "Bearish", "$3.20", "$3.58", "Direction Correct", "3-day", 81],
  ["SOXL", "Neutral", "$41.50", "$39.96", "Partial", "1-day", 61],
  ["MULN", "Bearish", "$0.54", "$0.49", "Exact Hit", "1-week", 87],
  ["PLTR", "Bullish", "$134.30", "$122.10", "Miss", "2-week", 70],
];

const news = [
  {
    title: "Borrow fee spikes across high-short retail basket",
    assets: "GME, CVNA",
    sentiment: "Bullish",
    urgency: "Breaking",
    summary: "Borrow pressure and mention velocity are rising in tandem. The squeeze model refreshed probability overlays for affected assets.",
  },
  {
    title: "FOMC statement due this week",
    assets: "TQQQ, SPXL, UVXY",
    sentiment: "Neutral",
    urgency: "Macro",
    summary: "Volatility-sensitive products are showing higher event-risk premiums into the announcement window.",
  },
  {
    title: "Biotech filing window opens for small-cap candidates",
    assets: "LABU, SAVA",
    sentiment: "Bearish",
    urgency: "Filings",
    summary: "Dilution and trial-update risk pushed several biotech risk gauges above their alert thresholds.",
  },
];

const events = [
  ["May 8", "FOMC speaker cluster", "Macro", "TQQQ, SPXL, UVXY"],
  ["May 12", "FINRA short interest report", "Short Interest", "GME, CVNA"],
  ["May 19", "Biotech catalyst watch", "FDA", "LABU, SAVA"],
  ["Jun 3", "CPI release", "Macro", "3x ETFs, Volatility ETFs"],
  ["Jun 14", "Quarterly options expiration", "Options", "Squeeze basket"],
];

const accuracy = [
  ["3x Leveraged ETFs", 58],
  ["Penny Stocks", 54],
  ["Active Squeezes", 63],
  ["High Confidence 80-100", 68],
  ["1-week Horizon", 61],
  ["High-VIX Regime", 57],
];

let selectedSymbol = "TQQQ";
let watchlist = new Set(["TQQQ", "GME", "SAVA"]);

const $ = (selector) => document.querySelector(selector);

function formatCurrency(value) {
  return value < 1 ? `$${value.toFixed(2)}` : `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function tier(score) {
  if (score <= 20) return ["Minimal Risk", "tier-low"];
  if (score <= 40) return ["Moderate Risk", "tier-mid"];
  if (score <= 60) return ["High Risk", "tier-high"];
  if (score <= 80) return ["Very High Risk", "tier-high"];
  return ["Extreme Risk", "tier-extreme"];
}

function filteredAssets() {
  const category = $("#categoryFilter").value;
  const minRisk = Number($("#riskFilter").value);
  const search = $("#assetSearch").value.trim().toLowerCase();
  const sort = $("#sortSelect").value;

  return assets
    .filter((asset) => category === "All" || asset.category === category)
    .filter((asset) => asset.risk >= minRisk)
    .filter((asset) => `${asset.symbol} ${asset.name}`.toLowerCase().includes(search))
    .sort((a, b) => {
      const key = { risk: "risk", change: "change", squeeze: "squeeze", confidence: "confidence" }[sort];
      return b[key] - a[key];
    });
}

function renderAssets() {
  const rows = filteredAssets();
  $("#assetRows").innerHTML = rows
    .map((asset) => {
      const [label, className] = tier(asset.risk);
      const directionClass = asset.change >= 0 ? "positive" : "negative";
      return `
        <tr class="${asset.symbol === selectedSymbol ? "selected" : ""}">
          <td class="asset-cell"><strong>${asset.symbol}</strong><span>${asset.name}</span></td>
          <td>${asset.category}</td>
          <td>${formatCurrency(asset.price)}</td>
          <td class="${directionClass}">${asset.change > 0 ? "+" : ""}${asset.change.toFixed(1)}%</td>
          <td><span class="badge ${className}">${asset.risk} / ${label}</span></td>
          <td>${asset.ai} / ${asset.confidence}</td>
          <td>${asset.squeeze}</td>
          <td><button class="row-button" data-symbol="${asset.symbol}">Open</button></td>
        </tr>
      `;
    })
    .join("");

  document.querySelectorAll(".row-button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedSymbol = button.dataset.symbol;
      renderAll();
    });
  });
}

function renderDetail() {
  const asset = assets.find((item) => item.symbol === selectedSymbol) || assets[0];
  const [label, className] = tier(asset.risk);
  $("#detailSymbol").textContent = asset.symbol;
  $("#detailName").textContent = asset.name;
  $("#gaugeScore").textContent = asset.risk;
  $("#gaugeLabel").textContent = label;
  $("#gaugeLabel").className = className;
  $("#gaugeNeedle").style.transform = `translateX(-50%) rotate(${-90 + asset.risk * 1.8}deg)`;
  $("#predictionPill").textContent = `${asset.ai} / ${asset.confidence} confidence`;
  $("#predictionTarget").textContent = `${formatCurrency(asset.target)} base target`;
  $("#predictionDriver").textContent = asset.driver;
  $("#watchButton").textContent = watchlist.has(asset.symbol) ? "*" : "+";

  $("#riskFactors").innerHTML = asset.factors
    .map(([name, score]) => `
      <div class="factor">
        <span>${name}</span><strong>${score}</strong>
        <div class="factor-bar"><i style="width:${score}%"></i></div>
      </div>
    `)
    .join("");

  $("#miniChart").innerHTML = asset.history
    .map((value) => `<span style="height:${Math.max(14, value)}%"></span>`)
    .join("");
}

function renderMetrics() {
  $("#totalAssets").textContent = assets.length;
  $("#extremeAssets").textContent = assets.filter((asset) => asset.risk > 80).length;
  $("#breakingCount").textContent = news.filter((item) =>
    item.assets.split(", ").some((symbol) => watchlist.has(symbol))
  ).length;
}

function renderTicker() {
  $("#ticker").innerHTML = assets
    .map((asset) => `
      <div class="ticker-item">
        <strong>${asset.symbol}</strong>
        <span>${formatCurrency(asset.price)}</span>
        <span class="${asset.change >= 0 ? "positive" : "negative"}">${asset.change > 0 ? "+" : ""}${asset.change.toFixed(1)}%</span>
      </div>
    `)
    .join("");
}

function renderPredictionLog() {
  $("#predictionLog").innerHTML = predictions
    .map(([symbol, direction, target, actual, grade, horizon, confidence]) => `
      <article class="log-item">
        <div class="log-top">
          <strong>${symbol} / ${direction} / ${horizon}</strong>
          <span class="grade">${grade}</span>
        </div>
        <p>Target ${target}; actual close ${actual}; confidence ${confidence}/100.</p>
      </article>
    `)
    .join("");
}

function renderAccuracy() {
  $("#accuracyBars").innerHTML = accuracy
    .map(([label, value]) => `
      <div class="bar-item">
        <div class="log-top"><strong>${label}</strong><span>${value}%</span></div>
        <div class="bar-track"><span style="width:${value}%"></span></div>
      </div>
    `)
    .join("");
}

function renderRiskRanking() {
  $("#riskRanking").innerHTML = [...assets]
    .sort((a, b) => b.risk - a.risk)
    .map((asset) => {
      const [label, className] = tier(asset.risk);
      return `
        <article class="risk-row">
          <div><strong>${asset.symbol}</strong><span> ${asset.name}</span></div>
          <span class="badge ${className}">${asset.risk} / ${label}</span>
        </article>
      `;
    })
    .join("");
}

function renderNews() {
  $("#newsList").innerHTML = news
    .map((item) => `
      <article class="news-item">
        <div class="news-top">
          <strong>${item.title}</strong>
          <span class="badge ${item.sentiment === "Bearish" ? "tier-extreme" : item.sentiment === "Bullish" ? "tier-low" : "tier-mid"}">${item.sentiment}</span>
        </div>
        <p>${item.summary}</p>
        <small>${item.urgency} / ${item.assets}</small>
      </article>
    `)
    .join("");

  $("#eventList").innerHTML = events
    .map(([date, title, type, affected]) => `
      <article class="event-item">
        <div class="event-top"><strong>${date}</strong><span class="pill tier-mid">${type}</span></div>
        <p>${title}</p>
        <small>${affected}</small>
      </article>
    `)
    .join("");
}

function renderWatchlist() {
  const saved = assets.filter((asset) => watchlist.has(asset.symbol));
  $("#watchlistGrid").innerHTML = saved.length
    ? saved
        .map((asset) => `
          <article class="watch-card">
            <div class="log-top">
              <strong>${asset.symbol}</strong>
              <span class="${asset.change >= 0 ? "positive" : "negative"}">${asset.change > 0 ? "+" : ""}${asset.change.toFixed(1)}%</span>
            </div>
            <p>${asset.name}</p>
            <span class="badge ${tier(asset.risk)[1]}">Risk crosses ${Math.max(70, asset.risk - 5)} alert</span>
          </article>
        `)
        .join("")
    : `<article class="watch-card"><strong>No saved assets</strong><p>Open an asset and star it to add alerts.</p></article>`;
}

function renderAll() {
  renderAssets();
  renderDetail();
  renderMetrics();
  renderTicker();
  renderPredictionLog();
  renderAccuracy();
  renderRiskRanking();
  renderNews();
  renderWatchlist();
}

function setView(view) {
  const titles = {
    dashboard: "Unified Asset Dashboard",
    ai: "AI Intelligence",
    risk: "Risk Center",
    news: "News & Events",
    watchlist: "Watchlist",
  };

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === view);
  });
  document.querySelectorAll(".view").forEach((section) => {
    section.classList.toggle("active", section.id === `${view}View`);
  });
  $("#pageTitle").textContent = titles[view];
}

function exportCsv() {
  const header = ["Symbol", "Name", "Category", "Price", "Change", "Risk", "AI Call", "Confidence", "Squeeze Score"];
  const rows = filteredAssets().map((asset) => [
    asset.symbol,
    asset.name,
    asset.category,
    asset.price,
    asset.change,
    asset.risk,
    asset.ai,
    asset.confidence,
    asset.squeeze,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "regarded-trade-assets.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function simulateStream() {
  assets.forEach((asset) => {
    const drift = (Math.random() - 0.48) * 0.18;
    asset.price = Math.max(0.01, asset.price * (1 + drift / 100));
    asset.change += (Math.random() - 0.5) * 0.08;
  });
  $("#streamLatency").textContent = `${(1.2 + Math.random() * 1.4).toFixed(1)}s latency`;
  renderTicker();
  renderAssets();
  renderDetail();
}

$("#navList").addEventListener("click", (event) => {
  const item = event.target.closest(".nav-item");
  if (item) setView(item.dataset.view);
});

["categoryFilter", "riskFilter", "sortSelect", "assetSearch"].forEach((id) => {
  $(`#${id}`).addEventListener("input", () => {
    $("#riskValue").textContent = $("#riskFilter").value;
    renderAssets();
  });
});

$("#watchButton").addEventListener("click", () => {
  if (watchlist.has(selectedSymbol)) watchlist.delete(selectedSymbol);
  else watchlist.add(selectedSymbol);
  renderAll();
});

$("#themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("light");
});

$("#exportCsv").addEventListener("click", exportCsv);

renderAll();
setInterval(simulateStream, 3800);
