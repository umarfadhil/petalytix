"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Locale, SiteCopy } from "@/lib/content";
import LanguageSwitch from "./LanguageSwitch";

export default function NavBar({
  locale,
  copy
}: {
  locale: Locale;
  copy: SiteCopy;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="nav">
      <div className="nav-inner">
        <div className="nav-bar">
          <Link href={`/${locale}`} className="nav-brand">
            <Image
              src="/images/petalytix-logo.png"
              alt="Petalytix"
              width={120}
              height={40}
              priority
            />
          </Link>
          <div className="nav-actions">
            <LanguageSwitch locale={locale} />
            <button
              type="button"
              className="nav-toggle"
              aria-expanded={isOpen}
              aria-controls="nav-menu"
              onClick={() => setIsOpen((open) => !open)}
            >
              Menu
            </button>
          </div>
        </div>
        <div id="nav-menu" className={`nav-menu${isOpen ? " is-open" : ""}`}>
          <div className="nav-links">
            <Link href={`/${locale}`} onClick={() => setIsOpen(false)}>
              {copy.nav.home}
            </Link>
            <Link href={`/${locale}/about`} onClick={() => setIsOpen(false)}>
              {copy.nav.about}
            </Link>
            <Link href={`/${locale}/portfolio`} onClick={() => setIsOpen(false)}>
              {copy.nav.portfolio}
            </Link>
            <Link
              href={`/${locale}/contact`}
              className="nav-link-contact"
              onClick={() => setIsOpen(false)}
            >
              {copy.nav.contact}
            </Link>
          </div>
          <div className="nav-cta">
            <LanguageSwitch locale={locale} />
            <Link className="button ghost" href={`/${locale}/contact`}>
              {copy.nav.contact}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
