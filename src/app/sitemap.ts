import type { MetadataRoute } from "next";
import { locales, type Locale } from "@/lib/content";
import { getPortfolioItems } from "@/lib/portfolio";

export const revalidate = 3600;

const baseUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL || "https://petalytix.id"
);

const privacySlugByLocale: Record<Locale, string> = {
  en: "privacy-policy",
  id: "kebijakan-privasi"
};

type SitemapEntry = MetadataRoute.Sitemap[number];
type ChangeFrequency = NonNullable<SitemapEntry["changeFrequency"]>;
type PageDefinition = {
  path: string;
  changeFrequency: ChangeFrequency;
  priority: number;
};

const staticPages: PageDefinition[] = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 }
];

const localePages: PageDefinition[] = locales.flatMap((locale) => {
  const basePath = `/${locale}`;
  return [
    { path: basePath, changeFrequency: "weekly", priority: 0.9 },
    { path: `${basePath}/about`, changeFrequency: "weekly", priority: 0.8 },
    { path: `${basePath}/portfolio`, changeFrequency: "weekly", priority: 0.8 },
    { path: `${basePath}/contact`, changeFrequency: "weekly", priority: 0.8 },
    {
      path: `${basePath}/${privacySlugByLocale[locale]}`,
      changeFrequency: "monthly",
      priority: 0.5
    }
  ];
});

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const buildUrl = (path: string) => new URL(path, baseUrl).toString();

  const staticEntries = staticPages.map((page) => ({
    url: buildUrl(page.path),
    changeFrequency: page.changeFrequency,
    priority: page.priority
  }));

  const localeEntries = localePages.map((page) => ({
    url: buildUrl(page.path),
    changeFrequency: page.changeFrequency,
    priority: page.priority
  }));

  let portfolioEntries: MetadataRoute.Sitemap = [];

  try {
    const items = await getPortfolioItems();
    portfolioEntries = items.flatMap((item) =>
      locales.map((locale) => ({
        url: buildUrl(`/${locale}/portfolio/${item.slug}`),
        lastModified: item.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7
      }))
    );
  } catch (error) {
    console.error("Failed to build sitemap portfolio entries.", error);
  }

  return [...staticEntries, ...localeEntries, ...portfolioEntries];
}
