import { redirect } from "next/navigation";

export default function ErpRoot({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/app/dashboard`);
}
