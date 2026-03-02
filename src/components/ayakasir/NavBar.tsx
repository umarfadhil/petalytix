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
      <div className="nav-inner">
        <div className="nav-bar">
          <Link href={`/${locale}`} className="nav-brand ayakasir-brand">
            <span className="ayakasir-logo-text">AyaKasir</span>
          </Link>
          <div className="nav-actions">
            <div className="ayakasir-lang-switch">
              <Link
                href={`/en`}
                className={`ayakasir-lang-btn${locale === "en" ? " active" : ""}`}
              >
                EN
              </Link>
              <Link
                href={`/id`}
                className={`ayakasir-lang-btn${locale === "id" ? " active" : ""}`}
              >
                ID
              </Link>
            </div>
            <button
              type="button"
              className="nav-toggle"
              aria-expanded={isOpen}
              aria-controls="ayakasir-nav-menu"
              onClick={() => setIsOpen((open) => !open)}
            >
              Menu
            </button>
          </div>
        </div>
        <div
          id="ayakasir-nav-menu"
          className={`nav-menu${isOpen ? " is-open" : ""}`}
        >
          <div className="nav-links">
            <Link href={`/${locale}`} onClick={() => setIsOpen(false)}>
              {copy.nav.home}
            </Link>
            <Link
              href={`/${locale}/privacy-policy`}
              onClick={() => setIsOpen(false)}
            >
              {copy.nav.privacyPolicy}
            </Link>
            <Link
              href={`/${locale}/delete-account-request`}
              className="nav-link-contact"
              onClick={() => setIsOpen(false)}
            >
              {copy.nav.deleteAccount}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
