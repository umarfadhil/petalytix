import { Fragment } from "react";
import Link from "next/link";
import { getCopy, Locale } from "@/lib/content";
import { getPortfolioItems } from "@/lib/portfolio";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import { getOrderedSections, getSiteSettings, localize } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function HomePage({
  params
}: {
  params: { locale: Locale };
}) {
  const copy = getCopy(params.locale);
  const settings = await getSiteSettings();
  const items = await getPortfolioItems();
  const featuredItems = items.filter((item) => item.featured);
  const carouselItems = featuredItems.length > 0 ? featuredItems : items;
  const phoneDial = settings.contactInfo.phone.replace(/\s+/g, "");

  const orderedSections = getOrderedSections(settings.pageSections.home);
  const sectionMap: Record<string, JSX.Element> = {
    hero: (
      <section className="hero">
        <div className="hero-card reveal">
          <span className="hero-badge">
            {localize(settings.hero.eyebrow, params.locale)}
          </span>
          <h1 className="title">
            {localize(settings.hero.title, params.locale)}
          </h1>
          <p className="subtitle">
            {localize(settings.hero.subtitle, params.locale)}
          </p>
          <div className="project-meta">
            <span className="chip">
              {localize(settings.hero.badge, params.locale)}
            </span>
          </div>
          <div className="project-links">
            <Link className="button primary" href={`/${params.locale}/portfolio`}>
              {localize(settings.hero.ctaPrimary, params.locale)}
            </Link>
            <Link className="button ghost" href={`/${params.locale}/contact`}>
              {localize(settings.hero.ctaSecondary, params.locale)}
            </Link>
          </div>
        </div>
        <div className="hero-map reveal delay-2" aria-hidden="true">
          <span className="map-outline" />
          <div className="map-overlay">
            <span className="map-node node-market" />
            <span className="map-node node-trend" />
            <span className="map-node node-sentiment" />
            <span className="map-node node-opportunity" />
            <div className="map-card card-market">
              <span className="card-title">Market</span>
              <div className="mini-bars">
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
            <div className="map-card card-trend">
              <span className="card-title">Trend</span>
              <div className="mini-line">
                <span />
              </div>
            </div>
            <div className="map-card card-sentiment">
              <span className="card-title">Sentiment</span>
              <div className="mini-dots">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </div>
      </section>
    ),
    metrics: (
      <section className="section reveal delay-1">
        <span className="eyebrow">
          {localize(settings.sections.metricsTitle, params.locale)}
        </span>
        <h2 className="title">
          {localize(settings.sections.metricsSubtitle, params.locale)}
        </h2>
        <div className="metrics">
          {settings.metrics.map((metric, index) => (
            <div className="metric-card" key={index}>
              <div className="metric-value">{metric.value}</div>
              <div className="subtitle" style={{ fontSize: "14px" }}>
                {localize(metric.label, params.locale)}
              </div>
            </div>
          ))}
        </div>
      </section>
    ),
    capabilities: (
      <section className="section reveal delay-2">
        <span className="eyebrow">
          {localize(settings.sections.capabilitiesTitle, params.locale)}
        </span>
        <h2 className="title">
          {localize(settings.sections.capabilitiesSubtitle, params.locale)}
        </h2>
        <div className="card-grid">
          {settings.capabilities.map((capability, index) => (
            <div className="feature-card" key={index}>
              <strong>{localize(capability.title, params.locale)}</strong>
              <p className="subtitle" style={{ fontSize: "14px" }}>
                {localize(capability.description, params.locale)}
              </p>
            </div>
          ))}
        </div>
      </section>
    ),
    projects: (
      <section className="section reveal delay-3">
        <span className="eyebrow">
          {localize(settings.sections.projectsTitle, params.locale)}
        </span>
        <h2 className="title">
          {localize(settings.sections.projectsSubtitle, params.locale)}
        </h2>
        {carouselItems.length > 0 ? (
          <FeaturedCarousel
            items={carouselItems}
            locale={params.locale}
            labels={copy.labels}
          />
        ) : (
          <div className="feature-card">
            <strong>{copy.labels.noProjects}</strong>
            <p className="subtitle" style={{ fontSize: "14px" }}>
              {copy.labels.addFirstProject}
            </p>
            <Link className="button ghost" href="/admin">
              {copy.labels.goToAdmin}
            </Link>
          </div>
        )}
      </section>
    ),
    process: (
      <section className="section reveal delay-4">
        <span className="eyebrow">
          {localize(settings.sections.processTitle, params.locale)}
        </span>
        <h2 className="title">
          {localize(settings.sections.processSubtitle, params.locale)}
        </h2>
        <div className="timeline">
          {settings.process.map((step, index) => (
            <div className="timeline-item" key={index}>
              <strong>{localize(step.title, params.locale)}</strong>
              <p className="subtitle" style={{ fontSize: "14px" }}>
                {localize(step.description, params.locale)}
              </p>
            </div>
          ))}
        </div>
      </section>
    ),
    contact: (
      <section className="section reveal">
        <span className="eyebrow">{copy.nav.contact}</span>
        <h2 className="title">
          {localize(settings.contact.subtitle, params.locale)}
        </h2>
        <div className="contact-grid">
          <div className="contact-card">
            <strong>{copy.labels.email}</strong>
            <p className="subtitle" style={{ fontSize: "14px" }}>
              {settings.contactInfo.email}
            </p>
            <a
              className="button ghost"
              href={`mailto:${settings.contactInfo.email}`}
            >
              {copy.labels.sendEmail}
            </a>
          </div>
          <div className="contact-card">
            <strong>{copy.labels.phone}</strong>
            <p className="subtitle" style={{ fontSize: "14px" }}>
              {settings.contactInfo.phone}
            </p>
            <a className="button ghost" href={`tel:${phoneDial}`}>
              {copy.labels.callNow}
            </a>
          </div>
        </div>
      </section>
    )
  };

  return (
    <>
      {orderedSections.map((section) => (
        <Fragment key={section.id}>{sectionMap[section.id]}</Fragment>
      ))}
    </>
  );
}
