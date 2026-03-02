import { getAyaKasirCopy } from "@/lib/ayakasir-content";
import DeleteAccountForm from "@/components/ayakasir/DeleteAccountForm";

export function generateMetadata({ params }: { params: { locale: string } }) {
  const copy = getAyaKasirCopy(params.locale);
  return {
    title: copy.deleteAccount.title
  };
}

export default function DeleteAccountRequestPage({
  params
}: {
  params: { locale: string };
}) {
  const copy = getAyaKasirCopy(params.locale);
  const del = copy.deleteAccount;

  return (
    <section className="section reveal page-top">
      <span className="eyebrow">{del.eyebrow}</span>
      <h1 className="title">{del.title}</h1>
      <p className="subtitle">{del.subtitle}</p>

      <div
        className="feature-card ayakasir-card-full"
        style={{ padding: "28px" }}
      >
        <p
          className="subtitle"
          style={{
            fontSize: "13px",
            background: "rgba(255,138,61,0.08)",
            border: "1px solid rgba(255,138,61,0.25)",
            borderRadius: "var(--radius-sm)",
            padding: "12px 16px",
            marginBottom: "4px"
          }}
        >
          {del.note}
        </p>

        <DeleteAccountForm locale={params.locale} copy={copy} />
      </div>

      <div
        className="feature-card ayakasir-card-full"
        style={{ padding: "24px" }}
      >
        <strong>{del.manualTitle}</strong>
        <p className="subtitle" style={{ fontSize: "14px" }}>
          {del.manualText}
        </p>
        <a
          className="legal-link"
          href="mailto:contact@petalytix.id"
          style={{ fontSize: "14px" }}
        >
          contact@petalytix.id
        </a>
      </div>
    </section>
  );
}
