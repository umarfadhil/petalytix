import { Fragment } from "react";
import { getCopy, Locale } from "@/lib/content";
import { getOrderedSections, getSiteSettings, localize } from "@/lib/site-settings";
import ContactForm from "@/components/ContactForm";

export const revalidate = 3600;

export default async function ContactPage({
  params
}: {
  params: { locale: Locale };
}) {
  const copy = getCopy(params.locale);
  const settings = await getSiteSettings();
  const phoneDial = settings.contactInfo.phone.replace(/\s+/g, "");

  const orderedSections = getOrderedSections(settings.pageSections.contact);
  const sectionMap: Record<string, (isFirst: boolean) => JSX.Element> = {
    intro: (isFirst) => (
      <section className={`section reveal${isFirst ? " page-top" : ""}`}>
        <span className="eyebrow">{copy.nav.contact}</span>
        <h1 className="title">
          {localize(settings.contact.title, params.locale)}
        </h1>
        <p className="subtitle">
          {localize(settings.contact.subtitle, params.locale)}
        </p>
      </section>
    ),
    details: (isFirst) => (
      <section className={`section reveal delay-2${isFirst ? " page-top" : ""}`}>
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
          <div className="contact-card">
            <strong>{copy.labels.location}</strong>
            <p className="subtitle" style={{ fontSize: "14px" }}>
              {settings.contactInfo.city}, {settings.contactInfo.country}
            </p>
            <span className="chip">{settings.contactInfo.coordinates}</span>
          </div>
        </div>
      </section>
    ),
    form: (isFirst) => (
      <section className={`section reveal delay-3${isFirst ? " page-top" : ""}`}>
        <div className="contact-card">
          <strong>{copy.labels.message}</strong>
          <p className="subtitle" style={{ fontSize: "14px" }}>
            {localize(settings.contact.responseNote, params.locale)}
          </p>
          <ContactForm locale={params.locale} labels={copy.form} />
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
