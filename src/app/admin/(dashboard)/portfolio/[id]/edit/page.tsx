import Link from "next/link";
import { notFound } from "next/navigation";
import { getPortfolioItemById } from "@/lib/portfolio";
import PortfolioForm from "../../PortfolioForm";

export default async function EditPortfolioPage({
  params
}: {
  params: { id: string };
}) {
  const item = await getPortfolioItemById(params.id);

  if (!item) {
    notFound();
  }

  return (
    <section className="admin-content">
      <div className="admin-toolbar">
        <div>
          <h1 className="title" style={{ fontSize: "28px" }}>
            Edit project
          </h1>
          <p className="subtitle" style={{ fontSize: "14px" }}>
            Update portfolio content and metadata.
          </p>
        </div>
        <Link className="button ghost" href="/admin">
          Back to dashboard
        </Link>
      </div>
      <PortfolioForm mode="edit" item={item} />
    </section>
  );
}
