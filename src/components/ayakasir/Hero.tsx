"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AyaKasirCopyType } from "@/lib/ayakasir-content";

export default function AyaKasirHero({
  copy,
  locale,
}: {
  copy: AyaKasirCopyType;
  locale: string;
}) {
  const words = copy.hero.typingWords;
  const [wordIndex, setWordIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [phase, setPhase] = useState<"typing" | "pause" | "deleting">("typing");

  useEffect(() => {
    const target = words[wordIndex];

    if (phase === "typing") {
      if (displayed.length < target.length) {
        const t = setTimeout(() => setDisplayed(target.slice(0, displayed.length + 1)), 70);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setPhase("pause"), 1400);
        return () => clearTimeout(t);
      }
    }

    if (phase === "pause") {
      const t = setTimeout(() => setPhase("deleting"), 400);
      return () => clearTimeout(t);
    }

    if (phase === "deleting") {
      if (displayed.length > 0) {
        const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 40);
        return () => clearTimeout(t);
      } else {
        setWordIndex((i) => (i + 1) % words.length);
        setPhase("typing");
      }
    }
  }, [displayed, phase, wordIndex, words]);

  return (
    <section className="section reveal page-top ayakasir-hero">
      <div className="ayakasir-hero-inner">
        <div className="ayakasir-hero-text">
          <span className="eyebrow">{copy.hero.eyebrow}</span>
          <h1 className="title ayakasir-hero-title">
            {copy.hero.titlePrefix}
            <span className="ayakasir-typing-word">
              {displayed}
              <span className="ayakasir-cursor">|</span>
            </span>
            </h1>
          <h1 className="title ayakasir-hero-title ayakasir-hero-title-suffix">
            {copy.hero.titleSuffix}
          </h1>
          <p className="subtitle ayakasir-hero-subtitle">{copy.hero.subtitle}</p>
          <div className="project-links">
            <a
              className="button primary ayakasir-btn-primary"
              href="https://play.google.com/store/apps/details?id=com.ayakasir.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              {copy.hero.ctaPlayStore}
            </a>
            <Link
              className="button ghost"
              href={`/${locale}/app/register`}
            >
              {copy.hero.ctaLogin}
            </Link>
          </div>
        </div>
        <div className="ayakasir-hero-illo" aria-hidden="true">
          <HeroIllo />
        </div>
      </div>
    </section>
  );
}

