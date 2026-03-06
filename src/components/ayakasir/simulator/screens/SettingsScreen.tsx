"use client";

import { useState } from "react";
import { useSimulator } from "../context";
import ConfirmDialog from "../shared/ConfirmDialog";

export default function SettingsScreen() {
  const { state, dispatch, copy } = useSimulator();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newRawCategoryName, setNewRawCategoryName] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [initialBalance, setInitialBalance] = useState("");
  const [exportToast, setExportToast] = useState(false);

  function handleAddMenuCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    dispatch({ type: "ADD_CATEGORY", category: { name, sortOrder: state.categories.length, categoryType: "MENU" } });
    setNewCategoryName("");
  }

  function handleAddRawCategory() {
    const name = newRawCategoryName.trim();
    if (!name) return;
    dispatch({ type: "ADD_CATEGORY", category: { name, sortOrder: state.categories.length, categoryType: "RAW_MATERIAL" } });
    setNewRawCategoryName("");
  }

  function handleSetBalance() {
    const amount = parseInt(initialBalance) || 0;
    if (amount <= 0) return;
    dispatch({ type: "SET_INITIAL_BALANCE", amount });
    setInitialBalance("");
  }

  function handleExport() {
    setExportToast(true);
    setTimeout(() => setExportToast(false), 2500);
  }

  const menuCategories = state.categories.filter((c) => c.categoryType === "MENU");
  const rawCategories = state.categories.filter((c) => c.categoryType === "RAW_MATERIAL");

  return (
    <div className="sim-screen">
      {/* Shop name */}
      <div className="sim-settings-section">
        <div className="sim-settings-label">{copy.settings.shopName}</div>
        <div className="sim-settings-card">
          <div className="sim-settings-value">{state.restaurantName}</div>
        </div>
      </div>

      {/* Payment methods */}
      <div className="sim-settings-section">
        <div className="sim-settings-label">{copy.settings.paymentMethods}</div>
        <div className="sim-settings-card">
          <div className="sim-toggle-row">
            <span className="sim-toggle-label">{copy.settings.cash}</span>
            <button
              className={`sim-toggle${state.paymentMethods.cash ? " on" : ""}`}
              onClick={() => dispatch({ type: "TOGGLE_PAYMENT_METHOD", method: "CASH" })}
            />
          </div>
          <div className="sim-toggle-row">
            <span className="sim-toggle-label">{copy.settings.qris}</span>
            <button
              className={`sim-toggle${state.paymentMethods.qris ? " on" : ""}`}
              onClick={() => dispatch({ type: "TOGGLE_PAYMENT_METHOD", method: "QRIS" })}
            />
          </div>
          {state.paymentMethods.qris && (
            <div className="sim-qris-mock">
              <div className="sim-qris-code" />
              <span className="sim-qris-label">{copy.settings.qrisCode}</span>
            </div>
          )}
          <div className="sim-toggle-row">
            <span className="sim-toggle-label">{copy.settings.utang}</span>
            <button
              className={`sim-toggle${state.paymentMethods.utang ? " on" : ""}`}
              onClick={() => dispatch({ type: "TOGGLE_PAYMENT_METHOD", method: "UTANG" })}
            />
          </div>
        </div>
      </div>

      {/* Bluetooth printer */}
      <div className="sim-settings-section">
        <div className="sim-settings-label">{copy.settings.printer}</div>
        <div className="sim-settings-card">
          <div className="sim-toggle-row">
            <span className="sim-toggle-label">{copy.settings.printer}</span>
            <span style={{ fontSize: 11, color: "#aaa" }}>{copy.settings.printerDisconnected}</span>
          </div>
        </div>
      </div>

      {/* Initial balance */}
      <div className="sim-settings-section">
        <div className="sim-settings-label">{copy.settings.initialBalance}</div>
        <div className="sim-settings-card">
          <div className="sim-balance-row">
            <input
              className="sim-input"
              type="number"
              min="0"
              placeholder="0"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
            />
            <button className="sim-btn sim-btn-primary sim-btn-sm" onClick={handleSetBalance}>
              {copy.settings.setInitialBalance}
            </button>
          </div>
        </div>
      </div>

      {/* Manajemen Barang — Menu categories */}
      <div className="sim-settings-section">
        <div className="sim-settings-label">{copy.settings.manageBarang}</div>
        <div className="sim-settings-card">
          <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>{copy.settings.manageBarangDesc}</div>
          <div className="sim-settings-label" style={{ marginBottom: 4 }}>{copy.settings.categories}</div>
          {menuCategories.map((cat) => (
            <div key={cat.id} className="sim-category-row">
              <span className="sim-category-name">{cat.name}</span>
              <button
                className="sim-category-delete"
                onClick={() => dispatch({ type: "DELETE_CATEGORY", id: cat.id })}
              >
                &#x2715;
              </button>
            </div>
          ))}
          <div className="sim-add-row">
            <input
              className="sim-input"
              placeholder={copy.settings.addCategory}
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddMenuCategory()}
            />
            <button className="sim-btn sim-btn-primary sim-btn-sm" onClick={handleAddMenuCategory}>+</button>
          </div>
          <button
            className="sim-btn sim-btn-ghost sim-btn-full"
            style={{ marginTop: 8 }}
            onClick={() => dispatch({ type: "SET_TAB", tab: "products" })}
          >
            {copy.settings.manageBarang} ›
          </button>
        </div>
      </div>

      {/* Manajemen Bahan Baku — Raw material categories */}
      <div className="sim-settings-section">
        <div className="sim-settings-label">{copy.settings.manageBahanBaku}</div>
        <div className="sim-settings-card">
          <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>{copy.settings.manageBahanBakuDesc}</div>
          <div className="sim-settings-label" style={{ marginBottom: 4 }}>{copy.settings.rawMaterialCategories}</div>
          {rawCategories.map((cat) => (
            <div key={cat.id} className="sim-category-row">
              <span className="sim-category-name">{cat.name}</span>
              <button
                className="sim-category-delete"
                onClick={() => dispatch({ type: "DELETE_CATEGORY", id: cat.id })}
              >
                &#x2715;
              </button>
            </div>
          ))}
          <div className="sim-add-row">
            <input
              className="sim-input"
              placeholder={copy.settings.addRawMaterialCategory}
              value={newRawCategoryName}
              onChange={(e) => setNewRawCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddRawCategory()}
            />
            <button className="sim-btn sim-btn-primary sim-btn-sm" onClick={handleAddRawCategory}>+</button>
          </div>
          <button
            className="sim-btn sim-btn-ghost sim-btn-full"
            style={{ marginTop: 8 }}
            onClick={() => dispatch({ type: "SET_TAB", tab: "products" })}
          >
            {copy.settings.manageBahanBaku} ›
          </button>
        </div>
      </div>

      {/* Quick links */}
      <div className="sim-settings-section">
        <button
          className="sim-btn sim-btn-ghost sim-btn-full"
          style={{ marginBottom: 8 }}
          onClick={() => dispatch({ type: "SET_TAB", tab: "purchasing" })}
        >
          {copy.settings.manageVendors}
        </button>
        <button className="sim-btn sim-btn-ghost sim-btn-full" onClick={handleExport}>
          {copy.settings.exportCsv}
        </button>
      </div>

      {/* Logout */}
      <div className="sim-settings-section">
        <button
          className="sim-btn sim-btn-danger sim-btn-full"
          onClick={() => setShowLogoutConfirm(true)}
        >
          {copy.settings.logout}
        </button>
      </div>

      {showLogoutConfirm && (
        <ConfirmDialog
          message={copy.settings.logoutConfirm}
          onConfirm={() => dispatch({ type: "LOGOUT" })}
        />
      )}

      {exportToast && (
        <div className="sim-toast">{copy.settings.exportSuccess}</div>
      )}
    </div>
  );
}
