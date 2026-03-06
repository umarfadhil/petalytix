"use client";

import { useState, useMemo } from "react";
import { useSimulator } from "../context";
import { formatRupiah } from "../constants";
import type { ProductType } from "../types";

export default function ProductsScreen() {
  const { state, dispatch, copy } = useSimulator();
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ProductType>("MENU_ITEM");

  const filteredProducts = useMemo(() => {
    return state.products.filter((p) => {
      const matchType = p.productType === typeFilter;
      const matchSearch = search.trim() === "" || p.name.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    });
  }, [state.products, typeFilter, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof filteredProducts> = {};
    for (const p of filteredProducts) {
      const catId = p.categoryId || "__none__";
      if (!groups[catId]) groups[catId] = [];
      groups[catId].push(p);
    }
    return groups;
  }, [filteredProducts]);

  function getCategoryName(catId: string): string {
    if (catId === "__none__") return copy.products.noCategory;
    return state.categories.find((c) => c.id === catId)?.name ?? copy.products.noCategory;
  }

  return (
    <div className="sim-screen">
      {/* Type toggle + Add button */}
      <div className="sim-section-pad" style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <button
          className={`sim-chip${typeFilter === "MENU_ITEM" ? " active" : ""}`}
          onClick={() => setTypeFilter("MENU_ITEM")}
        >
          {copy.products.menuItems}
        </button>
        <button
          className={`sim-chip${typeFilter === "RAW_MATERIAL" ? " active" : ""}`}
          onClick={() => setTypeFilter("RAW_MATERIAL")}
        >
          {copy.products.rawMaterials}
        </button>
        <div style={{ flex: 1 }} />
        <button
          className="sim-btn sim-btn-primary sim-btn-sm"
          onClick={() => { setEditingProduct(null); setShowForm(true); }}
        >
          +
        </button>
      </div>

      {/* Search */}
      <div className="sim-section-pad" style={{ paddingTop: 0 }}>
        <input
          className="sim-input"
          placeholder={copy.products.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredProducts.length === 0 ? (
        <div className="sim-empty">
          <span className="sim-empty-icon">&#x1F374;</span>
          {copy.products.noProducts}
        </div>
      ) : (
        Object.entries(grouped).map(([catId, products]) => (
          <div key={catId}>
            <div className="sim-category-header">{getCategoryName(catId)}</div>
            {products.map((p) => {
              const variants = state.variants.filter((v) => v.productId === p.id);
              return (
                <div
                  key={p.id}
                  className="sim-product-list-item"
                  onClick={() => { setEditingProduct(p.id); setShowForm(true); }}
                >
                  <div className="sim-product-list-info">
                    <div className="sim-product-list-name">{p.name}</div>
                    <div className="sim-product-list-meta">
                      {variants.length > 0 && `${variants.length} ${copy.products.variants.toLowerCase()}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="sim-product-list-price">{formatRupiah(p.price)}</span>
                    <button
                      className="sim-btn-ghost"
                      style={{ border: "1px solid rgba(0,0,0,0.1)", borderRadius: 6, padding: "3px 8px", fontSize: 11, color: "#888", background: "none", cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch({ type: "CLONE_PRODUCT", id: p.id });
                      }}
                      title={copy.products.clone}
                    >
                      &#x2398;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}

      {/* Product form dialog */}
      {showForm && (
        <ProductFormDialog
          productId={editingProduct}
          defaultType={typeFilter}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function ProductFormDialog({
  productId,
  defaultType,
  onClose,
}: {
  productId: string | null;
  defaultType: ProductType;
  onClose: () => void;
}) {
  const { state, dispatch, copy } = useSimulator();
  const existing = productId ? state.products.find((p) => p.id === productId) : null;

  const [name, setName] = useState(existing?.name ?? "");
  const [price, setPrice] = useState(existing?.price?.toString() ?? "");
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? "");
  const [productType, setProductType] = useState<ProductType>(existing?.productType ?? defaultType);

  const relevantCategories = state.categories.filter(
    (c) => productType === "RAW_MATERIAL" ? c.categoryType === "RAW_MATERIAL" : c.categoryType === "MENU"
  );

  function handleSave() {
    const priceNum = parseInt(price) || 0;
    if (!name.trim()) return;
    if (productType === "MENU_ITEM" && priceNum <= 0) return;

    if (existing) {
      dispatch({ type: "UPDATE_PRODUCT", id: existing.id, updates: { name: name.trim(), price: priceNum, categoryId } });
    } else {
      dispatch({ type: "ADD_PRODUCT", product: { categoryId, name: name.trim(), price: priceNum, productType, isActive: true } });
    }

    onClose();
  }

  function handleDelete() {
    if (existing) dispatch({ type: "DELETE_PRODUCT", id: existing.id });
    onClose();
  }

  function handleClone() {
    if (existing) dispatch({ type: "CLONE_PRODUCT", id: existing.id });
    onClose();
  }

  const isMenuItem = productType === "MENU_ITEM";

  return (
    <div className="sim-dialog-overlay" onClick={onClose}>
      <div className="sim-dialog sim-form-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="sim-dialog-title">
          {existing ? copy.products.edit : copy.products.add}
        </h3>
        {!existing && (
          <div className="sim-field">
            <label className="sim-label">{copy.products.productType}</label>
            <select value={productType} onChange={(e) => setProductType(e.target.value as ProductType)}>
              <option value="MENU_ITEM">{copy.products.menuItems}</option>
              <option value="RAW_MATERIAL">{copy.products.rawMaterials}</option>
            </select>
          </div>
        )}
        <div className="sim-field">
          <label className="sim-label">{copy.products.name}</label>
          <input className="sim-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        {isMenuItem && (
          <div className="sim-field">
            <label className="sim-label">{copy.products.price}</label>
            <input className="sim-input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        )}
        <div className="sim-field">
          <label className="sim-label">{copy.products.category}</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">{copy.products.noCategory}</option>
            {relevantCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="sim-dialog-actions">
          {existing && (
            <>
              <button className="sim-btn sim-btn-danger sim-btn-sm" onClick={handleDelete}>
                {copy.products.delete}
              </button>
              <button className="sim-btn sim-btn-ghost sim-btn-sm" onClick={handleClone} title={copy.products.clone}>
                &#x2398;
              </button>
            </>
          )}
          <div style={{ flex: 1 }} />
          <button className="sim-btn sim-btn-ghost sim-btn-sm" onClick={onClose}>{copy.products.cancel}</button>
          <button className="sim-btn sim-btn-primary sim-btn-sm" onClick={handleSave}>{copy.products.save}</button>
        </div>
      </div>
    </div>
  );
}
