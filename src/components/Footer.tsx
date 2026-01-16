import Link from "next/link";
import Image from "next/image";
import { Locale, SiteCopy } from "@/lib/content";

export default function Footer({
  locale,
  copy
}: {
  locale: Locale;
  copy: SiteCopy;
}) {
  return (
    <footer className="page footer">
      <div>
        <Image
          src="/images/petalytix-logo.png"
          alt="Petalytix"
          width={140}
          height={46}
        />
      </div>
      <div className="footer-links">
        <Link href={`/${locale}`}>{copy.nav.home}</Link>
        <Link href={`/${locale}/about`}>{copy.nav.about}</Link>
        <Link href={`/${locale}/portfolio`}>{copy.nav.portfolio}</Link>
        <Link href={`/${locale}/contact`}>{copy.nav.contact}</Link>
        <Link href="/admin">{copy.nav.admin}</Link>
        <Link href={copy.footer.privacyUrl}>{copy.footer.privacy}</Link>
      </div>
      <div>{copy.footer.note}</div>
    </footer>
  );
}
