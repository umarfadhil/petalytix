import Image from "next/image";
import Link from "next/link";
import { Locale, SiteCopy } from "@/lib/content";
import { PortfolioItem } from "@/lib/portfolio";
import { normalizeUrl } from "@/lib/url";
import LinkPreview from "@/components/LinkPreview";

function localize(
  text: { en: string; id: string },
  locale: Locale
): string {
  return locale === "id" ? text.id : text.en;
}

export default function ProjectCard({
  item,
  locale,
  labels
}: {
  item: PortfolioItem;
  locale: Locale;
  labels: SiteCopy["labels"];
}) {
  const title = localize(item.title, locale);
  const summary = localize(item.summary, locale);
  const isDataImage = Boolean(item.coverImage?.startsWith("data:"));
  const primaryUrl = normalizeUrl(item.primaryUrl);

  return (
    <article className="project-card">
      <Link className="project-card-main" href={`/${locale}/portfolio/${item.slug}`}>
        <div className="project-cover">
          {item.coverImage ? (
            <Image
              src={item.coverImage}
              alt={title}
              width={640}
              height={360}
              className="project-image"
              unoptimized={isDataImage}
            />
          ) : (
            <div className="project-cover-placeholder" />
          )}
        </div>
        <div className="project-meta">
          <span className="chip">{item.year}</span>
          <span className="chip">{item.location}</span>
        </div>
        <div>
          <h3 className="title" style={{ fontSize: "24px" }}>
            {title}
          </h3>
          <p className="subtitle" style={{ fontSize: "15px" }}>
            {summary}
          </p>
        </div>
      </Link>
      {primaryUrl ? (
        <div className="project-links">
          <LinkPreview
            url={primaryUrl}
            label={labels.preview}
            openLabel={labels.openInNewTab}
            closeLabel={labels.close}
            title={title}
          />
        </div>
      ) : null}
    </article>
  );
}
