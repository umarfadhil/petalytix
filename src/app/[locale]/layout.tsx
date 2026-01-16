import { notFound } from "next/navigation";
import { getCopy, isLocale, Locale } from "@/lib/content";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

export default function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) {
    notFound();
  }

  const locale = params.locale as Locale;
  const copy = getCopy(locale);

  return (
    <>
      <NavBar locale={locale} copy={copy} />
      <main className="page" lang={locale}>
        {children}
      </main>
      <Footer locale={locale} copy={copy} />
    </>
  );
}
