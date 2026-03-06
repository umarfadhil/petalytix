"use client";

import { useSimulator } from "../context";
import { scenarios } from "../data";

const SCENARIO_ICONS: Record<string, string> = {
  restaurant: "\uD83C\uDF5C",
  retail: "\uD83D\uDED2",
  multichannel: "\u2615",
  services: "\u2702\uFE0F",
};

export default function ScenarioPickerScreen() {
  const { dispatch, copy } = useSimulator();

  const items = [
    { key: "restaurant", label: copy.scenario.restaurant, desc: copy.scenario.restaurantDesc },
    { key: "retail", label: copy.scenario.retail, desc: copy.scenario.retailDesc },
    { key: "multichannel", label: copy.scenario.multichannel, desc: copy.scenario.multichannelDesc },
    { key: "services", label: copy.scenario.services, desc: copy.scenario.servicesDesc },
  ];

  return (
    <div className="sim-screen sim-scenario">
      <div className="sim-scenario-header">
        <h2 className="sim-scenario-title">{copy.scenario.title}</h2>
        <p className="sim-scenario-subtitle">{copy.scenario.subtitle}</p>
      </div>
      <div className="sim-scenario-grid">
        {items.map((item) => (
          <button
            key={item.key}
            className="sim-scenario-card"
            onClick={() => {
              const data = scenarios[item.key];
              if (data) dispatch({ type: "SELECT_SCENARIO", key: item.key, data });
            }}
          >
            <span className="sim-scenario-icon">{SCENARIO_ICONS[item.key]}</span>
            <strong className="sim-scenario-label">{item.label}</strong>
            <span className="sim-scenario-desc">{item.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
