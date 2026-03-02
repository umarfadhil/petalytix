import { getAyaKasirCopy } from "@/lib/ayakasir-content";

export function generateMetadata({ params }: { params: { locale: string } }) {
  const copy = getAyaKasirCopy(params.locale);
  return {
    title: copy.privacyPolicy.title
  };
}

export default function AyaKasirPrivacyPolicyPage({
  params
}: {
  params: { locale: string };
}) {
  const copy = getAyaKasirCopy(params.locale);
  const policy = copy.privacyPolicy;

  return (
    <section className="section reveal page-top">
      <span className="eyebrow">{copy.appName}</span>
      <h1 className="title">{policy.title}</h1>
      <p className="subtitle">{policy.intro}</p>
      <p
        className="subtitle"
        style={{ fontSize: "14px", color: "var(--color-muted)" }}
      >
        {policy.lastUpdated}
      </p>
      <div className="legal">
        {policy.sections.map((section, sectionIndex) => (
          <div
            className="legal-section"
            key={`${section.title}-${sectionIndex}`}
          >
            <h2 className="legal-title">{section.title}</h2>
            {section.paragraphs.map((paragraph, paragraphIndex) => (
              <p
                className="subtitle"
                key={`${section.title}-p-${paragraphIndex}`}
              >
                {paragraph}
              </p>
            ))}
            {section.bullets ? (
              <ul className="legal-list">
                {section.bullets.map((item, itemIndex) => (
                  <li key={`${section.title}-b-${itemIndex}`}>{item}</li>
                ))}
              </ul>
            ) : null}
            {section.contactEmail ? (
              <p className="subtitle">
                <a
                  className="legal-link"
                  href={`mailto:${section.contactEmail}`}
                >
                  {section.contactEmail}
                </a>
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
