import { getAyaKasirCopy } from "@/lib/ayakasir-content";

export function generateMetadata({ params }: { params: { locale: string } }) {
  const copy = getAyaKasirCopy(params.locale);
  return {
    title: copy.appName,
    description: copy.hero.subtitle
  };
}

export default function AyaKasirLandingPage({
  params
}: {
  params: { locale: string };
}) {
  const copy = getAyaKasirCopy(params.locale);

  return (
    <>
      <section className="section reveal page-top">
        <span className="eyebrow">{copy.hero.eyebrow}</span>
        <h1 className="title">{copy.hero.title}</h1>
        <p className="subtitle">{copy.hero.subtitle}</p>
        <div className="project-links">
          <a
            className="button primary ayakasir-btn-primary"
            href="https://play.google.com/store/apps/details?id=com.ayakasir.app"
            target="_blank"
            rel="noopener noreferrer"
          >
            {copy.hero.ctaPlayStore}
          </a>
          <a
            className="button ghost"
            href={`/${params.locale}/privacy-policy`}
          >
            {copy.hero.ctaLearnMore}
          </a>
        </div>
      </section>

      <section className="section reveal delay-1">
        <span className="eyebrow">{copy.features.eyebrow}</span>
        <h2 className="title">{copy.features.title}</h2>
        <div className="card-grid">
          {copy.features.items.map((feature, index) => (
            <div className="feature-card" key={index}>
              <strong>{feature.title}</strong>
              <p className="subtitle" style={{ fontSize: "14px" }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
