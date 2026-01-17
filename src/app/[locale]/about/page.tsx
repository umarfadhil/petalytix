import { Fragment } from "react";
import Link from "next/link";
import { getCopy, Locale } from "@/lib/content";
import { getOrderedSections, getSiteSettings, localize } from "@/lib/site-settings";

export const revalidate = 3600;

export default async function AboutPage({
  params
}: {
  params: { locale: Locale };
}) {
  const copy = getCopy(params.locale);
  const settings = await getSiteSettings();

  const orderedSections = getOrderedSections(settings.pageSections.about);
  const sectionMap: Record<string, (isFirst: boolean) => JSX.Element> = {
    about: (isFirst) => (
      <section className={`section reveal${isFirst ? " page-top" : ""}`}>
        <span className="eyebrow">{copy.nav.about}</span>
        <h1 className="title">
          {localize(settings.about.title, params.locale)}
        </h1>
        <p className="subtitle">
          {localize(settings.about.subtitle, params.locale)}
        </p>
        <div className="feature-card about-card">
          <div className="about-card-body">
            <p className="subtitle about-story" style={{ fontSize: "15px" }}>
              {localize(settings.about.story, params.locale)}
            </p>
            <p className="subtitle" style={{ fontSize: "15px" }}>
              {localize(settings.about.invite, params.locale)}
            </p>
            <Link className="button ghost" href={`/${params.locale}/contact`}>
              {copy.nav.contact}
            </Link>
          </div>
          {settings.about.photo ? (
            <div className="about-photo">
              <img src={settings.about.photo} alt="Portrait" loading="lazy" />
            </div>
          ) : null}
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
