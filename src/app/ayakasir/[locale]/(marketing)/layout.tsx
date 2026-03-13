import { notFound } from "next/navigation";
import { getAyaKasirCopy, isAyaKasirLocale } from "@/lib/ayakasir-content";
import AyaKasirNavBar from "@/components/ayakasir/NavBar";
import AyaKasirFooter from "@/components/ayakasir/Footer";

export default function AyaKasirMarketingLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isAyaKasirLocale(params.locale)) {
    notFound();
  }

  const copy = getAyaKasirCopy(params.locale);

  return (
    <>
      <AyaKasirNavBar locale={params.locale} copy={copy} />
      <main className="page" lang={params.locale}>
        {children}
      </main>
      <AyaKasirFooter locale={params.locale} copy={copy} />
    </>
  );
}
