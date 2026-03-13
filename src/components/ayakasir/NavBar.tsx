"use client";

import { useState } from "react";
import Link from "next/link";
import { AyaKasirCopyType } from "@/lib/ayakasir-content";

export default function AyaKasirNavBar({
  locale,
  copy
}: {
  locale: string;
  copy: AyaKasirCopyType;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="nav">
      <div className="nav-inner ayakasir-nav-inner">
        {/* Brand — always left */}
        <Link href={`/${locale}`} className="nav-brand ayakasir-brand">
          <span className="ayakasir-logo-text">AyaKasir</span>
        </Link>

        {/* Desktop nav links + lang switch — center/left */}
        <div className={`nav-menu${isOpen ? " is-open" : ""}`} id="ayakasir-nav-menu">
          <div className="nav-links">
            <Link href={`/${locale}/simulator`} onClick={() => setIsOpen(false)}>
              {copy.nav.simulator}
            </Link>
          </div>
          {/* Mobile only: lang switch + login inside menu */}
          <div className="nav-cta">
            <div className="lang-switch ayakasir-lang-switch">
              <Link href="/en" className={`ayakasir-lang-btn${locale === "en" ? " active" : ""}`}>EN</Link>
              <span className="ayakasir-lang-divider">|</span>
              <Link href="/id" className={`ayakasir-lang-btn${locale === "id" ? " active" : ""}`}>ID</Link>
            </div>
            <Link
              href={`/${locale}/app/login`}
              className="button primary ayakasir-btn-primary ayakasir-nav-login"
              onClick={() => setIsOpen(false)}
            >
              {copy.nav.login}
            </Link>
          </div>
        </div>

        {/* Desktop right side: lang switch + login + mobile toggle */}
        <div className="nav-actions">
          {/* Desktop lang switch */}
          <div className="lang-switch ayakasir-lang-switch ayakasir-desktop-only">
            <Link href="/en" className={`ayakasir-lang-btn${locale === "en" ? " active" : ""}`}>EN</Link>
            <span className="ayakasir-lang-divider">|</span>
            <Link href="/id" className={`ayakasir-lang-btn${locale === "id" ? " active" : ""}`}>ID</Link>
          </div>
          {/* Desktop login button — rightmost */}
          <Link
            href={`/${locale}/app/login`}
            className="button primary ayakasir-btn-primary ayakasir-nav-login ayakasir-desktop-only"
          >
            {copy.nav.login}
          </Link>
          {/* Mobile hamburger */}
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={isOpen}
            aria-controls="ayakasir-nav-menu"
            onClick={() => setIsOpen((o) => !o)}
          >
            Menu
          </button>
        </div>
      </div>
    </div>
  );
}
