"use client";

import { useMemo, useState } from "react";
import { useErp } from "../store";
import { getErpCopy } from "../i18n";
import { formatRupiah } from "../utils";
import * as repo from "@/lib/supabase/repositories";
import type { DbProduct, DbCategory } from "@/lib/supabase/types";

type InventoryUnit = string;

interface FormVariant {
  id: string | null;
  name: string;
  price_adjustment: string;
}

interface FormComponent {
  id: string | null;
  component_product_id: string;
  required_qty: string;
  unit: InventoryUnit;
}

type Tab = "products" | "categories";

export default function ProductsScreen() {
  const { state, dispatch, supabase, tenantId, locale } = useErp();
  const copy = getErpCopy(locale);
  const isOwner = state.user?.role === "OWNER";

  const [tab, setTab] = useState<Tab>("products");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Variants state
  const [formVariants, setFormVariants] = useState<FormVariant[]>([]);

  // BOM state
  const [formComponents, setFormComponents] = useState<FormComponent[]>([]);

  // Category form state
  const [catName, setCatName] = useState("");
  const [catOrder, setCatOrder] = useState("0");

  const filteredProducts = useMemo(() => {
    let list = state.products.filter((p) => p.product_type === "MENU_ITEM");
    if (filterCategory) {
      list = list.filter((p) => p.category_id === filterCategory);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [state.products, filterCategory, search]);

  const categories = useMemo(
    () => state.categories.filter((c) => c.category_type === "MENU"),
    [state.categories]
  );

  const getCategoryName = (id: string | null) => {
    if (!id) return copy.products.noCategory;
    return state.categories.find((c) => c.id === id)?.name || copy.products.noCategory;
  };

  const rawMaterials = useMemo(
    () => state.products.filter((p) => p.product_type === "RAW_MATERIAL" && p.is_active),
    [state.products]
  );

  const getInventoryUnit = (productId: string): InventoryUnit => {
    const inv = state.inventory.find((i) => i.product_id === productId && i.variant_id === "");
    return inv?.unit || "pcs";
  };

  const getCompatibleUnits = (baseUnit: InventoryUnit): InventoryUnit[] => {
    if (baseUnit === "g" || baseUnit === "kg") return ["g", "kg"];
    if (baseUnit === "mL" || baseUnit === "L") return ["mL", "L"];
    return [baseUnit]; // pcs or unknown — no conversion
  };

  const openCreate = () => {
    setEditId(null);
    setFormName("");
    setFormPrice("");
    setFormCategory("");
    setFormDescription("");
    setFormActive(true);
    setFormVariants([]);
    setFormComponents([]);
    setShowForm(true);
  };

  const openEdit = (product: DbProduct) => {
    setEditId(product.id);
    setFormName(product.name);
    setFormPrice(String(product.price));
    setFormCategory(product.category_id || "");
    setFormDescription(product.description || "");
    setFormActive(product.is_active);
    const existingVariants = state.variants
      .filter((v) => v.product_id === product.id)
      .map((v) => ({ id: v.id, name: v.name, price_adjustment: String(v.price_adjustment) }));
    setFormVariants(existingVariants);
    const existingComponents = state.productComponents
      .filter((c) => c.parent_product_id === product.id)
      .map((c) => ({
        id: c.id,
        component_product_id: c.component_product_id,
        required_qty: String(c.required_qty),
        unit: c.unit || "pcs",
      }));
    setFormComponents(existingComponents);
    setShowForm(true);
  };

  // Variant helpers
  const addVariant = () =>
    setFormVariants((prev) => [...prev, { id: null, name: "", price_adjustment: "0" }]);

  const removeVariant = (idx: number) =>
    setFormVariants((prev) => prev.filter((_, i) => i !== idx));

  const updateVariant = (idx: number, field: keyof FormVariant, value: string) =>
    setFormVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));

  // BOM helpers
  const addComponent = () =>
    setFormComponents((prev) => [...prev, { id: null, component_product_id: "", required_qty: "1", unit: "pcs" }]);

  const removeComponent = (idx: number) =>
    setFormComponents((prev) => prev.filter((_, i) => i !== idx));

  const updateComponent = (idx: number, field: keyof FormComponent, value: string) => {
    setFormComponents((prev) =>
      prev.map((c, i) => {
        if (i !== idx) return c;
        const updated = { ...c, [field]: value };
        // Auto-fill unit from selected raw material's inventory (read-only)
        if (field === "component_product_id") {
          updated.unit = value ? getInventoryUnit(value) : "pcs";
        }
        return updated;
      })
    );
  };

  const handleSaveProduct = async () => {
    setSaving(true);
    try {
      const now = Date.now();
      let productId = editId;

      if (editId) {
        const updated = await repo.updateProduct(supabase, editId, {
          name: formName,
          price: parseInt(formPrice) || 0,
          category_id: formCategory || null,
          description: formDescription || null,
          is_active: formActive,
        });
        dispatch({ type: "UPSERT", table: "products", payload: updated as unknown as Record<string, unknown> });
      } else {
        productId = crypto.randomUUID();
        const created = await repo.createProduct(supabase, {
          id: productId,
          tenant_id: tenantId,
          name: formName,
          price: parseInt(formPrice) || 0,
          category_id: formCategory || null,
          description: formDescription || null,
          image_path: null,
          is_active: formActive,
          product_type: "MENU_ITEM",
          updated_at: now,
        });
        dispatch({ type: "UPSERT", table: "products", payload: created as unknown as Record<string, unknown> });
      }

      if (!productId) throw new Error("No product ID");

      // Save variants: delete old, insert new
      const oldVariants = state.variants.filter((v) => v.product_id === productId);
      for (const v of oldVariants) {
        await repo.deleteVariant(supabase, v.id);
        dispatch({ type: "DELETE", table: "variants", id: v.id });
      }
      for (const fv of formVariants) {
        if (!fv.name.trim()) continue;
        const saved = await repo.createVariant(supabase, {
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          product_id: productId,
          name: fv.name.trim(),
          price_adjustment: parseInt(fv.price_adjustment) || 0,
          updated_at: now,
        });
        dispatch({ type: "UPSERT", table: "variants", payload: saved as unknown as Record<string, unknown> });
      }

      // Save BOM components
      const validComponents = formComponents.filter(
        (c) => c.component_product_id && parseFloat(c.required_qty) > 0
      );
      const savedComponents = await repo.setProductComponents(
        supabase,
        productId,
        validComponents.map((c, idx) => ({
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          parent_product_id: productId!,
          component_product_id: c.component_product_id,
          component_variant_id: "",
          required_qty: parseFloat(c.required_qty),
          unit: c.unit,
          sort_order: idx,
          updated_at: now,
        }))
      );
      const oldComponents = state.productComponents.filter((c) => c.parent_product_id === productId);
      for (const oc of oldComponents) {
        dispatch({ type: "DELETE", table: "productComponents", id: oc.id });
      }
      for (const sc of savedComponents) {
        dispatch({ type: "UPSERT", table: "productComponents", payload: sc as unknown as Record<string, unknown> });
      }

      setShowForm(false);
    } catch (err) {
      console.error("Save product failed:", err);
    }
    setSaving(false);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm(copy.common.deleteWarning)) return;
    try {
      await repo.deleteProduct(supabase, id);
      dispatch({ type: "DELETE", table: "products", id });
    } catch (err) {
      console.error("Delete product failed:", err);
    }
  };

  const handleCloneProduct = async (product: DbProduct) => {
    try {
      const now = Date.now();
      const newId = crypto.randomUUID();
      const cloned = await repo.createProduct(supabase, {
        ...product,
        id: newId,
        name: `${product.name} (Copy)`,
        updated_at: now,
      });
      dispatch({ type: "UPSERT", table: "products", payload: cloned as unknown as Record<string, unknown> });

      // Clone variants
      const variants = state.variants.filter((v) => v.product_id === product.id);
      for (const v of variants) {
        const clonedV = await repo.createVariant(supabase, {
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          product_id: newId,
          name: v.name,
          price_adjustment: v.price_adjustment,
          updated_at: now,
        });
        dispatch({ type: "UPSERT", table: "variants", payload: clonedV as unknown as Record<string, unknown> });
      }

      // Clone BOM components
      const components = state.productComponents.filter((c) => c.parent_product_id === product.id);
      if (components.length > 0) {
        const clonedComponents = await repo.setProductComponents(
          supabase,
          newId,
          components.map((comp, idx) => ({
            id: crypto.randomUUID(),
            tenant_id: tenantId,
            parent_product_id: newId,
            component_product_id: comp.component_product_id,
            component_variant_id: comp.component_variant_id,
            required_qty: comp.required_qty,
            unit: comp.unit,
            sort_order: idx,
            updated_at: now,
          }))
        );
        for (const sc of clonedComponents) {
          dispatch({ type: "UPSERT", table: "productComponents", payload: sc as unknown as Record<string, unknown> });
        }
      }
    } catch (err) {
      console.error("Clone failed:", err);
    }
  };

  // Category CRUD
  const openCreateCategory = () => {
    setEditCategoryId(null);
    setCatName("");
    setCatOrder("0");
    setShowCategoryForm(true);
  };

  const openEditCategory = (cat: DbCategory) => {
    setEditCategoryId(cat.id);
    setCatName(cat.name);
    setCatOrder(String(cat.sort_order));
    setShowCategoryForm(true);
  };

  const handleSaveCategory = async () => {
    setSaving(true);
    try {
      if (editCategoryId) {
        const updated = await repo.updateCategory(supabase, editCategoryId, {
          name: catName,
          sort_order: parseInt(catOrder) || 0,
        });
        dispatch({ type: "UPSERT", table: "categories", payload: updated as unknown as Record<string, unknown> });
      } else {
        const created = await repo.createCategory(supabase, {
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          name: catName,
          sort_order: parseInt(catOrder) || 0,
          category_type: "MENU",
          updated_at: Date.now(),
        });
        dispatch({ type: "UPSERT", table: "categories", payload: created as unknown as Record<string, unknown> });
      }
      setShowCategoryForm(false);
    } catch (err) {
      console.error("Save category failed:", err);
    }
    setSaving(false);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm(copy.common.deleteWarning)) return;
    try {
      await repo.deleteCategory(supabase, id);
      dispatch({ type: "DELETE", table: "categories", id });
    } catch (err) {
      console.error("Delete category failed:", err);
    }
  };

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">{copy.products.title}</h1>
        {tab === "products" ? (
          <button className="erp-btn erp-btn--primary erp-btn--sm" onClick={openCreate}>
            {copy.products.addProduct}
          </button>
        ) : isOwner ? (
          <button className="erp-btn erp-btn--primary erp-btn--sm" onClick={openCreateCategory}>
            {copy.products.addCategory}
          </button>
        ) : null}
      </div>

      {/* Tab selector */}
      <div className="erp-tabs">
        <button
          className={`erp-tab${tab === "products" ? " erp-tab--active" : ""}`}
          onClick={() => setTab("products")}
        >
          {copy.products.title}
        </button>
        <button
          className={`erp-tab${tab === "categories" ? " erp-tab--active" : ""}`}
          onClick={() => setTab("categories")}
        >
          {copy.products.categories}
        </button>
      </div>

      {tab === "products" && (
        <>
          {/* Category filter chips */}
          <div className="erp-filter-bar">
            <span
              className={`erp-chip${filterCategory === "" ? " erp-chip--active" : ""}`}
              onClick={() => setFilterCategory("")}
            >
              {copy.pos.allCategories}
            </span>
            {categories.map((c) => (
              <span
                key={c.id}
                className={`erp-chip${filterCategory === c.id ? " erp-chip--active" : ""}`}
                onClick={() => setFilterCategory(filterCategory === c.id ? "" : c.id)}
              >
                {c.name}
              </span>
            ))}
          </div>

          <div className="erp-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder={copy.common.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Products table */}
          <div className="erp-table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>{copy.products.name}</th>
                  <th>{copy.products.category}</th>
                  <th>{copy.products.price}</th>
                  <th>{copy.products.active}</th>
                  <th>{copy.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "var(--erp-muted)" }}>
                      {copy.products.noProducts}
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.name}</strong>
                        {state.variants.filter((v) => v.product_id === p.id).length > 0 && (
                          <span className="erp-badge erp-badge--info" style={{ marginLeft: 8 }}>
                            {state.variants.filter((v) => v.product_id === p.id).length} {copy.products.variants.toLowerCase()}
                          </span>
                        )}
                        {state.productComponents.filter((c) => c.parent_product_id === p.id).length > 0 && (
                          <span className="erp-badge erp-badge--warning" style={{ marginLeft: 4 }}>
                            {state.productComponents.filter((c) => c.parent_product_id === p.id).length} BOM
                          </span>
                        )}
                      </td>
                      <td>{getCategoryName(p.category_id)}</td>
                      <td>{formatRupiah(p.price)}</td>
                      <td>
                        <span className={`erp-badge ${p.is_active ? "erp-badge--success" : "erp-badge--danger"}`}>
                          {p.is_active ? copy.products.active : copy.products.inactive}
                        </span>
                      </td>
                      <td className="erp-td-actions">
                        <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => openEdit(p)}>
                          {copy.common.edit}
                        </button>
                        {isOwner && (
                          <>
                            <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => handleCloneProduct(p)}>
                              {copy.products.clone}
                            </button>
                            <button
                              className="erp-btn erp-btn--ghost erp-btn--sm"
                              style={{ color: "var(--erp-danger)" }}
                              onClick={() => handleDeleteProduct(p.id)}
                            >
                              {copy.common.delete}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "categories" && (
        <div className="erp-table-wrap">
          <table className="erp-table">
            <thead>
              <tr>
                <th>{copy.products.categoryName}</th>
                <th>{copy.products.sortOrder}</th>
                <th>{copy.purchasing.itemCount}</th>
                <th>{copy.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "var(--erp-muted)" }}>
                    {copy.purchasing.noCategories}
                  </td>
                </tr>
              ) : (
                categories.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td>{c.sort_order}</td>
                    <td>
                      {state.products.filter((p) => p.product_type === "MENU_ITEM" && p.category_id === c.id).length}
                    </td>
                    <td className="erp-td-actions">
                      {isOwner && (
                        <>
                          <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => openEditCategory(c)}>
                            {copy.common.edit}
                          </button>
                          <button
                            className="erp-btn erp-btn--ghost erp-btn--sm"
                            style={{ color: "var(--erp-danger)" }}
                            onClick={() => handleDeleteCategory(c.id)}
                          >
                            {copy.common.delete}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Product form dialog */}
      {showForm && (
        <div className="erp-overlay" onClick={() => setShowForm(false)}>
          <div className="erp-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{editId ? copy.products.editProduct : copy.products.addProduct}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowForm(false)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              <div className="erp-input-group">
                <label className="erp-label">{copy.products.name}</label>
                <input className="erp-input" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div className="erp-input-group">
                <label className="erp-label">{copy.products.price}</label>
                <input className="erp-input" type="number" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} />
              </div>
              <div className="erp-input-group">
                <label className="erp-label">{copy.products.category}</label>
                <select className="erp-select" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                  <option value="">{copy.products.noCategory}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="erp-input-group">
                <label className="erp-label">{copy.products.description}</label>
                <input className="erp-input" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
              </div>
              <div className="erp-settings-row">
                <span className="erp-settings-row-label">{copy.products.active}</span>
                <label className="erp-toggle">
                  <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} />
                  <span className="erp-toggle-slider" />
                </label>
              </div>

              {/* Variants section */}
              <div className="erp-form-section">
                <div className="erp-form-section-header">
                  <span className="erp-form-section-title">{copy.products.variants}</span>
                  <button type="button" className="erp-btn erp-btn--ghost erp-btn--sm" onClick={addVariant}>
                    + {copy.products.addVariant}
                  </button>
                </div>
                {formVariants.length > 0 && (
                  <div className="erp-variant-list">
                    {formVariants.map((fv, idx) => (
                      <div key={idx} className="erp-variant-row">
                        <input
                          className="erp-input erp-variant-name"
                          placeholder={copy.products.variantName}
                          value={fv.name}
                          onChange={(e) => updateVariant(idx, "name", e.target.value)}
                        />
                        <input
                          className="erp-input erp-variant-price"
                          type="number"
                          placeholder={copy.products.priceAdjustment}
                          value={fv.price_adjustment}
                          onChange={(e) => updateVariant(idx, "price_adjustment", e.target.value)}
                        />
                        <button
                          type="button"
                          className="erp-btn erp-btn--ghost erp-btn--sm erp-btn--icon"
                          style={{ color: "var(--erp-danger)" }}
                          onClick={() => removeVariant(idx)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* BOM section */}
              <div className="erp-form-section">
                <div className="erp-form-section-header">
                  <span className="erp-form-section-title">{copy.products.bom}</span>
                  <button type="button" className="erp-btn erp-btn--ghost erp-btn--sm" onClick={addComponent}>
                    + {copy.products.addComponent}
                  </button>
                </div>
                {formComponents.length > 0 && (
                  <div className="erp-bom-list">
                    {formComponents.map((fc, idx) => {
                      const usedIds = formComponents
                        .filter((_, i) => i !== idx)
                        .map((c) => c.component_product_id);
                      const available = rawMaterials.filter(
                        (rm) => !usedIds.includes(rm.id) || rm.id === fc.component_product_id
                      );
                      return (
                        <div key={idx} className="erp-bom-row">
                          <select
                            className="erp-select erp-bom-material"
                            value={fc.component_product_id}
                            onChange={(e) => updateComponent(idx, "component_product_id", e.target.value)}
                          >
                            <option value="">{copy.products.rawMaterial}</option>
                            {available.map((rm) => (
                              <option key={rm.id} value={rm.id}>{rm.name}</option>
                            ))}
                          </select>
                          <input
                            className="erp-input erp-bom-qty"
                            type="number"
                            min="0"
                            step="any"
                            placeholder={copy.products.qty}
                            value={fc.required_qty}
                            onChange={(e) => updateComponent(idx, "required_qty", e.target.value)}
                          />
                          {(() => {
                            const base = fc.component_product_id ? getInventoryUnit(fc.component_product_id) : "pcs";
                            const units = getCompatibleUnits(base);
                            return units.length > 1 ? (
                              <select
                                className="erp-select erp-bom-unit"
                                value={fc.unit || base}
                                onChange={(e) => updateComponent(idx, "unit", e.target.value)}
                              >
                                {units.map((u) => <option key={u} value={u}>{u}</option>)}
                              </select>
                            ) : (
                              <span className="erp-bom-unit-label">{fc.unit || base}</span>
                            );
                          })()}
                          <button
                            type="button"
                            className="erp-btn erp-btn--ghost erp-btn--sm erp-btn--icon"
                            style={{ color: "var(--erp-danger)" }}
                            onClick={() => removeComponent(idx)}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowForm(false)}>
                {copy.common.cancel}
              </button>
              <button className="erp-btn erp-btn--primary" onClick={handleSaveProduct} disabled={saving || !formName}>
                {saving ? copy.common.loading : copy.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category form dialog */}
      {showCategoryForm && (
        <div className="erp-overlay" onClick={() => setShowCategoryForm(false)}>
          <div className="erp-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{editCategoryId ? copy.products.editCategory : copy.products.addCategory}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowCategoryForm(false)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              <div className="erp-input-group">
                <label className="erp-label">{copy.products.categoryName}</label>
                <input className="erp-input" value={catName} onChange={(e) => setCatName(e.target.value)} />
              </div>
              <div className="erp-input-group">
                <label className="erp-label">{copy.products.sortOrder}</label>
                <input className="erp-input" type="number" value={catOrder} onChange={(e) => setCatOrder(e.target.value)} />
              </div>
            </div>
            <div className="erp-dialog-footer">
              {editCategoryId && isOwner && (
                <button
                  className="erp-btn erp-btn--danger erp-btn--sm"
                  onClick={() => { handleDeleteCategory(editCategoryId); setShowCategoryForm(false); }}
                  style={{ marginRight: "auto" }}
                >
                  {copy.common.delete}
                </button>
              )}
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowCategoryForm(false)}>
                {copy.common.cancel}
              </button>
              <button className="erp-btn erp-btn--primary" onClick={handleSaveCategory} disabled={saving || !catName}>
                {saving ? copy.common.loading : copy.common.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
