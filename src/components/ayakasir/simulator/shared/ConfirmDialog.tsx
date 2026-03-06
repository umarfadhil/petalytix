"use client";

import { useSimulator } from "../context";

export default function ConfirmDialog({
  message,
  onConfirm,
}: {
  message: string;
  onConfirm: () => void;
}) {
  const { dispatch, copy } = useSimulator();

  return (
    <div className="sim-dialog-overlay" onClick={() => dispatch({ type: "CLOSE_DIALOG" })}>
      <div className="sim-dialog" onClick={(e) => e.stopPropagation()}>
        <p style={{ fontSize: 14, color: "#333", margin: "0 0 16px", lineHeight: 1.5 }}>
          {message}
        </p>
        <div className="sim-dialog-actions">
          <button
            className="sim-btn sim-btn-ghost sim-btn-sm"
            onClick={() => dispatch({ type: "CLOSE_DIALOG" })}
          >
            {copy.confirm.no}
          </button>
          <button className="sim-btn sim-btn-primary sim-btn-sm" onClick={onConfirm}>
            {copy.confirm.yes}
          </button>
        </div>
      </div>
    </div>
  );
}
