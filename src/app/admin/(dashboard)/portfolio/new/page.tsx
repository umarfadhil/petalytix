import Link from "next/link";
import PortfolioForm from "../PortfolioForm";

export default function NewPortfolioPage() {
  return (
    <section className="admin-content">
      <div className="admin-toolbar">
        <div>
          <h1 className="title" style={{ fontSize: "28px" }}>
            New project
          </h1>
          <p className="subtitle" style={{ fontSize: "14px" }}>
            Add a new portfolio item in English and Bahasa Indonesia.
          </p>
        </div>
        <Link className="button ghost" href="/admin">
          Back to dashboard
        </Link>
      </div>
      <PortfolioForm mode="create" />
    </section>
  );
}
