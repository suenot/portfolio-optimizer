'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import {
  Plus, Trash2, Loader2, TrendingUp, ShieldCheck, BarChart3,
  Activity, ArrowDownRight, Database, Zap, Clock,
} from 'lucide-react';
import {
  ASSET_UNIVERSE, PALETTE, getAssetColor, getAssetName,
  generateFrontierFromStats,
  type OptResult, type Method,
} from '@/lib/optimizer';

// ─── Types ────────────────────────────────────────────────────────

interface PortfolioAsset { id: string; ticker: string; }
type TabId = 'results' | 'frontier' | 'allocation' | 'compare';

interface BenchmarkRow {
  method: string;
  name: string;
  weights: Record<string, number>;
  ret: number;
  vol: number;
  sharpe: number;
  sortino: number;
  maxDD: number;
  elapsedUs: number;
}

type SortKey = 'name' | 'ret' | 'vol' | 'sharpe' | 'sortino' | 'maxDD' | 'elapsedUs';

// ─── Constants ───────────────────────────────────────────────────

const DEFAULT_ASSETS: PortfolioAsset[] = [
  { id: '1', ticker: 'BTC' },
  { id: '2', ticker: 'ETH' },
  { id: '3', ticker: 'AAPL' },
  { id: '4', ticker: 'GLD' },
  { id: '5', ticker: 'SPY' },
];

const METHODS: { id: Method; label: string; desc: string }[] = [
  { id: 'hrp',             label: 'HRP',             desc: 'Hierarchical Risk Parity' },
  { id: 'herc',            label: 'HERC',            desc: 'Hierarchical Equal Risk Contribution' },
  { id: 'ghrp',            label: 'GHRP',            desc: 'Generalized HRP (genetic ordering)' },
  { id: 'mhrp',            label: 'MHRP',            desc: 'Modified HRP (EWMA + shrinkage)' },
  { id: 'mvo',             label: 'MVO',             desc: 'Mean-Variance (Markowitz)' },
  { id: 'black_litterman', label: 'Black-Litterman', desc: 'Equilibrium returns + views' },
  { id: 'nco',             label: 'NCO',             desc: 'Nested Clustered Optimization' },
  { id: 'entropy_pooling', label: 'Entropy Pooling', desc: 'Min relative-entropy posterior' },
  { id: 'olps',            label: 'OLPS',            desc: 'Online Portfolio Selection' },
  { id: 'rba',             label: 'RBA',             desc: 'Robust Bayesian Allocation' },
  { id: 'tic',             label: 'TIC',             desc: 'Theory-Implied Correlation' },
  { id: 'pipeline',        label: 'Pipeline',        desc: 'Composite: HRP + long/short + CVaR' },
];

const TODAY = new Date().toISOString().slice(0, 10);
const ONE_YEAR_AGO = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);

// ─── Helper Components ────────────────────────────────────────────

function MetricCard({
  icon: Icon, label, value, suffix = '', color, sub,
}: {
  icon: React.ElementType; label: string; value: number | string;
  suffix?: string; color?: string; sub?: string;
}) {
  return (
    <div className="p-4 rounded-2xl flex flex-col gap-2" style={{
      background: 'hsla(240,10%,5.5%,0.6)',
      border: '1px solid var(--border)',
      backdropFilter: 'blur(12px)',
    }}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'hsla(245,72%,60%,0.15)' }}>
          <Icon size={14} style={{ color: color || 'var(--accent-dark)' }} />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          {label}
        </span>
      </div>
      <div>
        <span className="text-2xl font-black"
          style={{ color: color || 'var(--foreground)', fontFamily: 'var(--font-mono)' }}>
          {typeof value === 'number' ? value.toFixed(2) : value}{suffix}
        </span>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{sub}</p>}
      </div>
    </div>
  );
}

