"use client";

import { useState } from "react";
import { useSimulator } from "../context";

export default function VendorFormDialog({ vendorId }: { vendorId: string | null }) {
  const { state, dispatch, copy } = useSimulator();
  const existing = vendorId ? state.vendors.find((v) => v.id === vendorId) : null;

  const [name, setName] = useState(existing?.name ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [address, setAddress] = useState(existing?.address ?? "");

  function handleSave() {
    if (!name.trim()) return;
    if (existing) {
      dispatch({ type: "UPDATE_VENDOR", id: existing.id, updates: { name: name.trim(), phone: phone.trim(), address: address.trim() } });
    } else {
      dispatch({ type: "ADD_VENDOR", vendor: { name: name.trim(), phone: phone.trim() || undefined, address: address.trim() || undefined } });
    }
    dispatch({ type: "CLOSE_DIALOG" });
  }

  function handleDelete() {
    if (existing) dispatch({ type: "DELETE_VENDOR", id: existing.id });
    dispatch({ type: "CLOSE_DIALOG" });
  }

  return (
    <div className="sim-dialog-overlay" onClick={() => dispatch({ type: "CLOSE_DIALOG" })}>
      <div className="sim-dialog sim-form-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="sim-dialog-title">
          {existing ? copy.purchasing.editVendor : copy.purchasing.addVendor}
        </h3>
        <div className="sim-field">
          <label className="sim-label">{copy.purchasing.vendorName}</label>
          <input className="sim-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="sim-field">
          <label className="sim-label">{copy.purchasing.vendorPhone}</label>
          <input className="sim-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="sim-field">
          <label className="sim-label">{copy.purchasing.vendorAddress}</label>
          <input className="sim-input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="sim-dialog-actions" style={{ justifyContent: "space-between" }}>
          {existing && (
            <button className="sim-btn sim-btn-danger" onClick={handleDelete}>
              {copy.products.delete}
            </button>
          )}
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button className="sim-btn sim-btn-ghost" onClick={() => dispatch({ type: "CLOSE_DIALOG" })}>
              {copy.products.cancel}
            </button>
            <button className="sim-btn sim-btn-primary" onClick={handleSave} disabled={!name.trim()}>
              {copy.products.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
