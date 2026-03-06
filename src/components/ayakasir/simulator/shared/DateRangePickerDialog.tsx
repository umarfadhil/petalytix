"use client";

import { useState } from "react";
import { useSimulator } from "../context";

export default function DateRangePickerDialog() {
  const { dispatch, copy } = useSimulator();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const [from, setFrom] = useState(todayStr);
  const [to, setTo] = useState(todayStr);

  function handleApply() {
    const fromTs = new Date(from).setHours(0, 0, 0, 0);
    const toTs = new Date(to).setHours(23, 59, 59, 999);
    dispatch({ type: "SET_DASHBOARD_DATE_RANGE", from: fromTs, to: toTs });
    dispatch({ type: "CLOSE_DIALOG" });
  }

  return (
    <div className="sim-dialog-overlay" onClick={() => dispatch({ type: "CLOSE_DIALOG" })}>
      <div className="sim-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="sim-dialog-title">{copy.dashboard.custom}</h3>
        <div className="sim-field" style={{ marginBottom: 10 }}>
          <label className="sim-label">{copy.dashboard.from}</label>
          <input
            className="sim-input"
            type="date"
            value={from}
            max={todayStr}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="sim-field" style={{ marginBottom: 14 }}>
          <label className="sim-label">{copy.dashboard.to}</label>
          <input
            className="sim-input"
            type="date"
            value={to}
            min={from}
            max={todayStr}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="sim-dialog-actions">
          <button className="sim-btn sim-btn-ghost" onClick={() => dispatch({ type: "CLOSE_DIALOG" })}>
            {copy.products.cancel}
          </button>
          <button className="sim-btn sim-btn-primary" onClick={handleApply}>
            {copy.dashboard.applyRange}
          </button>
        </div>
      </div>
    </div>
  );
}
