"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Locale } from "@/lib/content";

export default function LanguageSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const nextLocale = locale === "en" ? "id" : "en";
  const segments = pathname.split("/");
  segments[1] = nextLocale;
  const nextPath = segments.join("/") || `/${nextLocale}`;

  return (
    <Link className="lang-switch" href={nextPath}>
      {nextLocale.toUpperCase()}
    </Link>
  );
}
