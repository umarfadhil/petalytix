import { getCopy, Locale } from "@/lib/content";
import { getPrivacyPolicy } from "@/lib/privacy-policy";

export default function PrivacyPolicyPage({
  params
}: {
  params: { locale: Locale };
}) {
  const copy = getCopy(params.locale);
  const policy = getPrivacyPolicy(params.locale);

  return (
    <section className="section reveal page-top">
      <span className="eyebrow">{copy.footer.privacy}</span>
      <h1 className="title">{policy.title}</h1>
      <p className="subtitle">{policy.intro}</p>
      <div className="legal">
        {policy.sections.map((section, sectionIndex) => (
          <div className="legal-section" key={`${section.title}-${sectionIndex}`}>
            <h2 className="legal-title">{section.title}</h2>
            {section.paragraphs.map((paragraph, paragraphIndex) => (
              <p className="subtitle" key={`${section.title}-p-${paragraphIndex}`}>
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
