import { Fragment } from "react";
import Link from "next/link";
import { getCopy, Locale } from "@/lib/content";
import { getPortfolioItems } from "@/lib/portfolio";
import ProjectCard from "@/components/ProjectCard";
import { getOrderedSections, getSiteSettings, localize } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function PortfolioPage({
  params
}: {
  params: { locale: Locale };
}) {
  const copy = getCopy(params.locale);
  const settings = await getSiteSettings();
  const items = await getPortfolioItems();

  const orderedSections = getOrderedSections(settings.pageSections.portfolio);
  const sectionMap: Record<string, (isFirst: boolean) => JSX.Element> = {
    intro: (isFirst) => (
      <section className={`section reveal${isFirst ? " page-top" : ""}`}>
        <span className="eyebrow">{copy.nav.portfolio}</span>
        <h1 className="title">
          {localize(settings.sections.projectsTitle, params.locale)}
        </h1>
        <p className="subtitle">
          {localize(settings.sections.projectsSubtitle, params.locale)}
        </p>
      </section>
    ),
    list: (isFirst) => (
      <section className={`section reveal delay-2${isFirst ? " page-top" : ""}`}>
        <div className="card-grid">
          {items.length > 0 ? (
            items.map((item) => (
              <ProjectCard
                key={item.id}
                item={item}
                locale={params.locale}
                labels={copy.labels}
              />
            ))
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
        </div>
      </section>
    )
  };

  return (
    <>
      {orderedSections.map((section, index) => (
        <Fragment key={section.id}>
          {sectionMap[section.id](index === 0)}
        </Fragment>
      ))}
    </>
  );
}