function AssetDot(props: { cx?: number; cy?: number; payload?: { color?: string; ticker?: string } }) {
  const { cx = 0, cy = 0, payload } = props;
  return (
    <g>
      <circle cx={cx} cy={cy} r={8} fill={payload?.color || 'var(--accent)'}
        stroke="#fff" strokeWidth={1.5} opacity={0.9} />
      <text x={cx} y={cy - 12} textAnchor="middle" fontSize={10}
        fill="var(--foreground)" fontWeight={700} fontFamily="var(--font-mono)">
        {payload?.ticker}
      </text>
    </g>
  );
}

function OptimalDot(props: { cx?: number; cy?: number }) {
  const { cx = 0, cy = 0 } = props;
  const r = 10;
  const points = Array.from({ length: 5 }, (_, i) => {
    const outerAngle = Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const innerAngle = outerAngle + Math.PI / 5;
    return [
      cx + r * Math.cos(outerAngle), cy - r * Math.sin(outerAngle),
      cx + (r / 2) * Math.cos(innerAngle), cy - (r / 2) * Math.sin(innerAngle),
    ].join(',');
  }).join(' ');
  return <polygon points={points} fill="hsl(50 100% 60%)" stroke="#fff" strokeWidth={1.5} />;
}

// ─── Main Page ────────────────────────────────────────────────────

