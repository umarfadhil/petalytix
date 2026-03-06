import { getAyaKasirCopy } from "@/lib/ayakasir-content";
import { getSimCopy } from "@/components/ayakasir/simulator/i18n";
import SimulatorShell from "./SimulatorShell";

export function generateMetadata({ params }: { params: { locale: string } }) {
  const copy = getAyaKasirCopy(params.locale);
  return {
    title: `${copy.appName} — Simulator`,
    description: "Try AyaKasir POS in your browser",
  };
}

export default function SimulatorPage({
  params,
}: {
  params: { locale: string };
}) {
  const simCopy = getSimCopy(params.locale);

  return <SimulatorShell locale={params.locale} copy={simCopy} />;
}
