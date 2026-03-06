"use client";

import { useState } from "react";
import { useSimulator } from "../context";
import { formatRupiah, formatDate } from "../constants";
import VendorFormDialog from "../shared/VendorFormDialog";
import GoodsReceivingFormDialog from "../shared/GoodsReceivingFormDialog";

export default function PurchasingScreen() {
  const { state, dispatch, copy } = useSimulator();
  const [tab, setTab] = useState<"receiving" | "vendors">("receiving");

  return (
    <div className="sim-screen" style={{ display: "flex", flexDirection: "column" }}>
      {/* Sub-tabs */}
      <div className="sim-purchasing-tabs">
        <button
          className={`sim-purchasing-tab${tab === "receiving" ? " active" : ""}`}
          onClick={() => setTab("receiving")}
        >
          {copy.purchasing.goodsReceiving}
        </button>
        <button
          className={`sim-purchasing-tab${tab === "vendors" ? " active" : ""}`}
          onClick={() => setTab("vendors")}
        >
          {copy.purchasing.vendors}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {tab === "receiving" && <ReceivingTab />}
        {tab === "vendors" && <VendorsTab />}
      </div>

      {/* Dialogs */}
      {state.activeDialog?.type === "goodsReceivingForm" && <GoodsReceivingFormDialog />}
      {state.activeDialog?.type === "vendorForm" && (
        <VendorFormDialog vendorId={state.activeDialog.vendorId} />
      )}
    </div>
  );
}

function ReceivingTab() {
  const { state, dispatch, copy } = useSimulator();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sorted = [...state.goodsReceivings].sort((a, b) => b.date - a.date);

  return (
    <>
      <div className="sim-section-header">
        <span className="sim-section-title">{copy.purchasing.goodsReceiving}</span>
        <button
          className="sim-btn sim-btn-primary sim-btn-sm"
          onClick={() => dispatch({ type: "OPEN_DIALOG", dialog: { type: "goodsReceivingForm" } })}
          disabled={state.vendors.length === 0}
        >
          + {copy.purchasing.addReceiving}
        </button>
      </div>
      {sorted.length === 0 ? (
        <div className="sim-empty">
          <span className="sim-empty-icon">&#128230;</span>
          {state.vendors.length === 0
            ? copy.purchasing.noVendors
            : copy.purchasing.noReceivings}
        </div>
      ) : (
        sorted.map((gr) => {
          const vendor = state.vendors.find((v) => v.id === gr.vendorId);
          const isExpanded = expandedId === gr.id;
          return (
            <div key={gr.id}>
              <div
                className="sim-receiving-row"
                style={{ cursor: "pointer" }}
                onClick={() => setExpandedId(isExpanded ? null : gr.id)}
              >
                <div className="sim-receiving-info">
                  <div className="sim-receiving-vendor">{vendor?.name ?? gr.vendorId}</div>
                  <div className="sim-receiving-date">
                    {formatDate(gr.date)} · {gr.items.length} {copy.purchasing.items}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div className="sim-receiving-cost">{formatRupiah(gr.totalCost)}</div>
                  <span style={{ color: "#aaa", fontSize: 14 }}>{isExpanded ? "▲" : "▼"}</span>
                </div>
              </div>
              {isExpanded && (
                <div className="sim-receiving-detail">
                  {gr.items.map((item, idx) => {
                    const product = state.products.find((p) => p.id === item.productId);
                    return (
                      <div key={idx} className="sim-receiving-detail-row">
                        <span className="sim-receiving-detail-name">{product?.name ?? item.productId}</span>
                        <span className="sim-receiving-detail-qty">
                          {item.qty}{item.unit ? ` ${item.unit}` : ""}
                        </span>
                        <span className="sim-receiving-detail-cost">
                          {item.unitCost > 0 ? formatRupiah(Math.round(item.qty * item.unitCost)) : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </>
  );
}

function VendorsTab() {
  const { state, dispatch, copy } = useSimulator();

  return (
    <>
      <div className="sim-section-header">
        <span className="sim-section-title">{copy.purchasing.vendors}</span>
        <button
          className="sim-btn sim-btn-primary sim-btn-sm"
          onClick={() =>
            dispatch({ type: "OPEN_DIALOG", dialog: { type: "vendorForm", vendorId: null } })
          }
        >
          + {copy.purchasing.addVendor}
        </button>
      </div>
      {state.vendors.length === 0 ? (
        <div className="sim-empty">
          <span className="sim-empty-icon">&#127968;</span>
          {copy.purchasing.noVendors}
        </div>
      ) : (
        state.vendors.map((v) => (
          <div
            key={v.id}
            className="sim-vendor-row"
            onClick={() =>
              dispatch({ type: "OPEN_DIALOG", dialog: { type: "vendorForm", vendorId: v.id } })
            }
          >
            <div className="sim-vendor-info">
              <div className="sim-vendor-name">{v.name}</div>
              {v.phone && <div className="sim-vendor-phone">{v.phone}</div>}
            </div>
            <span style={{ color: "#ccc", fontSize: 16 }}>›</span>
          </div>
        ))
      )}
    </>
  );
}
