import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default function ErpRoot({ params }: { params: { locale: string } }) {
  const host = headers().get("host") || "";
  const base = host.startsWith("ayakasir.") || host.startsWith("ayakasir:") ? "" : "/ayakasir";
  redirect(`${base}/${params.locale}/app/dashboard`);
}
