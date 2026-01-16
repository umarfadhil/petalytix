import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { logoutAction } from "./actions";
import AdminTabs from "./AdminTabs";

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-title">
          <strong>Admin</strong>
          <span className="chip">Workspace</span>
        </div>
        <nav className="admin-nav">
          <AdminTabs />
          <div className="admin-actions">
            <Link href="/en">View site</Link>
            <form action={logoutAction}>
              <button className="button ghost" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </nav>
      </header>
      <div className="admin-page">{children}</div>
    </div>
  );
}
