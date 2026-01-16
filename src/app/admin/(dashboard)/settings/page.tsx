import { getSiteSettings } from "@/lib/site-settings";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SiteSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <section className="admin-content">
      <div className="admin-toolbar">
        <div>
          <h1 className="title" style={{ fontSize: "28px" }}>
            Site settings
          </h1>
          <p className="subtitle" style={{ fontSize: "14px" }}>
            Manage the content on home, about, portfolio, and contact pages.
          </p>
        </div>
      </div>
      <SettingsForm settings={settings} />
    </section>
  );
}
