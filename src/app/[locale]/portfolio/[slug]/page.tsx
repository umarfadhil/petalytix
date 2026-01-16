import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCopy, Locale } from "@/lib/content";
import { getPortfolioItemBySlug } from "@/lib/portfolio";
import { normalizeUrl } from "@/lib/url";
import ProjectGallery from "@/components/ProjectGallery";

export const dynamic = "force-dynamic";

function localize(text: { en: string; id: string }, locale: Locale) {
  return locale === "id" ? text.id : text.en;
}

export default async function PortfolioDetailPage({
  params
}: {
  params: { locale: Locale; slug: string };
}) {
  const copy = getCopy(params.locale);
  const item = await getPortfolioItemBySlug(params.slug);

  if (!item) {
    notFound();
  }

  const title = localize(item.title, params.locale);
  const summary = localize(item.summary, params.locale);
  const description = localize(item.description, params.locale);
  const gallery = item.images ?? [];
  const hasGallery = gallery.length > 0;
  const isCoverDataImage = Boolean(item.coverImage?.startsWith("data:"));
  const metaChips = [item.year, item.location, ...item.tags].filter(Boolean);
  const primaryUrl = normalizeUrl(item.primaryUrl);

  return (
    <>
      <section className="section reveal page-top">
        <span className="eyebrow">{copy.nav.portfolio}</span>
        <h1 className="title">{title}</h1>
      </section>

      {item.coverImage ? (
        <section className="section reveal delay-1">
          <div className="project-cover project-cover-large">
            <Image
              src={item.coverImage}
              alt={title}
              width={1200}
              height={640}
              className="project-image"
              unoptimized={isCoverDataImage}
            />
          </div>
        </section>
      ) : null}

      <section className="section reveal">
        <p className="subtitle">{summary}</p>
      </section>

      {description ? (
        <section className="section reveal delay-2">
          <div className="feature-card">
            <p className="subtitle" style={{ fontSize: "15px" }}>
              {description}
            </p>
          </div>
        </section>
      ) : null}

      {hasGallery ? (
        <section className="section reveal delay-3">
          <span className="eyebrow">{copy.labels.gallery}</span>
          <ProjectGallery images={gallery} title={title} />
        </section>
      ) : null}

      {(primaryUrl || item.attachment) && (
        <section className="section reveal">
          <div className="project-links">
            {item.attachment ? (
              <a
                className="button ghost"
                href={item.attachment}
                target="_blank"
                rel="noreferrer"
                download
              >
                {copy.labels.downloadPdf}
              </a>
              ) : null}
          </div>
          {primaryUrl ? (
            <div className="link-preview-embed">
              <div className="link-preview-header">
                <strong>{copy.labels.preview}</strong>
                <div className="link-preview-actions">
                  <a
                    className="button ghost"
                    href={primaryUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {copy.labels.openInNewTab}
                  </a>
                </div>
              </div>
              <div className="link-preview-frame">
                <iframe
                  src={primaryUrl}
                  title={title}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          ) : null}
        </section>
      )}

      {metaChips.length > 0 ? (
        <section className="section reveal">
          <div className="project-meta">
            {metaChips.map((chip, index) => (
              <span className="chip" key={`${item.id}-${chip}-${index}`}>
                {chip}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section reveal">
        <Link className="button ghost" href={`/${params.locale}/portfolio`}>
          {copy.labels.backToPortfolio}
        </Link>
      </section>
    </>
  );
}
