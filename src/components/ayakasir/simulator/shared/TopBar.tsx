"use client";

import { useSimulator } from "../context";

export default function TopBar() {
  const { state, copy } = useSimulator();

  const tabTitles: Record<string, string> = {
    pos: copy.tabs.pos,
    dashboard: copy.tabs.dashboard,
    products: copy.tabs.products,
    inventory: copy.tabs.inventory,
    settings: copy.tabs.settings,
  };

  return (
    <div className="sim-topbar">
      <span className="sim-topbar-name">{state.restaurantName}</span>
      <span className="sim-topbar-title">{tabTitles[state.activeTab]}</span>
    </div>
  );
}
