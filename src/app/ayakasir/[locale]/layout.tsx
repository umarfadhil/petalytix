import { notFound } from "next/navigation";
import { isAyaKasirLocale } from "@/lib/ayakasir-content";

export default function AyaKasirLocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isAyaKasirLocale(params.locale)) {
    notFound();
  }

  return <>{children}</>;
}
