import Link from 'next/link';
import { Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import FeatureCards from '@/components/FeatureCards';

function MMLogoSVG({ size = 48 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      width={size}
      height={size}
      style={{ fill: 'hsl(245 90% 82%)' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(0,1024) scale(0.1,-0.1)">
        <path d="M4815 9964 c-22 -2 -92 -9 -155 -14 -1263 -113 -2506 -762 -3284 -1714 -595 -729 -940 -1541 -1053 -2481 -22 -188 -26 -815 -5 -990 74 -626 245 -1198 509 -1705 501 -960 1276 -1694 2272 -2154 645 -298 1302 -439 2046 -438 757 0 1402 147 2070 471 491 238 899 521 1264 876 813 789 1298 1766 1438 2896 22 181 25 761 5 964 -58 577 -200 1087 -439 1585 -113 236 -184 361 -334 585 -180 270 -349 476 -574 701 -368 369 -746 646 -1200 880 -563 290 -1104 452 -1745 520 -146 15 -715 28 -815 18z m837 -559 c1134 -135 2191 -733 2857 -1615 188 -249 385 -590 511 -885 132 -306 245 -719 294 -1071 37 -264 48 -690 26 -939 -123 -1364 -861 -2559 -2003 -3243 -299 -179 -487 -266 -777 -362 -836 -277 -1714 -292 -2579 -44 -119 35 -322 102 -330 110 -2 2 52 63 120 135 519 553 1099 890 1714 996 73 12 159 17 320 18 300 0 359 -12 924 -184 129 -39 263 -78 298 -86 187 -43 308 9 510 218 161 168 253 322 253 425 0 76 -23 127 -156 349 -209 348 -358 662 -426 897 -15 54 -39 167 -53 250 -14 83 -39 196 -57 250 -83 264 -268 406 -580 447 -54 7 -95 16 -92 20 9 16 120 50 187 59 152 19 326 -17 779 -159 531 -166 733 -192 993 -126 178 45 317 127 445 261 71 76 177 230 165 242 -2 3 -26 -9 -52 -26 -64 -41 -147 -77 -252 -109 -78 -24 -102 -27 -256 -27 -139 -1 -191 3 -285 22 -203 41 -423 109 -725 227 -654 254 -862 292 -1215 220 -188 -38 -298 -48 -371 -35 -35 6 -128 38 -208 70 -266 106 -461 155 -716 181 -163 16 -480 6 -658 -21 -265 -40 -601 -137 -916 -265 -86 -35 -244 -99 -351 -143 -205 -83 -335 -122 -435 -129 -71 -5 -90 5 -81 40 8 33 99 147 209 262 48 50 87 95 87 100 0 20 -24 35 -58 35 -49 0 -145 -54 -317 -180 -237 -173 -308 -199 -451 -166 -151 34 -520 172 -614 228 -63 39 -88 70 -96 119 -10 59 13 113 101 236 171 240 249 360 299 463 l51 105 0 210 c1 265 10 301 128 475 102 152 288 355 495 543 l74 66 -59 58 c-68 67 -88 119 -81 208 6 68 40 115 118 162 89 54 172 77 280 76 52 0 120 -5 152 -12 l56 -12 144 75 c268 140 477 214 835 296 304 69 480 127 700 230 208 98 430 246 593 394 l95 87 155 -5 c85 -3 212 -13 282 -21z" />
      </g>
    </svg>
  );
}

const stats = [
  { value: '40+', label: 'Algorithms' },
  { value: '<100ms', label: 'Latency' },
  { value: '99.9%', label: 'Uptime' },
  { value: '10K+', label: 'Portfolios' },
];



export default function Home() {
  return (
    <div style={{ background: 'var(--background)' }}>
      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <section
        className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center overflow-hidden"
        style={{
          paddingTop: '96px',
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, hsla(245,72%,60%,0.18) 0%, transparent 70%)',
        }}
      >
        {/* Decorative grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-widest mb-8"
          style={{
            background: 'hsla(245,72%,60%,0.15)',
            border: '1px solid hsla(245,72%,60%,0.3)',
            color: 'var(--accent-dark)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: 'var(--green)' }}
          />
          Live · Powered by Modern Portfolio Theory
        </div>

        {/* Logo */}
        <div className="mb-6">
          <MMLogoSVG size={72} />
        </div>

        {/* Headline */}
        <h1 className="max-w-4xl text-5xl sm:text-6xl lg:text-7xl font-black leading-none tracking-tight mb-6">
          <span
            style={{
              background:
                'linear-gradient(135deg, hsl(0 0% 100%) 0%, var(--accent-dark) 60%, var(--accent) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Portfolio Optimization.
          </span>
          <br />
          <span style={{ color: 'var(--foreground)' }}>Powered by AI.</span>
        </h1>

        {/* Subtitle */}
        <p
          className="max-w-2xl text-lg sm:text-xl leading-relaxed mb-10"
          style={{ color: 'var(--muted)' }}
        >
          Harness cutting-edge algorithms — Max Sharpe, Min Variance, HRP,
          Black-Litterman — to build portfolios that stand up to real markets.
          No PhD required.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/optimizer"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold transition-all duration-200 hover:scale-105 hover:shadow-2xl"
            style={{
              background: 'var(--accent)',
              color: '#fff',
              boxShadow: '0 0 40px hsla(245,72%,60%,0.4)',
            }}
          >
            Open App <ArrowRight size={18} />
          </Link>
          <a
            href="#features"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold transition-all duration-200 hover:scale-105"
            style={{
              background: 'hsla(240,10%,8%,0.8)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
              backdropFilter: 'blur(12px)',
            }}
          >
            Learn More
          </a>
        </div>

        {/* Scroll hint */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{ color: 'var(--muted)' }}
        >
          <div
            className="w-px h-12 animate-pulse"
            style={{ background: 'linear-gradient(to bottom, transparent, var(--border))' }}
          />
        </div>
      </section>

      {/* ─── Stats Bar ────────────────────────────────────────────── */}
      <section
        className="py-8 px-6"
        style={{
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          background: 'var(--card)',
        }}
      >
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <span
                className="text-3xl font-black"
                style={{
                  background:
                    'linear-gradient(135deg, var(--foreground), var(--accent-dark))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {s.value}
              </span>
              <span
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'var(--muted)' }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────────────── */}
      <section
        id="features"
        className="py-24 px-6"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 50%, hsla(245,72%,60%,0.06) 0%, transparent 70%)',
        }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <p
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: 'var(--accent-dark)' }}
            >
              Core Capabilities
            </p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
              <span
                style={{
                  background:
                    'linear-gradient(135deg, var(--foreground) 0%, var(--accent-dark) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Everything you need
              </span>
            </h2>
            <p
              className="max-w-xl mx-auto text-lg"
              style={{ color: 'var(--muted)' }}
            >
              A complete suite of portfolio analytics tools built for serious
              investors and quants.
            </p>
          </div>

          {/* Feature grid */}
          <FeatureCards />
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────── */}
      <section
        className="py-24 px-6"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 50%, hsla(245,72%,60%,0.12) 0%, transparent 70%)',
          borderTop: '1px solid var(--border)',
        }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-widest mb-8"
            style={{
              background: 'hsla(245,72%,60%,0.15)',
              border: '1px solid hsla(245,72%,60%,0.3)',
              color: 'var(--accent-dark)',
            }}
          >
            <Zap size={12} />
            Get started in seconds
          </div>

          <h2
            className="text-4xl sm:text-5xl font-black tracking-tight mb-6"
            style={{
              background:
                'linear-gradient(135deg, var(--foreground) 0%, var(--accent-dark) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Start Optimizing Today
          </h2>

          <p
            className="text-lg leading-relaxed mb-10"
            style={{ color: 'var(--muted)' }}
          >
            No account needed. Add your assets, choose an optimization strategy,
            and see results instantly.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link
              href="/optimizer"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-base font-bold transition-all duration-200 hover:scale-105"
              style={{
                background: 'var(--accent)',
                color: '#fff',
                boxShadow: '0 0 50px hsla(245,72%,60%,0.4)',
              }}
            >
              Start Optimizing <ArrowRight size={18} />
            </Link>

            <ul className="flex flex-col sm:flex-row gap-4 text-sm" style={{ color: 'var(--muted)' }}>
              {['Free to use', 'No sign-up', 'Instant results'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 size={14} style={{ color: 'var(--green)' }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────── */}
      <footer
        className="py-8 px-6 text-center text-sm"
        style={{
          borderTop: '1px solid var(--border)',
          color: 'var(--muted)',
        }}
      >
        <p>
          &copy; {new Date().getFullYear()} marketmaker.cc · Portfolio Optimizer ·
          Built with Next.js &amp; Modern Portfolio Theory
        </p>
      </footer>
    </div>
  );
}
