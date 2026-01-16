"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin", label: "Portfolio" },
  { href: "/admin/settings", label: "Site settings" }
];

export default function AdminTabs() {
  const pathname = usePathname();
  const normalized = pathname.replace(/\/$/, "");

  return (
    <div className="admin-tabs">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/admin/settings"
            ? normalized.startsWith("/admin/settings")
            : normalized === "/admin" || normalized.startsWith("/admin/portfolio");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={isActive ? "active" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