function HeroIllo() {
  return (
    <svg viewBox="0 0 340 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="ayakasir-hero-svg">
      <defs>
        <filter id="heroShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#1D72E9" floodOpacity="0.13"/>
        </filter>
        <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000" floodOpacity="0.09"/>
        </filter>
      </defs>

      {/* ── Background shape ── */}
      <ellipse cx="175" cy="165" rx="148" ry="128" fill="#eef3fe" opacity="0.7"/>
      <ellipse cx="260" cy="80" rx="50" ry="50" fill="#e6f4ea" opacity="0.5"/>

      {/* ── Decorative dots ── */}
      <circle cx="38" cy="56" r="6" fill="#1D72E9" opacity="0.12"/>
      <circle cx="298" cy="240" r="9" fill="#37A454" opacity="0.14"/>
      <circle cx="22" cy="230" r="4" fill="#1D72E9" opacity="0.1"/>
      <circle cx="316" cy="90" r="5" fill="#37A454" opacity="0.14"/>
      <circle cx="310" cy="200" r="3.5" fill="#1D72E9" opacity="0.1"/>

      {/* ── Phone body ── */}
      <rect x="105" y="28" width="98" height="178" rx="18" fill="#1e2230" filter="url(#heroShadow)"/>
      <rect x="112" y="42" width="84" height="152" rx="11" fill="#f0f4ff"/>
      {/* Notch pill */}
      <rect x="135" y="33" width="38" height="7" rx="3.5" fill="#111827"/>
      {/* Home indicator */}
      <rect x="140" y="199" width="28" height="4" rx="2" fill="#2d3346"/>

      {/* ── Screen: App bar ── */}
      <rect x="112" y="42" width="84" height="16" rx="11" fill="#1D72E9" opacity="0.13"/>
      <text x="154" y="53" textAnchor="middle" fontSize="7.5" fill="#1D72E9" fontWeight="700">AyaKasir</text>

      {/* ── Screen: Stats ── */}
      <rect x="115" y="62" width="37" height="24" rx="6" fill="white"/>
      <rect x="156" y="62" width="37" height="24" rx="6" fill="white"/>
      <text x="133" y="71" textAnchor="middle" fontSize="5" fill="#9ca3af">Penjualan</text>
      <text x="133" y="81" textAnchor="middle" fontSize="7.5" fill="#1D72E9" fontWeight="700">1.4jt</text>
      <text x="174" y="71" textAnchor="middle" fontSize="5" fill="#9ca3af">Transaksi</text>
      <text x="174" y="81" textAnchor="middle" fontSize="7.5" fill="#37A454" fontWeight="700">52</text>

      {/* ── Screen: Product grid ── */}
      <rect x="115" y="91" width="36" height="36" rx="8" fill="#e8f0fe"/>
      <rect x="155" y="91" width="36" height="36" rx="8" fill="#e6f4ea"/>
      <rect x="115" y="131" width="36" height="36" rx="8" fill="#e6f4ea"/>
      <rect x="155" y="131" width="36" height="36" rx="8" fill="#e8f0fe"/>
      <text x="133" y="114" textAnchor="middle" fontSize="16">☕</text>
      <text x="173" y="114" textAnchor="middle" fontSize="16">🍜</text>
      <text x="133" y="154" textAnchor="middle" fontSize="16">🥤</text>
      <text x="173" y="154" textAnchor="middle" fontSize="16">🍱</text>

      {/* ── Screen: Checkout button ── */}
      <rect x="115" y="172" width="78" height="17" rx="7" fill="#1D72E9"/>
      <text x="154" y="184" textAnchor="middle" fontSize="7.5" fill="white" fontWeight="700">Bayar Rp 48.000</text>

      {/* ── Floating card: Payment success (top-right, floats up) ── */}
      <g className="ayakasir-hero-float-1">
        <rect x="200" y="52" width="122" height="62" rx="14" fill="white" filter="url(#cardShadow)"/>
        <circle cx="224" cy="75" r="14" fill="#e6f4ea"/>
        <path d="M217 75 l5 5 9-9" stroke="#37A454" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
        <text x="242" y="68" fontSize="8.5" fill="#111827" fontWeight="700">Pembayaran</text>
        <text x="242" y="80" fontSize="8.5" fill="#37A454" fontWeight="600">Berhasil! ✓</text>
        <text x="242" y="100" fontSize="7" fill="#9ca3af">QRIS · Rp 48.000</text>
      </g>

      {/* ── Floating card: Low stock alert (bottom-left, floats slightly) ── */}
      <g className="ayakasir-hero-float-2">
        <rect x="8" y="152" width="108" height="54" rx="14" fill="white" filter="url(#cardShadow)"/>
        <circle cx="30" cy="173" r="13" fill="#fef2f2"/>
        <path d="M30 165 L30 180 M30 189 L30 190" stroke="#f72b07" strokeWidth="2.8" strokeLinecap="round"/>
        <text x="30" y="178" textAnchor="middle" fontSize="13">📦</text>
        <text x="48" y="165" fontSize="7.5" fill="#111827" fontWeight="700">Stok Rendah</text>
        <text x="48" y="176" fontSize="6.5" fill="#dc2626">Beras — 2 kg lagi</text>
        <rect x="48" y="181" width="58" height="11" rx="5.5" fill="#e8f0fe"/>
        <text x="77" y="190" textAnchor="middle" fontSize="6.5" fill="#1D72E9" fontWeight="600">Beli sekarang →</text>
      </g>

      {/* ── Floating card: Sync badge (bottom-right, floats) ── */}
      <g className="ayakasir-hero-float-3">
        <rect x="208" y="186" width="118" height="42" rx="14" fill="white" filter="url(#cardShadow)"/>
        <circle cx="228" cy="207" r="11" fill="#eef3fe"/>
        {/* Mini sync icon spinning */}
        <g className="ayakasir-sync-icon-spin" style={{transformOrigin: "228px 207px"}}>
          <path d="M221 207a7 7 0 0112.5-4.3" stroke="#1D72E9" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
          <path d="M235 207a7 7 0 01-12.5 4.3" stroke="#37A454" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
          <path d="M233 201.5l1 2.5-2.5.3" stroke="#1D72E9" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <path d="M223 212.5l-1-2.5 2.5-.3" stroke="#37A454" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </g>
        <text x="244" y="203" fontSize="7.5" fill="#111827" fontWeight="700">Auto Sync</text>
        <text x="244" y="215" fontSize="7" fill="#9ca3af">Android ↔ Web</text>
        {/* Pulsing dot */}
        <circle cx="318" cy="207" r="5" fill="#37A454" opacity="0.25" className="ayakasir-sync-ring"/>
        <circle cx="318" cy="207" r="3" fill="#37A454"/>
      </g>

      {/* ── Floating particles ── */}
      <circle cx="88" cy="100" r="3" fill="#1D72E9" opacity="0.2" className="ayakasir-hero-particle-1"/>
      <circle cx="278" cy="160" r="2.5" fill="#37A454" opacity="0.25" className="ayakasir-hero-particle-2"/>
      <circle cx="76" cy="250" r="2" fill="#37A454" opacity="0.2" className="ayakasir-hero-particle-1"/>
    </svg>
  );
}
