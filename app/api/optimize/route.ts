import { NextRequest, NextResponse } from "next/server";
import { runHRP } from "@/lib/hrp";

type Method =
  | "hrp" | "herc" | "ghrp" | "mhrp" | "mvo" | "black_litterman"
  | "nco" | "entropy_pooling" | "olps" | "rba" | "tic";

const BACKEND = process.env.HRP_BACKEND_URL || "http://localhost:3001";
const RF = 0.05;

function logReturns(prices: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < prices.length; i++) r.push(Math.log(prices[i] / prices[i - 1]));
  return r;
}

function portfolioMetrics(
  symbols: string[],
  weights: number[],
  prices: Record<string, number[]>
): { ret: number; vol: number; sharpe: number; sortino: number; maxDD: number } {
  const returnsArr = symbols.map((s) => logReturns(prices[s]));
  const minLen = Math.min(...returnsArr.map((r) => r.length));
  const aligned = returnsArr.map((r) => r.slice(r.length - minLen));

  const portReturns: number[] = [];
  for (let t = 0; t < minLen; t++) {
    let r = 0;
    for (let i = 0; i < symbols.length; i++) r += weights[i] * aligned[i][t];
    portReturns.push(r);
  }

  const T = portReturns.length;
  const mean = portReturns.reduce((a, b) => a + b, 0) / T;
  const variance = portReturns.reduce((a, r) => a + (r - mean) ** 2, 0) / (T - 1);
  const annRet = mean * 252;
  const annVol = Math.sqrt(variance * 252);
  const sharpe = annVol > 0 ? (annRet - RF) / annVol : 0;

  const downsideReturns = portReturns.filter((r) => r < 0);
  const downsideVar = downsideReturns.reduce((a, r) => a + r ** 2, 0) / T;
  const sortino = downsideVar > 0 ? (annRet - RF) / Math.sqrt(downsideVar * 252) : 0;

  let peak = 1, maxDD = 0, cumRet = 1;
  for (const r of portReturns) {
    cumRet *= 1 + r;
    if (cumRet > peak) peak = cumRet;
    const dd = (peak - cumRet) / peak;
    if (dd > maxDD) maxDD = dd;
  }

  return { ret: annRet, vol: annVol, sharpe, sortino, maxDD };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { prices, method = "hrp" }: { prices: Record<string, number[]>; method?: Method } = body;

  const symbols = Object.keys(prices).filter(
    (s) => Array.isArray(prices[s]) && prices[s].length >= 10
  );
  if (symbols.length < 2) {
    return NextResponse.json(
      { error: "Need at least 2 symbols with 10+ data points" },
      { status: 400 }
    );
  }

  const filtered = Object.fromEntries(symbols.map((s) => [s, prices[s]]));

  // Per-asset annualized return & volatility (computed from the price data).
  const assetStats: Record<string, { annRet: number; annVol: number }> = {};
  for (const s of symbols) {
    const ret = logReturns(prices[s]);
    const T = ret.length;
    const mean = ret.reduce((a, b) => a + b, 0) / T;
    const variance = ret.reduce((a, r) => a + (r - mean) ** 2, 0) / (T - 1);
    assetStats[s] = { annRet: mean * 252, annVol: Math.sqrt(variance * 252) };
  }

  let weights: number[] = [];
  let backend: "rust" | "typescript" = "rust";
  let elapsedUs = 0;

  // All 11 methods are served by the Rust backend.
  let ok = false;
  try {
    const resp = await fetch(`${BACKEND}/api/optimize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prices: filtered, method }),
      signal: AbortSignal.timeout(8000),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      weights = symbols.map((s) => data.weights[s] ?? 0);
      elapsedUs = data.elapsed_us ?? 0;
      ok = true;
    }
  } catch {
    // backend unreachable — fall through to the TypeScript fallback
  }

  if (!ok) {
    // Offline fallback: the TypeScript HRP implementation (HRP only).
    const result = runHRP(filtered, symbols);
    weights = symbols.map((s) => {
      const idx = result.symbols.indexOf(s);
      return idx >= 0 ? result.weights[idx] : 0;
    });
    backend = "typescript";
  }

  const metrics = portfolioMetrics(symbols, weights, filtered);

  return NextResponse.json({
    weights: Object.fromEntries(symbols.map((s, i) => [s, weights[i]])),
    metrics,
    assetStats,
    backend,
    elapsedUs,
  });
}