export default function OptimizerPage() {
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [assets, setAssets] = useState<PortfolioAsset[]>(DEFAULT_ASSETS);
  const [method, setMethod] = useState<Method>('hrp');
  const [dateRange, setDateRange] = useState({ start: ONE_YEAR_AGO, end: TODAY });
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [result, setResult] = useState<OptResult | null>(null);
  const [optimizedWeights, setOptimizedWeights] = useState<number[] | null>(null);
  const [assetStats, setAssetStats] = useState<Record<string, { annRet: number; annVol: number }>>({});
  const [activeTab, setActiveTab] = useState<TabId>('results');
  const [newTicker, setNewTicker] = useState('');
  const [error, setError] = useState<string | null>(null);
  const startRef = useRef(Date.now());
  const [benchmark, setBenchmark] = useState<BenchmarkRow[] | null>(null);
  const [benchElapsedMs, setBenchElapsedMs] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('sharpe');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Load available symbols from API
  useEffect(() => {
    fetch('/api/symbols')
      .then((r) => r.json())
      .then((syms: string[]) => { if (syms.length > 0) setAvailableSymbols(syms); })
      .catch(() => {});
  }, []);

  // ── Asset management ──────────────────────────────────────────

  const handleAddAsset = useCallback(() => {
    const ticker = newTicker.toUpperCase().trim();
    if (!ticker) return;
    if (assets.some((a) => a.ticker === ticker)) return;
    setAssets((prev) => [...prev, { id: Date.now().toString(), ticker }]);
    setNewTicker('');
    setResult(null);
    setOptimizedWeights(null);
    setBenchmark(null);
  }, [newTicker, assets]);

  const handleRemoveAsset = useCallback((id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
    setResult(null);
    setOptimizedWeights(null);
    setBenchmark(null);
  }, []);

  // ── Optimization ──────────────────────────────────────────────

  // Apply one benchmark row to the single-method Results/Frontier/Allocation view.
  const applyRow = useCallback((row: BenchmarkRow, elapsedMs: number) => {
    const weights = assets.map((a) => (row.weights[a.ticker] ?? 0) * 100);
    setResult({
      weights,
      ret: row.ret,
      vol: row.vol,
      sharpe: row.sharpe,
      sortino: row.sortino,
      maxDD: row.maxDD,
      backend: 'rust',
      elapsedMs,
    });
    setOptimizedWeights(weights);
  }, [assets]);

  const handleOptimize = useCallback(async () => {
    if (assets.length < 2) return;
    setLoading(true);
    setError(null);
    setLoadingPhase('Fetching price data…');
    startRef.current = Date.now();

    try {
      // 1. Fetch real price data
      const symbolsParam = assets.map((a) => a.ticker).join(',');
      const klinesRes = await fetch(
        `/api/klines?symbols=${encodeURIComponent(symbolsParam)}&start=${dateRange.start}&end=${dateRange.end}`
      );
      if (!klinesRes.ok) throw new Error('Failed to fetch price data');

      const pricesRaw: Record<string, { timestamp: string; close: number }[]> = await klinesRes.json();

      const prices: Record<string, number[]> = {};
      for (const [sym, rows] of Object.entries(pricesRaw)) {
        if (rows.length >= 10) prices[sym] = rows.map((r) => r.close);
      }

      const validTickers = assets.map((a) => a.ticker).filter((t) => prices[t]);
      if (validTickers.length < 2) {
        setError(
          `Not enough price data. Got data for: ${Object.keys(prices).join(', ') || 'none'}. ` +
          'Check symbol names and date range.'
        );
        return;
      }

      setLoadingPhase('Running all 12 algorithms…');

      // 2. Benchmark every algorithm on the same prices.
      const benchRes = await fetch('/api/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prices: Object.fromEntries(validTickers.map((t) => [t, prices[t]])),
        }),
      });
      if (!benchRes.ok) {
        const err = await benchRes.json().catch(() => ({}));
        throw new Error(err.error || 'Benchmark failed');
      }

      const benchData: {
        results: BenchmarkRow[];
        assetStats: Record<string, { annRet: number; annVol: number }>;
      } = await benchRes.json();

      const elapsedMs = Date.now() - startRef.current;

      setBenchmark(benchData.results);
      setBenchElapsedMs(elapsedMs);
      setAssetStats(benchData.assetStats || {});

      // 3. Show the selected method in the single-method tabs.
      const sel = benchData.results.find((r) => r.method === method) ?? benchData.results[0];
      if (sel) applyRow(sel, elapsedMs);
      setActiveTab('results');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Optimization failed');
    } finally {
      setLoading(false);
      setLoadingPhase('');
    }
  }, [assets, method, dateRange, applyRow]);

  const toggleSort = useCallback((key: SortKey) => {
    if (key === sortKey) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  }, [sortKey, sortDir]);

  // ── Derived data ──────────────────────────────────────────────

  const pieData = optimizedWeights
    ? assets.map((a, i) => ({
        name: a.ticker,
        value: parseFloat(optimizedWeights[i].toFixed(1)),
        color: getAssetColor(a.ticker, i),
      }))
    : [];

  const frontierData = Object.keys(assetStats).length >= 2
    ? generateFrontierFromStats(assetStats, assets.map((a) => a.ticker))
    : [];

  const assetPoints = assets
    .filter((a) => assetStats[a.ticker])
    .map((a, i) => ({
      ticker: a.ticker,
      vol: assetStats[a.ticker].annVol,
      ret: assetStats[a.ticker].annRet,
      color: getAssetColor(a.ticker, i),
    }));

  const optPoint = frontierData.reduce(
    (best, p) => (p.sharpe > best.sharpe ? p : best),
    frontierData[0] || { vol: 0, ret: 0, sharpe: 0 }
  );

  const tabs: { id: TabId; label: string }[] = [
    { id: 'results', label: 'Results' },
    { id: 'frontier', label: 'Efficient Frontier' },
    { id: 'allocation', label: 'Allocation Table' },
    { id: 'compare', label: 'Compare Methods' },
  ];

  const sortedBenchmark = benchmark
    ? [...benchmark].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const cmp =
          typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : String(av).localeCompare(String(bv));
        return sortDir === 'desc' ? -cmp : cmp;
      })
    : [];
  const bestSharpe = benchmark ? Math.max(...benchmark.map((r) => r.sharpe)) : -Infinity;

  const allSymbols = availableSymbols.length > 0
    ? availableSymbols
    : Object.keys(ASSET_UNIVERSE);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="flex flex-col lg:flex-row min-h-screen"
      style={{ paddingTop: '64px', background: 'var(--background)' }}>

      {/* ── Left Panel ──────────────────────────────────────── */}
      <aside className="w-full lg:w-80 flex-shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r overflow-y-auto"
        style={{
          borderColor: 'var(--border)',
          background: 'hsla(240,10%,3.9%,0.98)',
          position: 'sticky', top: '64px',
          height: 'calc(100vh - 64px)',
        }}>
        <div className="p-5 flex flex-col gap-6">

          {/* Header */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest mb-1"
              style={{ color: 'var(--accent-dark)' }}>
              Portfolio Builder
            </h2>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {availableSymbols.length > 0
                ? `${availableSymbols.length} symbols from warehouse`
                : 'Configure assets and run optimization'}
            </p>
          </div>

          {/* ── Date Range ──────────────────────────────────── */}
          <div>
            <span className="text-xs font-bold uppercase tracking-widest mb-2 block"
              style={{ color: 'var(--muted)' }}>
              Date Range
            </span>
            <div className="flex flex-col gap-2">
              {(['start', 'end'] as const).map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs w-8" style={{ color: 'var(--muted)' }}>
                    {key === 'start' ? 'From' : 'To'}
                  </span>
                  <input
                    type="date"
                    value={dateRange[key]}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="flex-1 text-xs rounded-lg px-2 py-1.5 outline-none"
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Asset List ──────────────────────────────────── */}
          <div>
            <span className="text-xs font-bold uppercase tracking-widest mb-3 block"
              style={{ color: 'var(--muted)' }}>
              Assets ({assets.length})
            </span>

            <div className="flex flex-col gap-2">
              {assets.map((asset, idx) => {
                const pct = optimizedWeights ? optimizedWeights[idx] : null;
                const color = getAssetColor(asset.ticker, idx);
                return (
                  <div key={asset.id}
                    className="flex items-center gap-2 p-3 rounded-xl"
                    style={{ background: 'var(--card2)', border: '1px solid var(--border)' }}>
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold"
                          style={{ fontFamily: 'var(--font-mono)', color: 'var(--foreground)' }}>
                          {asset.ticker}
                        </span>
                        {pct !== null && (
                          <span className="text-xs font-bold"
                            style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-dark)' }}>
                            {pct.toFixed(1)}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs truncate mt-0.5" style={{ color: 'var(--muted)' }}>
                        {getAssetName(asset.ticker)}
                      </p>
                      {pct !== null && (
                        <div className="mt-1.5 h-1 rounded-full overflow-hidden"
                          style={{ background: 'var(--border)' }}>
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(pct, 100)}%`, background: color, opacity: 0.85 }} />
                        </div>
                      )}
                    </div>
                    <button onClick={() => handleRemoveAsset(asset.id)}
                      className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center hover:opacity-80"
                      style={{ background: 'hsla(0,72%,51%,0.15)', color: 'var(--red)' }}
                      aria-label={`Remove ${asset.ticker}`}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Add Asset ───────────────────────────────────── */}
          <div className="p-3 rounded-xl flex flex-col gap-2"
            style={{ background: 'var(--card2)', border: '1px solid var(--border)' }}>
            <span className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--muted)' }}>
              Add Asset
            </span>
            <div className="flex gap-2">
              <input
                list="symbols-list"
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddAsset()}
                placeholder="Ticker (e.g. BTC)"
                className="flex-1 text-xs rounded-lg px-2 py-2 outline-none"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                  fontFamily: 'var(--font-mono)',
                }}
              />
              <datalist id="symbols-list">
                {allSymbols
                  .filter((s) => !assets.some((a) => a.ticker === s))
                  .map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
            <button
              onClick={handleAddAsset}
              disabled={!newTicker.trim()}
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-bold transition-all duration-200 disabled:opacity-40"
              style={{
                background: 'hsla(245,72%,60%,0.2)',
                border: '1px solid hsla(245,72%,60%,0.3)',
                color: 'var(--accent-dark)',
              }}>
              <Plus size={12} />
              Add to Portfolio
            </button>
          </div>

          {/* ── Method Selector ─────────────────────────────── */}
          <div>
            <span className="text-xs font-bold uppercase tracking-widest mb-3 block"
              style={{ color: 'var(--muted)' }}>
              Optimization Method
            </span>
            <div className="flex flex-col gap-2">
              {METHODS.map((m) => (
                <button key={m.id}
                  onClick={() => {
                    setMethod(m.id);
                    const row = benchmark?.find((r) => r.method === m.id);
                    if (row) {
                      applyRow(row, benchElapsedMs);
                    } else {
                      setResult(null);
                      setOptimizedWeights(null);
                    }
                  }}
                  className="text-left p-3 rounded-xl transition-all duration-200"
                  style={{
                    background: method === m.id ? 'hsla(245,72%,60%,0.2)' : 'var(--card2)',
                    border: method === m.id
                      ? '1px solid hsla(245,72%,60%,0.4)'
                      : '1px solid var(--border)',
                  }}>
                  <div className="text-xs font-bold"
                    style={{ color: method === m.id ? 'var(--accent-dark)' : 'var(--foreground)' }}>
                    {m.label}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Optimize Button ─────────────────────────────── */}
          <button
            onClick={handleOptimize}
            disabled={loading || assets.length < 2}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'var(--accent)',
              color: '#fff',
              boxShadow: loading ? 'none' : '0 0 30px hsla(245,72%,60%,0.4)',
              letterSpacing: '0.12em',
            }}>
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {loadingPhase || 'Computing…'}
              </>
            ) : (
              <>
                <TrendingUp size={16} />
                Optimize Portfolio
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ── Right Panel ─────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-0">
        {/* Tabs + backend badge */}
        <div className="flex items-center gap-1 px-6 py-3 border-b"
          style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200"
              style={{
                background: activeTab === tab.id ? 'hsla(245,72%,60%,0.2)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent-dark)' : 'var(--muted)',
                border: activeTab === tab.id
                  ? '1px solid hsla(245,72%,60%,0.3)'
                  : '1px solid transparent',
              }}>
              {tab.label}
            </button>
          ))}

          {result && (
            <div className="ml-auto flex items-center gap-3">
              {result.elapsedMs !== undefined && (
                <span className="flex items-center gap-1 text-xs"
                  style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                  <Clock size={10} />
                  {result.elapsedMs}ms
                </span>
              )}
              <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg"
                style={{
                  background: result.backend === 'rust'
                    ? 'hsla(142,71%,45%,0.15)'
                    : result.backend === 'typescript'
                    ? 'hsla(245,72%,60%,0.15)'
                    : 'hsla(40,100%,60%,0.15)',
                  color: result.backend === 'rust'
                    ? 'var(--green)'
                    : result.backend === 'typescript'
                    ? 'var(--accent-dark)'
                    : 'hsl(40 100% 60%)',
                  border: '1px solid currentColor',
                }}>
                {result.backend === 'rust' ? <Zap size={10} /> : <Database size={10} />}
                {result.backend === 'rust'
                  ? 'Rust backend'
                  : result.backend === 'typescript'
                  ? 'TS fallback (HRP)'
                  : 'Analytical'}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">

          {/* Error */}
          {error && (
            <div className="mb-4 p-4 rounded-xl text-sm"
              style={{
                background: 'hsla(0,72%,51%,0.1)',
                border: '1px solid hsla(0,72%,51%,0.3)',
                color: 'var(--red)',
              }}>
              {error}
            </div>
          )}

          {/* ── Results tab ───────────────────────────────── */}
          {activeTab === 'results' && (
            <div className="flex flex-col gap-6">
              {!result ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 rounded-3xl"
                  style={{ background: 'hsla(240,10%,5.5%,0.4)', border: '2px dashed var(--border)' }}>
                  <TrendingUp size={40} style={{ color: 'var(--accent-dark)', opacity: 0.4 }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
                    Click &ldquo;Optimize Portfolio&rdquo; to run real optimization
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted)', opacity: 0.6 }}>
                    Uses real price data from the warehouse
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
                    <MetricCard icon={TrendingUp} label="Sharpe Ratio" value={result.sharpe}
                      color="var(--accent-dark)" sub="Risk-adjusted return" />
                    <MetricCard icon={Activity} label="Exp. Return"
                      value={+(result.ret * 100).toFixed(1)} suffix="%"
                      color="var(--green)" sub="Annual (from prices)" />
                    <MetricCard icon={BarChart3} label="Volatility"
                      value={+(result.vol * 100).toFixed(1)} suffix="%"
                      color="hsl(40 100% 60%)" sub="Annualized std dev" />
                    <MetricCard icon={ShieldCheck} label="Sortino"
                      value={result.sortino} color="hsl(200 80% 60%)"
                      sub="Downside risk adj." />
                    <MetricCard icon={ArrowDownRight} label="Max Drawdown"
                      value={+(result.maxDD * 100).toFixed(1)} suffix="%"
                      color="var(--red)" sub="Historical worst" />
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Pie */}
                    <div className="p-5 rounded-2xl"
                      style={{ background: 'hsla(240,10%,5.5%,0.6)', border: '1px solid var(--border)' }}>
                      <h3 className="text-xs font-bold uppercase tracking-widest mb-4"
                        style={{ color: 'var(--muted)' }}>
                        Optimized Allocation
                      </h3>
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%"
                            innerRadius={60} outerRadius={105} paddingAngle={2} dataKey="value">
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Weight']}
                            contentStyle={{
                              background: 'var(--card2)', border: '1px solid var(--border)',
                              borderRadius: '12px', color: 'var(--foreground)', fontSize: '12px',
                            }} />
                          <Legend iconType="circle" iconSize={8}
                            formatter={(value) => (
                              <span style={{ color: 'var(--muted)', fontSize: '11px' }}>{value}</span>
                            )} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Frontier preview */}
                    {frontierData.length >= 2 && (
                      <div className="p-5 rounded-2xl"
                        style={{ background: 'hsla(240,10%,5.5%,0.6)', border: '1px solid var(--border)' }}>
                        <h3 className="text-xs font-bold uppercase tracking-widest mb-4"
                          style={{ color: 'var(--muted)' }}>
                          Efficient Frontier Preview
                        </h3>
                        <ResponsiveContainer width="100%" height={260}>
                          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsla(240,3.7%,20%,0.5)" />
                            <XAxis dataKey="vol" tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                              tick={{ fill: 'var(--muted)', fontSize: 10 }}
                              axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                            <YAxis dataKey="ret" tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                              tick={{ fill: 'var(--muted)', fontSize: 10 }}
                              axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                            <Scatter name="Frontier" data={frontierData}
                              fill="hsla(245,72%,60%,0.6)"
                              line={{ stroke: 'hsl(245 72% 60%)', strokeWidth: 2 }}
                              lineType="joint" shape={<circle r={2} />} />
                            <Scatter name="Optimal" data={[optPoint]} shape={<OptimalDot />} />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Frontier tab ──────────────────────────────── */}
          {activeTab === 'frontier' && (
            <div className="p-5 rounded-2xl"
              style={{ background: 'hsla(240,10%,5.5%,0.6)', border: '1px solid var(--border)' }}>
              <div className="mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: 'var(--muted)' }}>
                  Efficient Frontier
                </h3>
                <p className="text-xs mt-1" style={{ color: 'var(--muted)', opacity: 0.7 }}>
                  Risk vs. Return — computed from real price data. Star = Max Sharpe point.
                </p>
              </div>
              {frontierData.length < 2 ? (
                <p className="text-sm text-center py-16" style={{ color: 'var(--muted)' }}>
                  Run optimization first to see the efficient frontier
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={480}>
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsla(240,3.7%,20%,0.5)" />
                    <XAxis dataKey="vol" name="Volatility"
                      tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                      label={{ value: 'Volatility (σ)', position: 'insideBottom', offset: -15,
                        fill: 'var(--muted)', fontSize: 11 }}
                      tick={{ fill: 'var(--muted)', fontSize: 11 }}
                      axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                    <YAxis dataKey="ret" name="Return"
                      tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                      label={{ value: 'Expected Return', angle: -90, position: 'insideLeft',
                        offset: 15, fill: 'var(--muted)', fontSize: 11 }}
                      tick={{ fill: 'var(--muted)', fontSize: 11 }}
                      axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{ background: 'var(--card2)', border: '1px solid var(--border)',
                        borderRadius: '12px', color: 'var(--foreground)', fontSize: '12px' }}
                      formatter={(value, name) => {
                        const n = Number(value);
                        const formatted = ['vol', 'ret', 'Volatility', 'Return'].includes(String(name))
                          ? `${(n * 100).toFixed(1)}%` : n.toFixed(2);
                        return [formatted, String(name)];
                      }} />
                    <Scatter name="Frontier" data={frontierData}
                      fill="hsla(245,72%,60%,0.4)"
                      line={{ stroke: 'hsl(245 72% 60%)', strokeWidth: 2.5 }}
                      lineType="joint" shape={<circle r={2.5} />} />
                    <Scatter name="Assets" data={assetPoints} shape={<AssetDot />} />
                    <Scatter name="Optimal" data={[optPoint]} shape={<OptimalDot />} />
                    <Legend formatter={(value) => (
                      <span style={{ color: 'var(--muted)', fontSize: '11px' }}>{value}</span>
                    )} />
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* ── Allocation tab ────────────────────────────── */}
          {activeTab === 'allocation' && (
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'hsla(240,10%,5.5%,0.6)', border: '1px solid var(--border)' }}>
              <div className="p-5 pb-0">
                <h3 className="text-xs font-bold uppercase tracking-widest mb-1"
                  style={{ color: 'var(--muted)' }}>
                  Allocation Table
                </h3>
                {!result && (
                  <p className="text-xs mb-4" style={{ color: 'var(--muted)', opacity: 0.7 }}>
                    Run optimization to see allocations
                  </p>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Asset', 'Name', 'Ann. Return', 'Volatility', 'Optimal Wt', 'Bar'].map((col) => (
                        <th key={col}
                          className="text-left px-5 py-3 text-xs font-bold uppercase tracking-widest"
                          style={{ color: 'var(--muted)' }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((asset, idx) => {
                      const weight = optimizedWeights ? optimizedWeights[idx] : null;
                      const stats = assetStats[asset.ticker];
                      const color = getAssetColor(asset.ticker, idx);
                      return (
                        <tr key={asset.id} style={{ borderBottom: '1px solid var(--border)' }}
                          className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                              <span className="text-xs font-bold"
                                style={{ fontFamily: 'var(--font-mono)', color: 'var(--foreground)' }}>
                                {asset.ticker}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-xs" style={{ color: 'var(--muted)' }}>
                            {getAssetName(asset.ticker)}
                          </td>
                          <td className="px-5 py-3 text-xs font-bold"
                            style={{
                              fontFamily: 'var(--font-mono)',
                              color: stats
                                ? (stats.annRet >= 0 ? 'var(--green)' : 'var(--red)')
                                : 'var(--muted)',
                            }}>
                            {stats ? `${(stats.annRet * 100).toFixed(1)}%` : '—'}
                          </td>
                          <td className="px-5 py-3 text-xs font-bold"
                            style={{ fontFamily: 'var(--font-mono)', color: 'hsl(40 100% 60%)' }}>
                            {stats ? `${(stats.annVol * 100).toFixed(1)}%` : '—'}
                          </td>
                          <td className="px-5 py-3 text-xs font-bold"
                            style={{
                              fontFamily: 'var(--font-mono)',
                              color: weight !== null ? 'var(--accent-dark)' : 'var(--muted)',
                            }}>
                            {weight !== null ? `${weight.toFixed(1)}%` : '—'}
                          </td>
                          <td className="px-5 py-3 w-40">
                            {weight !== null && (
                              <div className="h-2 rounded-full" style={{ background: 'var(--border)' }}>
                                <div className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(weight, 100)}%`, background: color }} />
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Compare tab ───────────────────────────────── */}
          {activeTab === 'compare' && (
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'hsla(240,10%,5.5%,0.6)', border: '1px solid var(--border)' }}>
              <div className="p-5 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-widest mb-1"
                  style={{ color: 'var(--muted)' }}>
                  Algorithm Comparison
                </h3>
                <p className="text-xs" style={{ color: 'var(--muted)', opacity: 0.7 }}>
                  {benchmark
                    ? 'All 12 algorithms on the same portfolio — click a row to select that method, a header to sort.'
                    : 'Run optimization to benchmark all 12 algorithms side by side.'}
                </p>
              </div>
              {!benchmark ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <BarChart3 size={36} style={{ color: 'var(--accent-dark)', opacity: 0.4 }} />
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    No benchmark yet
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {([
                          ['name', 'Method', 'left'],
                          ['ret', 'Return', 'right'],
                          ['vol', 'Volatility', 'right'],
                          ['sharpe', 'Sharpe', 'right'],
                          ['sortino', 'Sortino', 'right'],
                          ['maxDD', 'Max DD', 'right'],
                          ['elapsedUs', 'Compute', 'right'],
                        ] as [SortKey, string, 'left' | 'right'][]).map(([key, label, align]) => (
                          <th key={key}
                            onClick={() => toggleSort(key)}
                            className="px-5 py-3 text-xs font-bold uppercase tracking-widest cursor-pointer select-none hover:opacity-80"
                            style={{
                              color: sortKey === key ? 'var(--accent-dark)' : 'var(--muted)',
                              textAlign: align,
                            }}>
                            {label}
                            {sortKey === key ? (sortDir === 'desc' ? ' ▼' : ' ▲') : ''}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedBenchmark.map((row) => {
                        const isActive = row.method === method;
                        const isBest = row.sharpe === bestSharpe;
                        return (
                          <tr key={row.method}
                            onClick={() => {
                              setMethod(row.method as Method);
                              applyRow(row, benchElapsedMs);
                              setActiveTab('results');
                            }}
                            className="cursor-pointer transition-colors hover:bg-white/[0.03]"
                            style={{
                              borderBottom: '1px solid var(--border)',
                              background: isActive ? 'hsla(245,72%,60%,0.12)' : 'transparent',
                            }}>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <span style={{ color: 'hsl(50 100% 60%)', width: 12, fontSize: 11 }}>
                                  {isBest ? '★' : ''}
                                </span>
                                <span className="text-xs font-bold"
                                  style={{ color: isActive ? 'var(--accent-dark)' : 'var(--foreground)' }}>
                                  {row.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-right text-xs font-bold"
                              style={{
                                fontFamily: 'var(--font-mono)',
                                color: row.ret >= 0 ? 'var(--green)' : 'var(--red)',
                              }}>
                              {(row.ret * 100).toFixed(1)}%
                            </td>
                            <td className="px-5 py-3 text-right text-xs"
                              style={{ fontFamily: 'var(--font-mono)', color: 'hsl(40 100% 60%)' }}>
                              {(row.vol * 100).toFixed(1)}%
                            </td>
                            <td className="px-5 py-3 text-right text-xs font-bold"
                              style={{
                                fontFamily: 'var(--font-mono)',
                                color: isBest ? 'hsl(50 100% 60%)' : 'var(--foreground)',
                              }}>
                              {row.sharpe.toFixed(2)}
                            </td>
                            <td className="px-5 py-3 text-right text-xs"
                              style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
                              {row.sortino.toFixed(2)}
                            </td>
                            <td className="px-5 py-3 text-right text-xs"
                              style={{ fontFamily: 'var(--font-mono)', color: 'var(--red)' }}>
                              {(row.maxDD * 100).toFixed(1)}%
                            </td>
                            <td className="px-5 py-3 text-right text-xs"
                              style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
                              {row.elapsedUs} µs
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="px-5 py-3 flex items-center gap-2 text-xs"
                    style={{ borderTop: '1px solid var(--border)', color: 'var(--muted)' }}>
                    <span style={{ color: 'hsl(50 100% 60%)' }}>★</span>
                    Best Sharpe ratio · compute time measured in the Rust backend
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
