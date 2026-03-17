import { Fragment } from "react";
import type { CSSProperties } from "react";
import { getAyaKasirCopy } from "@/lib/ayakasir-content";
import AyaKasirHero from "@/components/ayakasir/Hero";
import MetricCounter from "@/components/ayakasir/MetricCounter";
import { createServerClient } from "@/lib/supabase/server";

export const revalidate = 3600;

type AyaKasirMetrics = {
  tenants: number;
  provinces: number;
  cities: number;
  transactions: number;
};

async function getAyaKasirMetrics(): Promise<AyaKasirMetrics> {
  try {
    const supabase = createServerClient();
    const [tenantRes, transactionRes, locationRes] = await Promise.all([
      supabase.from("tenants").select("id", { count: "exact", head: true }),
      supabase.from("transactions").select("id", { count: "exact", head: true }),
      supabase.from("tenants").select("province, city")
    ]);

    const provinces = new Set(
      (locationRes.data ?? [])
        .map((row) => row.province?.trim())
        .filter((value): value is string => Boolean(value))
    );
    const cities = new Set(
      (locationRes.data ?? [])
        .map((row) => row.city?.trim())
        .filter((value): value is string => Boolean(value))
    );

    return {
      tenants: tenantRes.count ?? 0,
      provinces: provinces.size,
      cities: cities.size,
      transactions: transactionRes.count ?? 0
    };
  } catch {
    return {
      tenants: 0,
      provinces: 0,
      cities: 0,
      transactions: 0
    };
  }
}

export function generateMetadata({ params }: { params: { locale: string } }) {
  const copy = getAyaKasirCopy(params.locale);
  return {
    title: copy.appName,
    description: copy.hero.subtitle
  };
}

