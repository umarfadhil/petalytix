import Link from "next/link";
import { getPortfolioItems } from "@/lib/portfolio";
import { deletePortfolioAction } from "./portfolio/actions";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const items = await getPortfolioItems();

  return (
    <section className="admin-content">
      <div className="admin-toolbar">
        <h1 className="title" style={{ fontSize: "28px" }}>
          Portfolio
        </h1>
        <Link className="button primary" href="/admin/portfolio/new">
          New project
        </Link>
      </div>
      <div className="admin-list">
        {items.length > 0 ? (
          items.map((item) => (
            <div className="admin-list-item" key={item.id}>
              <div>
                <strong>{item.title.en}</strong>
                <div className="subtitle" style={{ fontSize: "13px" }}>
                  {item.location} | {item.year}
                </div>
              </div>
              <div className="admin-actions">
                <Link className="button ghost" href={`/admin/portfolio/${item.id}/edit`}>
                  Edit
                </Link>
                <form action={deletePortfolioAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <button className="button ghost" type="submit">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))
        ) : (
          <div className="feature-card">
            <strong>No projects yet</strong>
            <p className="subtitle" style={{ fontSize: "14px" }}>
              Create your first project to populate the portfolio page.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
