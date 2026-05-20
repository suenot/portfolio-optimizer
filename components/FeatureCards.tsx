'use client';

import { useState } from 'react';
import {
  TrendingUp,
  ShieldCheck,
  BarChart3,
  Clock,
  PieChart,
  Activity,
} from 'lucide-react';

const features = [
  {
    icon: TrendingUp,
    title: 'Portfolio Optimizer',
    description:
      'Apply state-of-the-art mean-variance optimization to build portfolios that maximize risk-adjusted returns.',
  },
  {
    icon: ShieldCheck,
    title: 'Risk Analysis',
    description:
      'Deep-dive into portfolio risk metrics including VaR, CVaR, beta, and tail risk to understand your exposure.',
  },
  {
    icon: BarChart3,
    title: 'Sharpe Ratio',
    description:
      'Instantly calculate and compare Sharpe, Sortino, and Calmar ratios across different allocation strategies.',
  },
  {
    icon: Clock,
    title: 'Backtesting',
    description:
      'Validate optimization strategies against historical data with realistic transaction cost assumptions.',
  },
  {
    icon: PieChart,
    title: 'Asset Allocation',
    description:
      'Visualize optimal asset weights with interactive pie charts and compare current vs. target allocations.',
  },
  {
    icon: Activity,
    title: 'Real-time Monitoring',
    description:
      'Track portfolio drift, rebalancing triggers, and performance attribution in a live dashboard.',
  },
];

export default function FeatureCards() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {features.map((f, idx) => {
        const Icon = f.icon;
        const isHovered = hoveredIdx === idx;
        return (
          <div
            key={f.title}
            className="relative p-6 rounded-2xl transition-all duration-300"
            style={{
              background: 'hsla(240,10%,5.5%,0.4)',
              border: isHovered
                ? '1px solid hsla(245,72%,60%,0.4)'
                : '1px solid var(--border)',
              backdropFilter: 'blur(12px)',
              boxShadow: isHovered ? '0 0 30px hsla(245,72%,60%,0.1)' : 'none',
              transform: isHovered ? 'scale(1.02) translateY(-4px)' : 'none',
            }}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{
                background: 'hsla(245,72%,60%,0.15)',
                border: '1px solid hsla(245,72%,60%,0.2)',
              }}
            >
              <Icon size={22} style={{ color: 'var(--accent-dark)' }} />
            </div>
            <h3
              className="text-base font-bold uppercase tracking-wider mb-2"
              style={{ color: 'var(--foreground)' }}
            >
              {f.title}
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              {f.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
