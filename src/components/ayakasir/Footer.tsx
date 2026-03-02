import Link from "next/link";
import { AyaKasirCopyType } from "@/lib/ayakasir-content";

export default function AyaKasirFooter({
  locale,
  copy
}: {
  locale: string;
  copy: AyaKasirCopyType;
}) {
  return (
    <footer className="page" style={{ paddingBottom: "48px", paddingTop: "0" }}>
      <div
        style={{
          borderTop: "1px solid var(--color-line)",
          paddingTop: "32px",
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <span className="eyebrow" style={{ letterSpacing: "normal" }}>
          {copy.footer.note}
        </span>
        <div className="footer-links">
          <Link href={`/${locale}/privacy-policy`}>{copy.footer.privacy}</Link>
          <Link href={`/${locale}/delete-account-request`}>
            {copy.footer.deleteAccount}
          </Link>
        </div>
      </div>
    </footer>
  );
}
