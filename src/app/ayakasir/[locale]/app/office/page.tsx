import { redirect } from "next/navigation";
import { headers } from "next/headers";

function getBase() {
  const host = headers().get("host") || "";
  return host.startsWith("ayakasir.") || host.startsWith("ayakasir:") ? "" : "/ayakasir";
}

export default function OfficePage({ params }: { params: { locale: string } }) {
  redirect(`${getBase()}/${params.locale}/app/office/overview`);
}
