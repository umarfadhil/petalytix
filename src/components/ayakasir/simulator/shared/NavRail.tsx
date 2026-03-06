"use client";

import { useSimulator } from "../context";
import type { AppTab } from "../types";

const TAB_ICONS: Record<AppTab, string> = {
  pos: "\uD83D\uDCB0",
  dashboard: "\uD83D\uDCCA",
  products: "\uD83C\uDF74",
  inventory: "\uD83D\uDCE6",
  purchasing: "\uD83D\uDED2",
  settings: "\u2699\uFE0F",
};

export default function NavRail() {
  const { state, dispatch, copy } = useSimulator();

  const tabs: { key: AppTab; label: string }[] = [
    { key: "pos", label: copy.tabs.pos },
    { key: "dashboard", label: copy.tabs.dashboard },
    { key: "products", label: copy.tabs.products },
    { key: "inventory", label: copy.tabs.inventory },
    { key: "purchasing", label: copy.tabs.purchasing },
    { key: "settings", label: copy.tabs.settings },
  ];

  return (
    <nav className="sim-navrail">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`sim-navrail-item${state.activeTab === tab.key ? " active" : ""}`}
          onClick={() => dispatch({ type: "SET_TAB", tab: tab.key })}
        >
          <span className="sim-navrail-icon">{TAB_ICONS[tab.key]}</span>
          <span className="sim-navrail-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