export default async function AyaKasirLandingPage({
  params
}: {
  params: { locale: string };
}) {
  const copy = getAyaKasirCopy(params.locale);
  const metrics = await getAyaKasirMetrics();
  const metricValues = [
    metrics.tenants,
    metrics.provinces,
    metrics.cities,
    metrics.transactions
  ];
  const metricAccents = ["#1D72E9", "#37A454", "#1D72E9", "#37A454"];

  return (
    <>
      {/* Hero */}
      <AyaKasirHero copy={copy} locale={params.locale} />

      {/* Features */}
      <section className="section reveal delay-1">
        <span className="eyebrow">{copy.features.eyebrow}</span>
        <h2 className="title">{copy.features.title}</h2>

        {/* Sync badge */}
        <div className="ayakasir-sync-badge reveal delay-2">
          <SyncIcon />
          <span>{params.locale === "id"
            ? "Sinkron otomatis antara Android & web — real-time, tanpa repot."
            : "Auto-synced between Android & web — real-time, zero hassle."
          }</span>
        </div>

        {/*
          6 cards in a 3×2 grid on desktop.
          Arrows:  card 0→1 (right), card 1→2 (right),
                   card 2→3 (down, at end of row 1 / start of row 2),
                   card 3→4 (right), card 4→5 (right).
          On mobile the grid collapses to 1 column and arrows point down.
        */}
        <div className="ayakasir-features-flow">
          {copy.features.items.map((feature, index) => {
            // Right arrows between cards in same row: 0→1, 1→2, 3→4, 4→5
            const showRight = index === 0 || index === 1 || index === 3 || index === 4;
            const isLast = index === copy.features.items.length - 1;

            return (
              <Fragment key={index}>
                <div className="ayakasir-feature-step reveal" style={{ animationDelay: `${0.08 * index}s` }}>
                  <div className="ayakasir-feature-illo">
                    {featureIllustrations[index]}
                  </div>
                  <div className="ayakasir-feature-content">
                    <div className="ayakasir-feature-step-num">{`0${index + 1}`}</div>
                    <strong className="ayakasir-feature-title">{feature.title}</strong>
                    <p className="ayakasir-feature-desc">{feature.description}</p>
                  </div>

                  {/* Right arrow — between same-row cards */}
                  {showRight && (
                    <div className="ayakasir-feature-arrow">
                      <ArrowRightDash />
                    </div>
                  )}

                  {/* Mobile-only down arrow between every card except last */}
                  {!isLast && (
                    <div className="ayakasir-feature-arrow--mobile-down">
                      <ArrowDownDash />
                    </div>
                  )}
                </div>

                {/* Row-turn connector after card 3 (index 2): spans all 3 cols */}
                {index === 2 && (
                  <div key="row-connector" className="ayakasir-row-connector" aria-hidden="true">
                    <svg viewBox="0 0 960 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="ayakasir-row-turn-svg" preserveAspectRatio="none">
                      <path d="M800 0 L800 30 L150 30 L150 50" stroke="#1D72E9" stroke-width="1.8" stroke-dasharray="6 4" stroke-linecap="round" fill="none" opacity="0.5"></path>
                      <path d="M795 10 L800 20 L805 10" stroke="#1D72E9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.7"></path>
                      <path d="M145 45 L150 55 L155 45" stroke="#1D72E9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.7"></path>
                    </svg>
                    {/* <RowTurnArrow /> */}
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>

        {/* Cross-platform illustration */}
        <div className="ayakasir-crossplatform reveal delay-3">
          <CrossPlatformIllo />
          <p className="ayakasir-crossplatform-label">
            {params.locale === "id"
              ? "Tersedia di Android — kelola dari mana saja lewat dashboard web."
              : "Available on Android — manage anywhere via the web dashboard."
            }
          </p>
        </div>
      </section>

      {/* Metrics */}
      <section className="section reveal delay-2 ayakasir-metrics-section">
        <span className="eyebrow">{copy.metrics.eyebrow}</span>
        <h2 className="title">{copy.metrics.title}</h2>
        <p className="subtitle ayakasir-metrics-subtitle">
          {copy.metrics.subtitle}
        </p>
        <div className="ayakasir-metrics-grid">
          {copy.metrics.items.map((metric, index) => {
            const metricStyle = {
              animationDelay: `${0.08 * index}s`,
              "--metric-accent": metricAccents[index % metricAccents.length]
            } as CSSProperties;

            return (
              <div
                key={metric.label}
                className="ayakasir-metric-card reveal"
                style={metricStyle}
              >
              <MetricCounter
                value={metricValues[index] ?? 0}
                locale={params.locale}
                className="ayakasir-metric-value"
              />
              <div className="ayakasir-metric-label">{metric.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Simulator CTA */}
      <section className="section reveal delay-2" style={{ textAlign: "center" }}>
        <span className="eyebrow">{copy.simulator.eyebrow}</span>
        <h2 className="title">{copy.simulator.title}</h2>
        <p className="subtitle" style={{ margin: "0 auto" }}>
          {copy.simulator.subtitle}
        </p>
        <div className="project-links" style={{ justifyContent: "center" }}>
          <a
            className="button primary ayakasir-btn-primary"
            href={`/${params.locale}/simulator`}
          >
            {copy.simulator.cta}
          </a>
        </div>
      </section>
    </>
  );
}

// ── Feature Illustrations (flat SVG) ─────────────────────────────

const featureIllustrations = [
  /* 0 Purchasing */
  <svg key="purchasing" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="ayakasir-illo-svg">
    <rect x="10" y="20" width="100" height="65" rx="10" fill="#e8f0fe"/>
    <rect x="22" y="35" width="76" height="8" rx="4" fill="#1D72E9" opacity="0.3"/>
    <rect x="22" y="49" width="50" height="8" rx="4" fill="#1D72E9" opacity="0.2"/>
    <rect x="22" y="63" width="60" height="8" rx="4" fill="#37A454" opacity="0.3"/>
    <rect x="35" y="5" width="50" height="20" rx="6" fill="#1D72E9"/>
    <text x="60" y="19" textAnchor="middle" fontSize="10" fill="white" fontWeight="700">VENDOR</text>
    <circle cx="95" cy="72" r="12" fill="#37A454"/>
    <path d="M89 72l4 4 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>,

  /* 1 Inventory */
  <svg key="inventory" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="ayakasir-illo-svg">
    <rect x="15" y="55" width="22" height="35" rx="4" fill="#1D72E9" opacity="0.8"/>
    <rect x="43" y="40" width="22" height="50" rx="4" fill="#1D72E9"/>
    <rect x="71" y="25" width="22" height="65" rx="4" fill="#37A454"/>
    <rect x="15" y="10" width="90" height="3" rx="2" fill="#e5e7eb"/>
    <circle cx="26" cy="52" r="5" fill="#1D72E9"/>
    <circle cx="54" cy="37" r="5" fill="#1D72E9"/>
    <circle cx="82" cy="22" r="5" fill="#37A454"/>
    <path d="M26 52 L54 37 L82 22" stroke="#1D72E9" strokeWidth="2" strokeDasharray="4 2"/>
    <rect x="85" y="12" width="22" height="10" rx="5" fill="#37A454" opacity="0.15"/>
    <text x="96" y="20" textAnchor="middle" fontSize="7" fill="#37A454" fontWeight="700">+12%</text>
  </svg>,

  /* 2 Menu & Products */
  <svg key="menu" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="ayakasir-illo-svg">
    <rect x="10" y="10" width="45" height="55" rx="8" fill="#e8f0fe"/>
    <rect x="65" y="10" width="45" height="55" rx="8" fill="#e6f4ea"/>
    <circle cx="32" cy="32" r="10" fill="#1D72E9" opacity="0.5"/>
    <rect x="18" y="46" width="30" height="5" rx="2.5" fill="#1D72E9" opacity="0.4"/>
    <rect x="18" y="54" width="20" height="4" rx="2" fill="#1D72E9" opacity="0.25"/>
    <circle cx="87" cy="32" r="10" fill="#37A454" opacity="0.5"/>
    <rect x="72" y="46" width="30" height="5" rx="2.5" fill="#37A454" opacity="0.4"/>
    <rect x="72" y="54" width="20" height="4" rx="2" fill="#37A454" opacity="0.25"/>
    <rect x="20" y="72" width="80" height="20" rx="8" fill="#1D72E9"/>
    <text x="60" y="86" textAnchor="middle" fontSize="9" fill="white" fontWeight="600">+ Add Variant</text>
  </svg>,

  /* 3 Customers & Debt */
  <svg key="customers" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="ayakasir-illo-svg">
    <circle cx="40" cy="38" r="18" fill="#e8f0fe"/>
    <circle cx="40" cy="30" r="9" fill="#1D72E9" opacity="0.6"/>
    <path d="M22 52 Q40 44 58 52" stroke="#1D72E9" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6"/>
    <rect x="62" y="20" width="48" height="16" rx="8" fill="#fef2f2"/>
    <text x="86" y="31" textAnchor="middle" fontSize="9" fill="#dc2626" fontWeight="600">Rp 50rb</text>
    <rect x="62" y="42" width="48" height="16" rx="8" fill="#fef2f2"/>
    <text x="86" y="53" textAnchor="middle" fontSize="9" fill="#dc2626" fontWeight="600">Rp 75rb</text>
    <rect x="62" y="64" width="48" height="18" rx="9" fill="#37A454"/>
    <text x="86" y="76" textAnchor="middle" fontSize="9" fill="white" fontWeight="700">Lunas ✓</text>
  </svg>,

  /* 4 Cashier POS */
  <svg key="pos" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="ayakasir-illo-svg">
    <rect x="30" y="8" width="60" height="84" rx="10" fill="#1a1d26"/>
    <rect x="35" y="18" width="50" height="60" rx="6" fill="#e8f0fe"/>
    <rect x="39" y="22" width="42" height="24" rx="4" fill="#1D72E9" opacity="0.15"/>
    <rect x="39" y="50" width="18" height="8" rx="3" fill="#1D72E9" opacity="0.3"/>
    <rect x="61" y="50" width="20" height="8" rx="3" fill="#37A454" opacity="0.4"/>
    <rect x="39" y="62" width="42" height="10" rx="4" fill="#37A454"/>
    <text x="60" y="70" textAnchor="middle" fontSize="8" fill="white" fontWeight="700">BAYAR</text>
    <circle cx="60" cy="84" r="4" fill="#333"/>
    <circle cx="87" cy="55" r="13" fill="#37A454"/>
    <path d="M81 55l4 4 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>,

  /* 5 Dashboard & Reports */
  <svg key="dashboard" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="ayakasir-illo-svg">
    <rect x="8" y="8" width="104" height="84" rx="10" fill="#f5f6fa"/>
    <rect x="8" y="8" width="28" height="84" rx="10" fill="#1D72E9" opacity="0.08"/>
    <circle cx="22" cy="28" r="5" fill="#1D72E9" opacity="0.5"/>
    <circle cx="22" cy="44" r="5" fill="#1D72E9" opacity="0.3"/>
    <circle cx="22" cy="60" r="5" fill="#1D72E9" opacity="0.3"/>
    <circle cx="22" cy="76" r="5" fill="#1D72E9" opacity="0.2"/>
    <rect x="44" y="16" width="60" height="18" rx="6" fill="white"/>
    <rect x="50" y="22" width="30" height="5" rx="2.5" fill="#1D72E9" opacity="0.4"/>
    <rect x="44" y="40" width="27" height="26" rx="6" fill="white"/>
    <rect x="77" y="40" width="27" height="26" rx="6" fill="white"/>
    <rect x="49" y="54" width="17" height="8" rx="2" fill="#37A454" opacity="0.5"/>
    <rect x="82" y="50" width="17" height="12" rx="2" fill="#1D72E9" opacity="0.4"/>
    <rect x="44" y="72" width="60" height="12" rx="6" fill="white"/>
    <rect x="50" y="76" width="40" height="4" rx="2" fill="#e5e7eb"/>
  </svg>,
];

// ── Arrow Icons ─────────────────────────────────────────────────────

function ArrowRightDash() {
  return (
    <svg viewBox="0 0 40 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="16">
      <path d="M2 8 H32" stroke="#1D72E9" strokeWidth="1.8" strokeDasharray="4 3" strokeLinecap="round"/>
      <path d="M28 3 L36 8 L28 13" stroke="#1D72E9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function ArrowDownDash() {
  return (
    <svg viewBox="0 0 16 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="40">
      <path d="M8 2 V30" stroke="#1D72E9" strokeWidth="1.8" strokeDasharray="4 3" strokeLinecap="round"/>
      <path d="M3 26 L8 36 L13 26" stroke="#1D72E9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

// U-turn connector: right side of row 1 → curves down → left side of row 2
function RowTurnArrow() {
  return (
    <svg
      viewBox="0 315 960 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="ayakasir-row-turn-svg"
      preserveAspectRatio="none"
    >
      {/* Line from right of col 3 down and across to left of col 1 */}
      <path
        d="M800 0 L800 30 L150 30 L150 50"
        stroke="#1D72E9"
        strokeWidth="1.8"
        strokeDasharray="6 4"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      {/* Arrow head pointing down at the start (right side) */}
      <path d="M795 25 L800 30 L805 25" stroke="#1D72E9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7"/>
      {/* Arrow head pointing right at the end (left side, pointing into row 2) */}
      <path d="M145 30 L150 35 L155 30" stroke="#1D72E9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7"/>
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
      <path d="M3 10a7 7 0 0113.3-3.1M17 10a7 7 0 01-13.3 3.1" stroke="#1D72E9" strokeWidth="2" strokeLinecap="round"/>
      <path d="M16 6.5l.7-2.5 2.3 1" stroke="#1D72E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 13.5l-.7 2.5-2.3-1" stroke="#1D72E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Cross-platform illustration (animated) ───────────────────────

function CrossPlatformIllo() {
  return (
    <svg viewBox="0 0 380 210" fill="none" xmlns="http://www.w3.org/2000/svg" className="ayakasir-crossplatform-svg" role="img" aria-label="Android app syncing with web dashboard">
      <defs>
        <linearGradient id="cpGloss" x1="284" y1="48" x2="354" y2="138" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.6"/>
          <stop offset="1" stopColor="white" stopOpacity="0"/>
        </linearGradient>
        <filter id="cpShadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="#1D72E9" floodOpacity="0.12"/>
        </filter>
      </defs>

      {/* ── Background blobs ── */}
      <ellipse cx="84" cy="105" rx="76" ry="76" fill="#e8f0fe" opacity="0.45"/>
      <ellipse cx="296" cy="105" rx="76" ry="76" fill="#e6f4ea" opacity="0.45"/>

      {/* ── Phone (Android) ── */}
      <rect x="20" y="22" width="76" height="134" rx="14" fill="#1e2230" filter="url(#cpShadow)"/>
      <rect x="27" y="35" width="62" height="100" rx="8" fill="#f0f4ff"/>
      <rect x="47" y="27" width="24" height="6" rx="3" fill="#111827"/>
      <circle cx="58" cy="145" r="5.5" fill="#2d3346"/>
      {/* App bar */}
      <rect x="27" y="35" width="62" height="14" rx="8" fill="#1D72E9" opacity="0.15"/>
      <text x="58" y="45" textAnchor="middle" fontSize="6.5" fill="#1D72E9" fontWeight="700">AyaKasir</text>
      {/* Stat cards */}
      <rect x="30" y="53" width="27" height="18" rx="4" fill="white"/>
      <rect x="61" y="53" width="28" height="18" rx="4" fill="white"/>
      <text x="43" y="60" textAnchor="middle" fontSize="4.5" fill="#9ca3af">Sales</text>
      <text x="43" y="68" textAnchor="middle" fontSize="6.5" fill="#1D72E9" fontWeight="700">1.4jt</text>
      <text x="75" y="60" textAnchor="middle" fontSize="4.5" fill="#9ca3af">Txn</text>
      <text x="75" y="68" textAnchor="middle" fontSize="6.5" fill="#37A454" fontWeight="700">52</text>
      {/* Product rows */}
      <rect x="30" y="76" width="59" height="7" rx="3" fill="#e8f0fe"/>
      <rect x="30" y="87" width="59" height="7" rx="3" fill="#e8f0fe"/>
      <rect x="30" y="98" width="42" height="7" rx="3" fill="#e6f4ea"/>
      {/* Checkout */}
      <rect x="28" y="111" width="59" height="15" rx="6" fill="#1D72E9"/>
      <text x="57" y="120" textAnchor="middle" fontSize="6" fill="white" fontWeight="700">Bayar</text>

      {/* Android label */}
      <rect x="22" y="162" width="72" height="18" rx="9" fill="#f3f4f6"/>
      <text x="58" y="175" textAnchor="middle" fontSize="8" fill="#374151" fontWeight="600">Android</text>

      {/* ── Connector lines (phone → hub) ── */}
      <line x1="98" y1="90" x2="158" y2="90" stroke="#1D72E9" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.4"/>
      <line x1="98" y1="110" x2="158" y2="110" stroke="#37A454" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.4"/>

      {/* ── Connector lines (hub → web) ── */}
      <line x1="212" y1="90" x2="278" y2="90" stroke="#1D72E9" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.4"/>
      <line x1="212" y1="110" x2="278" y2="110" stroke="#37A454" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.4"/>

      {/* ── Traveling data packets (left→right = upload to cloud) ── */}
      <circle r="4.5" fill="#1D72E9" opacity="0.85" className="ayakasir-sync-dot-r">
        <animateMotion dur="2.4s" repeatCount="indefinite" begin="0s">
          <mpath href="#pathRight1"/>
        </animateMotion>
      </circle>
      <path id="pathRight1" d="M98 90 L212 90 L278 90" stroke="none" fill="none"/>

      {/* ── Traveling data packets (right→left = dashboard → phone) ── */}
      <circle r="4.5" fill="#37A454" opacity="0.85" className="ayakasir-sync-dot-l">
        <animateMotion dur="2.4s" repeatCount="indefinite" begin="1.2s" keyPoints="1;0" keyTimes="0;1" calcMode="linear">
          <mpath href="#pathRight2"/>
        </animateMotion>
      </circle>
      <path id="pathRight2" d="M98 110 L212 110 L278 110" stroke="none" fill="none"/>

      {/* ── Center hub ── */}
      <circle cx="185" cy="100" r="28" fill="white" stroke="#e5e7eb" strokeWidth="1.5" filter="url(#cpShadow)"/>
      <circle cx="185" cy="100" r="21" fill="#eef3fe"/>
      <g className="ayakasir-sync-icon-spin" style={{transformOrigin: "185px 100px"}}>
        <path d="M176 100a9 9 0 0116-5.7" stroke="#1D72E9" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
        <path d="M194 100a9 9 0 01-16 5.7" stroke="#37A454" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
        <path d="M191 92l1.5 3-3.2.4" stroke="#1D72E9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M179 108l-1.5-3 3.2-.4" stroke="#37A454" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </g>
      <text x="185" y="144" textAnchor="middle" fontSize="7.5" fill="#1D72E9" fontWeight="700" letterSpacing="0.5">SYNC</text>

      {/* ── Web Dashboard ── */}
      <rect x="280" y="26" width="82" height="116" rx="10" fill="#f8fafc" stroke="#e5e7eb" strokeWidth="1.5" filter="url(#cpShadow)"/>
      {/* Browser chrome bar */}
      <rect x="280" y="26" width="82" height="18" rx="10" fill="#e9ecf0"/>
      <circle cx="292" cy="35" r="3.5" fill="#fc5f5f"/>
      <circle cx="302" cy="35" r="3.5" fill="#fdbc40"/>
      <circle cx="312" cy="35" r="3.5" fill="#34c759"/>
      <rect x="318" y="31" width="36" height="8" rx="4" fill="white" opacity="0.65"/>
      {/* Sidebar */}
      <rect x="282" y="46" width="18" height="92" rx="4" fill="#1D72E9" opacity="0.07"/>
      <circle cx="291" cy="57" r="4.5" fill="#1D72E9" opacity="0.45"/>
      <circle cx="291" cy="70" r="4.5" fill="#1D72E9" opacity="0.2"/>
      <circle cx="291" cy="83" r="4.5" fill="#1D72E9" opacity="0.15"/>
      <circle cx="291" cy="96" r="4.5" fill="#1D72E9" opacity="0.1"/>
      {/* Content cards */}
      <rect x="304" y="48" width="54" height="14" rx="4" fill="white"/>
      <rect x="307" y="53" width="24" height="4" rx="2" fill="#1D72E9" opacity="0.35"/>
      <rect x="304" y="66" width="24" height="22" rx="4" fill="white"/>
      <rect x="332" y="66" width="26" height="22" rx="4" fill="white"/>
      <rect x="307" y="76" width="18" height="8" rx="2" fill="#37A454" opacity="0.45"/>
      <rect x="335" y="71" width="20" height="12" rx="2" fill="#1D72E9" opacity="0.3"/>
      <rect x="304" y="92" width="54" height="9" rx="3" fill="white"/>
      <rect x="307" y="95" width="36" height="3" rx="1.5" fill="#e5e7eb"/>
      <rect x="304" y="105" width="54" height="9" rx="3" fill="white"/>
      <rect x="307" y="108" width="24" height="3" rx="1.5" fill="#e5e7eb"/>
      <rect x="304" y="118" width="54" height="16" rx="4" fill="#1D72E9" opacity="0.07"/>
      {/* Gloss overlay */}
      <rect x="280" y="44" width="82" height="98" fill="url(#cpGloss)" opacity="0.4"/>

      {/* Web label */}
      <rect x="284" y="148" width="74" height="18" rx="9" fill="#f3f4f6"/>
      <text x="321" y="161" textAnchor="middle" fontSize="8" fill="#374151" fontWeight="600">Web Dashboard</text>

      {/* ── Real-time badge at bottom center ── */}
      <rect x="140" y="178" width="100" height="24" rx="12" fill="#eef3fe" stroke="#c7d9fb" strokeWidth="1"/>
      <text x="190" y="193" textAnchor="middle" fontSize="8.5" fill="#1D72E9" fontWeight="600">Real-time sync</text>
    </svg>
  );
}
