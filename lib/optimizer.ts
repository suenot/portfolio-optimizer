// Portfolio Optimizer — types, constants, and helpers

export interface OptResult {
  weights: number[];   // 0-100 per asset, parallel to input
  ret: number;         // annualized return
  vol: number;         // annualized volatility
  sharpe: number;
  sortino: number;
  maxDD: number;       // max drawdown (positive fraction)
  backend?: "rust" | "typescript" | "analytical" | "simulated";
  elapsedMs?: number;
}

export type Method =
  | "hrp"
  | "herc"
  | "ghrp"
  | "mhrp"
  | "mvo"
  | "black_litterman"
  | "nco"
  | "entropy_pooling"
  | "olps"
  | "rba"
  | "tic"
  | "pipeline";

// Known asset metadata (colors + display names)
export const ASSET_UNIVERSE: Record<string, { name: string; color: string }> = {
  BTC:     { name: "Bitcoin",       color: "#F7931A" },
  BTCUSDT: { name: "Bitcoin/USDT",  color: "#F7931A" },
  ETH:     { name: "Ethereum",      color: "#627EEA" },
  ETHUSDT: { name: "Ethereum/USDT", color: "#627EEA" },
  AAPL:    { name: "Apple Inc.",     color: "#888888" },
  GLD:     { name: "Gold ETF",       color: "#FFD700" },
  SPY:     { name: "S&P 500 ETF",    color: "#00C49F" },
  NVDA:    { name: "NVIDIA",         color: "#76B900" },
  SOL:     { name: "Solana",         color: "#9945FF" },
  SOLUSDT: { name: "Solana/USDT",    color: "#9945FF" },
  MSFT:    { name: "Microsoft",      color: "#00A4EF" },
  TSLA:    { name: "Tesla",          color: "#CC0000" },
  AGG:     { name: "Bond ETF",       color: "#8884d8" },
  BNBUSDT: { name: "BNB/USDT",       color: "#F3BA2F" },
  XRPUSDT: { name: "XRP/USDT",       color: "#346AA9" },
  ADAUSDT: { name: "ADA/USDT",       color: "#0033AD" },
  DOGEUSDT:{ name: "DOGE/USDT",      color: "#C2A633" },
  DOTUSDT: { name: "DOT/USDT",       color: "#E6007A" },
  LTCUSDT: { name: "LTC/USDT",       color: "#345D9D" },
  LINKUSDT:{ name: "LINK/USDT",      color: "#2A5ADA" },
};

export const PALETTE = [
  "#6366f1", "#22d3ee", "#f59e0b", "#10b981", "#f43f5e",
  "#a855f7", "#14b8a6", "#fb923c", "#84cc16", "#06b6d4",
  "#ec4899", "#64748b", "#ef4444", "#8b5cf6", "#0ea5e9",
];

export function getAssetColor(ticker: string, idx: number): string {
  return ASSET_UNIVERSE[ticker]?.color ?? PALETTE[idx % PALETTE.length];
}

export function getAssetName(ticker: string): string {
  return ASSET_UNIVERSE[ticker]?.name ?? ticker;
}

// ── Efficient frontier (simulated, for visualization) ──────────────

export interface FrontierPoint {
  vol: number;
  ret: number;
  sharpe: number;
}

export interface AssetPoint {
  ticker: string;
  vol: number;
  ret: number;
  color: string;
}

/** Generate frontier from real per-asset stats (returned by API) */
export function generateFrontierFromStats(
  assetStats: Record<string, { annRet: number; annVol: number }>,
  tickers: string[],
  points = 50
): FrontierPoint[] {
  const validTickers = tickers.filter((t) => assetStats[t]);
  if (validTickers.length < 2) return [];

  const stats = validTickers.map((t) => assetStats[t]);
  const rf = 0.05;

  // Min-vol: weight ∝ 1/vol²; Max-ret: weight ∝ ret
  const minVolScores = stats.map(({ annVol }) => 1 / Math.max(annVol ** 2, 0.0001));
  const maxRetScores = stats.map(({ annRet }) => Math.max(annRet, 0.001));

  const sumMV = minVolScores.reduce((a, b) => a + b, 0);
  const sumMR = maxRetScores.reduce((a, b) => a + b, 0);
  const wMV = minVolScores.map((s) => s / sumMV);
  const wMR = maxRetScores.map((s) => s / sumMR);

  const result: FrontierPoint[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const w = wMV.map((mv, idx) => mv * (1 - t) + wMR[idx] * t);

    let portRet = 0, portVol = 0;
    for (let j = 0; j < validTickers.length; j++) {
      portRet += w[j] * stats[j].annRet;
      portVol += w[j] * stats[j].annVol;
    }
    // Mild diversification discount
    portVol *= 0.5 + Math.sqrt(1 / Math.sqrt(validTickers.length));
    portVol = Math.max(portVol, 0.01);

    result.push({
      vol: portVol,
      ret: portRet,
      sharpe: (portRet - rf) / portVol,
    });
  }
  return result;
}
