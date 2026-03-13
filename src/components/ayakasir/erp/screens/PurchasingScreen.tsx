"use client";

import React, { useMemo, useState } from "react";
import { useErp } from "../store";
import { getErpCopy } from "../i18n";
import { formatRupiah, formatDate } from "../utils";
import * as repo from "@/lib/supabase/repositories";
import type { DbVendor, DbGoodsReceiving, DbGoodsReceivingItem, DbGeneralLedger, DbProduct, DbCategory } from "@/lib/supabase/types";

type Tab = "receiving" | "vendors" | "rawMaterials" | "categories";

interface FormItem {
  productId: string;
  variantId: string;
  qty: string;
  costPerUnit: string;
  unit: string;
}

export default function PurchasingScreen() {
  const { state, dispatch, supabase, tenantId, locale } = useErp();
  const copy = getErpCopy(locale);
  const isOwner = state.user?.role === "OWNER";

  const [tab, setTab] = useState<Tab>("receiving");
  const [showReceivingForm, setShowReceivingForm] = useState(false);
  const [expandedReceivingId, setExpandedReceivingId] = useState<string | null>(null);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [editVendorId, setEditVendorId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Receiving form state
  const [editReceivingId, setEditReceivingId] = useState<string | null>(null);
  const [recVendor, setRecVendor] = useState("");
  const [recNotes, setRecNotes] = useState("");
  const [recItems, setRecItems] = useState<FormItem[]>([{ productId: "", variantId: "", qty: "", costPerUnit: "", unit: "" }]);
  // Index of the item row that triggered inline new-raw-material creation (-1 = none)
  const [pendingRawItemIdx, setPendingRawItemIdx] = useState<number>(-1);
  // Whether the raw category form was opened from within the raw material form
  const [rawCatFromRawForm, setRawCatFromRawForm] = useState(false);

  // Vendor form state
  const [vendorName, setVendorName] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");

  // Raw material product form state
  const [showRawForm, setShowRawForm] = useState(false);
  const [editRawId, setEditRawId] = useState<string | null>(null);
  const [rawName, setRawName] = useState("");
  const [rawCategory, setRawCategory] = useState("");
  const [rawDescription, setRawDescription] = useState("");
  const [rawActive, setRawActive] = useState(true);
  const [rawUnit, setRawUnit] = useState("pcs");

  // Raw material category form state
  const [showRawCatForm, setShowRawCatForm] = useState(false);
  const [editRawCatId, setEditRawCatId] = useState<string | null>(null);
  const [rawCatName, setRawCatName] = useState("");
  const [rawCatOrder, setRawCatOrder] = useState("0");

  const [rawSearch, setRawSearch] = useState("");
  const [filterRawCategory, setFilterRawCategory] = useState("");

  // Receiving filters
  const [filterDate, setFilterDate] = useState("");
  const [filterVendorId, setFilterVendorId] = useState("");
  const [filterItemName, setFilterItemName] = useState("");

  const rawMaterials = useMemo(
    () => state.products.filter((p) => p.product_type === "RAW_MATERIAL"),
    [state.products]
  );

  const rawCategories = useMemo(
    () => state.categories.filter((c) => c.category_type === "RAW_MATERIAL"),
    [state.categories]
  );

  const filteredReceivings = useMemo(() => {
    let list = [...state.goodsReceivings].sort((a, b) => b.date - a.date);
    if (filterDate) {
      list = list.filter((r) => {
        const d = new Date(r.date);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}` === filterDate;
      });
    }
    if (filterVendorId) {
      list = list.filter((r) => r.vendor_id === filterVendorId);
    }
    if (filterItemName) {
      const q = filterItemName.toLowerCase();
      const matchingProductIds = state.products
        .filter((p) => p.name.toLowerCase().includes(q))
        .map((p) => p.id);
      const matchingReceivingIds = new Set(
        state.goodsReceivingItems
          .filter((i) => matchingProductIds.includes(i.product_id))
          .map((i) => i.receiving_id)
      );
      list = list.filter((r) => matchingReceivingIds.has(r.id));
    }
    return list;
  }, [state.goodsReceivings, state.goodsReceivingItems, state.products, filterDate, filterVendorId, filterItemName]);

  const filteredRawMaterials = useMemo(() => {
    let list = rawMaterials;
    if (filterRawCategory) {
      list = list.filter((p) => p.category_id === filterRawCategory);
    }
    if (rawSearch) {
      const q = rawSearch.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [rawMaterials, filterRawCategory, rawSearch]);

  const getRawCategoryName = (id: string | null) => {
    if (!id) return copy.products.noCategory;
    return state.categories.find((c) => c.id === id)?.name || copy.products.noCategory;
  };

  const getRawInventoryUnit = (productId: string) => {
    return state.inventory.find((i) => i.product_id === productId && i.variant_id === "")?.unit || "—";
  };

  const getVendorName = (id: string | null) =>
    state.vendors.find((v) => v.id === id)?.name || "—";

  const getProductName = (id: string) =>
    state.products.find((p) => p.id === id)?.name || "—";

  const getReceivingTotal = (receivingId: string) =>
    state.goodsReceivingItems
      .filter((i) => i.receiving_id === receivingId)
      .reduce((sum, i) => sum + i.qty * i.cost_per_unit, 0);

  // Receiving CRUD
  const openCreateReceiving = () => {
    setEditReceivingId(null);
    setRecVendor("");
    setRecNotes("");
    setRecItems([{ productId: "", variantId: "", qty: "", costPerUnit: "", unit: "" }]);
    setShowReceivingForm(true);
  };

  const openEditReceiving = (r: DbGoodsReceiving) => {
    setEditReceivingId(r.id);
    setRecVendor(r.vendor_id || "");
    setRecNotes(r.notes || "");
    const existingItems = state.goodsReceivingItems
      .filter((i) => i.receiving_id === r.id)
      .map((i) => {
        // Convert base unit back to display unit for the form (g→kg, mL→L)
        let displayQty = i.qty;
        let displayUnit = i.unit;
        if (i.unit === "g") { displayQty = i.qty / 1000; displayUnit = "kg"; }
        else if (i.unit === "mL") { displayQty = i.qty / 1000; displayUnit = "L"; }
        return {
          productId: i.product_id,
          variantId: i.variant_id || "",
          qty: String(displayQty),
          costPerUnit: String(i.qty * i.cost_per_unit),
          unit: displayUnit,
        };
      });
    setRecItems(existingItems.length > 0 ? existingItems : [{ productId: "", variantId: "", qty: "", costPerUnit: "", unit: "" }]);
    setShowReceivingForm(true);
  };

  const addRecItem = () => {
    setRecItems([...recItems, { productId: "", variantId: "", qty: "", costPerUnit: "", unit: "" }]);
  };

  const fmtNum = (raw: string) =>
    raw === "" ? "" : Number(raw.replace(/\D/g, "")).toLocaleString("id-ID");

  const parseNum = (formatted: string) => formatted.replace(/\D/g, "");

  const updateRecItem = (idx: number, field: keyof FormItem, value: string) => {
    const next = [...recItems];
    // qty allows decimals (e.g. 1,5 kg) — store raw; costPerUnit is integer currency — strip non-digits
    const stored = field === "costPerUnit" ? parseNum(value) : value;
    next[idx] = { ...next[idx], [field]: stored };
    // Auto-set unit from inventory — show user-friendly unit (mL→L, g→kg) for input
    if (field === "productId") {
      const inv = state.inventory.find((i) => i.product_id === value);
      if (inv) {
        const displayUnit = inv.unit === "mL" ? "L" : inv.unit === "g" ? "kg" : inv.unit;
        next[idx].unit = displayUnit;
      }
    }
    setRecItems(next);
  };

  const removeRecItem = (idx: number) => {
    setRecItems(recItems.filter((_, i) => i !== idx));
  };

  const handleSaveReceiving = async () => {
    if (!recVendor) {
      alert(copy.purchasing.vendorRequired);
      return;
    }
    setSaving(true);
    try {
      const now = Date.now();
      const isEdit = !!editReceivingId;
      const recId = isEdit ? editReceivingId! : crypto.randomUUID();

      const toBaseQty = (qty: number, unit: string): { qty: number; unit: string } => {
        if (unit === "L") return { qty: qty * 1000, unit: "mL" };
        if (unit === "kg") return { qty: qty * 1000, unit: "g" };
        return { qty, unit };
      };

      const header: Omit<DbGoodsReceiving, "sync_status"> = {
        id: recId,
        tenant_id: tenantId,
        vendor_id: recVendor || null,
        date: isEdit ? (state.goodsReceivings.find((r) => r.id === recId)?.date ?? now) : now,
        notes: recNotes || null,
        updated_at: now,
      };

      const items: Omit<DbGoodsReceivingItem, "sync_status">[] = recItems
        .filter((i) => i.productId)
        .map((i) => {
          const rawQty = parseFloat(i.qty.replace(",", ".")) || 0;
          // Convert to base unit so DB always stores integers (g, mL, pcs)
          const { qty: baseQty, unit: baseUnit } = toBaseQty(rawQty, i.unit);
          const totalCost = parseInt(i.costPerUnit) || 0;
          return {
            id: crypto.randomUUID(),
            tenant_id: tenantId,
            receiving_id: recId,
            product_id: i.productId,
            variant_id: i.variantId || "",
            qty: Math.round(baseQty),
            cost_per_unit: baseQty > 0 ? Math.round(totalCost / baseQty) : 0,
            unit: baseUnit,
            updated_at: now,
          };
        });

      // Fetch fresh inventory from DB — state.inventory may be stale if the mobile app
      // updated stock (sales, adjustments) since the last realtime event was received.
      const freshInventory = await repo.getInventory(supabase, tenantId);
      const inventorySnapshot = new Map(
        freshInventory.map((i) => [`${i.product_id}|${i.variant_id ?? ""}`, { ...i }])
      );

      if (isEdit) {
        // Reverse old items' inventory effect
        const oldItems = state.goodsReceivingItems.filter((i) => i.receiving_id === recId);
        for (const old of oldItems) {
          const { qty: oldBase, unit: oldBaseUnit } = toBaseQty(old.qty, old.unit);
          const key = `${old.product_id}|${old.variant_id ?? ""}`;
          const existing = inventorySnapshot.get(key);
          if (existing) {
            const currentBase = toBaseQty(existing.current_qty, existing.unit).qty;
            const newQtyBase = Math.max(0, Math.round(currentBase - oldBase));
            // Reversal: un-apply weighted-avg. Recover original avg_cogs before this purchase.
            // If we can, back-calculate: oldAvg = (currentAvg × currentQty - costPerBase × oldBase) / newQtyBase
            const costPerBase = old.cost_per_unit / (old.unit === "L" || old.unit === "kg" ? 1000 : 1);
            const recoveredAvg = newQtyBase > 0
              ? Math.max(0, ((existing.avg_cogs ?? 0) * currentBase - costPerBase * oldBase) / newQtyBase)
              : 0;
            const reversed = await repo.upsertInventory(supabase, {
              product_id: old.product_id,
              variant_id: old.variant_id,
              tenant_id: tenantId,
              current_qty: newQtyBase,
              min_qty: existing.min_qty,
              unit: oldBaseUnit,
              avg_cogs: Math.round(recoveredAvg),
              updated_at: now,
            });
            dispatch({ type: "UPSERT", table: "inventory", payload: reversed as unknown as Record<string, unknown> });
            inventorySnapshot.set(key, reversed);
          }
        }

        const result = await repo.updateGoodsReceiving(supabase, header, items);
        dispatch({ type: "UPSERT", table: "goodsReceivings", payload: result.header as unknown as Record<string, unknown> });
        // Remove old items from state then add new
        for (const old of oldItems) {
          dispatch({ type: "DELETE", table: "goodsReceivingItems", id: old.id });
        }
        for (const item of result.items) {
          dispatch({ type: "UPSERT", table: "goodsReceivingItems", payload: item as unknown as Record<string, unknown> });
        }

        // Update ledger: delete old COGS, create new
        await repo.deleteLedgerByReferenceId(supabase, recId);
      } else {
        const result = await repo.createGoodsReceiving(supabase, header, items);
        dispatch({ type: "UPSERT", table: "goodsReceivings", payload: result.header as unknown as Record<string, unknown> });
        for (const item of result.items) {
          dispatch({ type: "UPSERT", table: "goodsReceivingItems", payload: item as unknown as Record<string, unknown> });
        }
      }

      // Apply new items' inventory effect — read from snapshot, not state.inventory
      for (const item of items) {
        const { qty: receivedBase, unit: baseUnit } = toBaseQty(item.qty, item.unit);
        const key = `${item.product_id}|${item.variant_id ?? ""}`;
        const existing = inventorySnapshot.get(key);
        const currentBase = existing ? toBaseQty(existing.current_qty, existing.unit).qty : 0;
        // Weighted-average COGS: new purchase price in base units
        const costPerBase = item.cost_per_unit / (item.unit === "L" || item.unit === "kg" ? 1000 : 1);
        const newTotalQty = Math.round(currentBase + receivedBase);
        const newAvgCogs = newTotalQty > 0
          ? ((existing?.avg_cogs ?? 0) * currentBase + costPerBase * receivedBase) / newTotalQty
          : 0;
        const updated = await repo.upsertInventory(supabase, {
          product_id: item.product_id,
          variant_id: item.variant_id,
          tenant_id: tenantId,
          current_qty: newTotalQty,
          min_qty: existing?.min_qty || 0,
          unit: baseUnit,
          avg_cogs: Math.round(newAvgCogs),
          updated_at: now,
        });
        dispatch({ type: "UPSERT", table: "inventory", payload: updated as unknown as Record<string, unknown> });
        inventorySnapshot.set(key, updated);
      }

      // Create COGS ledger entry
      const totalCost = items.reduce((sum, i) => sum + i.qty * i.cost_per_unit, 0);
      if (totalCost > 0) {
        const ledger: Omit<DbGeneralLedger, "sync_status"> = {
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          type: "COGS",
          amount: -totalCost,
          reference_id: recId,
          description: "Goods receiving",
          date: now,
          user_id: state.user?.id || "",
          updated_at: now,
        };
        const savedLedger = await repo.createLedgerEntry(supabase, ledger);
        dispatch({ type: "UPSERT", table: "generalLedger", payload: savedLedger as unknown as Record<string, unknown> });
      }

      setShowReceivingForm(false);
    } catch (err) {
      console.error("Save receiving failed:", err);
    }
    setSaving(false);
  };

  const handleDeleteReceiving = async (id: string) => {
    if (!confirm(copy.common.deleteWarning)) return;
    try {
      const toBaseQty = (qty: number, unit: string): { qty: number; unit: string } => {
        if (unit === "L") return { qty: qty * 1000, unit: "mL" };
        if (unit === "kg") return { qty: qty * 1000, unit: "g" };
        return { qty, unit };
      };

      // Reverse inventory effect of the deleted receiving
      const oldItems = state.goodsReceivingItems.filter((i) => i.receiving_id === id);
      const now = Date.now();
      for (const old of oldItems) {
        const { qty: oldBase, unit: oldBaseUnit } = toBaseQty(old.qty, old.unit);
        const existing = state.inventory.find(
          (i) => i.product_id === old.product_id && (!i.variant_id || i.variant_id === old.variant_id)
        );
        if (existing) {
          const currentBase = toBaseQty(existing.current_qty, existing.unit).qty;
          const newQtyBase = Math.max(0, Math.round(currentBase - oldBase));
          // Reversal: back-calculate avg_cogs before this purchase was applied
          const costPerBase = old.cost_per_unit / (old.unit === "L" || old.unit === "kg" ? 1000 : 1);
          const recoveredAvg = newQtyBase > 0
            ? Math.max(0, ((existing.avg_cogs ?? 0) * currentBase - costPerBase * oldBase) / newQtyBase)
            : 0;
          const updated = await repo.upsertInventory(supabase, {
            product_id: old.product_id,
            variant_id: old.variant_id,
            tenant_id: tenantId,
            current_qty: newQtyBase,
            min_qty: existing.min_qty,
            unit: oldBaseUnit,
            avg_cogs: Math.round(recoveredAvg),
            updated_at: now,
          });
          dispatch({ type: "UPSERT", table: "inventory", payload: updated as unknown as Record<string, unknown> });
        }
      }

      await repo.deleteGoodsReceiving(supabase, id);
      dispatch({ type: "DELETE", table: "goodsReceivings", id });
      for (const old of oldItems) {
        dispatch({ type: "DELETE", table: "goodsReceivingItems", id: old.id });
      }
      // Also remove COGS ledger entry
      await repo.deleteLedgerByReferenceId(supabase, id);
    } catch (err) {
      console.error("Delete receiving failed:", err);
    }
  };

  // Vendor CRUD
  const openCreateVendor = () => {
    setEditVendorId(null);
    setVendorName("");
    setVendorPhone("");
    setVendorAddress("");
    setShowVendorForm(true);
  };

  const openEditVendor = (v: DbVendor) => {
    setEditVendorId(v.id);
    setVendorName(v.name);
    setVendorPhone(v.phone || "");
    setVendorAddress(v.address || "");
    setShowVendorForm(true);
  };

  const handleSaveVendor = async () => {
    const nameLower = vendorName.trim().toLowerCase();
    const duplicate = state.vendors.some(
      (v) => v.name.toLowerCase() === nameLower && v.id !== editVendorId
    );
    if (duplicate) {
      alert(copy.purchasing.duplicateVendor);
      return;
    }
    setSaving(true);
    try {
      if (editVendorId) {
        const updated = await repo.updateVendor(supabase, editVendorId, {
          name: vendorName.trim(),
          phone: vendorPhone || null,
          address: vendorAddress || null,
        });
        dispatch({ type: "UPSERT", table: "vendors", payload: updated as unknown as Record<string, unknown> });
      } else {
        const newId = crypto.randomUUID();
        const created = await repo.createVendor(supabase, {
          id: newId,
          tenant_id: tenantId,
          name: vendorName.trim(),
          phone: vendorPhone || null,
          address: vendorAddress || null,
          updated_at: Date.now(),
        });
        dispatch({ type: "UPSERT", table: "vendors", payload: created as unknown as Record<string, unknown> });
        // Auto-select the new vendor in the receiving form if it was open
        if (showReceivingForm) setRecVendor(newId);
      }
      setShowVendorForm(false);
    } catch (err) {
      console.error("Save vendor failed:", err);
    }
    setSaving(false);
  };

  const handleDeleteVendor = async (id: string) => {
    if (!confirm(copy.common.deleteWarning)) return;
    try {
      await repo.deleteVendor(supabase, id);
      dispatch({ type: "DELETE", table: "vendors", id });
    } catch (err) {
      console.error("Delete vendor failed:", err);
    }
  };

  // Raw material product CRUD
  const openCreateRaw = () => {
    setEditRawId(null);
    setRawName("");
    setRawCategory("");
    setRawDescription("");
    setRawActive(true);
    setRawUnit("pcs");
    setShowRawForm(true);
  };

  const openEditRaw = (p: DbProduct) => {
    setEditRawId(p.id);
    setRawName(p.name);
    setRawCategory(p.category_id || "");
    setRawDescription(p.description || "");
    setRawActive(p.is_active);
    const storedUnit = state.inventory.find((i) => i.product_id === p.id && (!i.variant_id || i.variant_id === ""))?.unit || "pcs";
    setRawUnit(storedUnit === "mL" ? "L" : storedUnit === "g" ? "kg" : storedUnit);
    setShowRawForm(true);
  };

  const handleSaveRaw = async () => {
    const nameLower = rawName.trim().toLowerCase();
    const duplicate = rawMaterials.some(
      (p) => p.name.toLowerCase() === nameLower && p.id !== editRawId
    );
    if (duplicate) {
      alert(copy.purchasing.duplicateRawMaterial);
      return;
    }
    setSaving(true);
    try {
      const now = Date.now();
      let productId = editRawId;
      if (editRawId) {
        const updated = await repo.updateProduct(supabase, editRawId, {
          name: rawName,
          category_id: rawCategory || null,
          description: rawDescription || null,
          is_active: rawActive,
        });
        dispatch({ type: "UPSERT", table: "products", payload: updated as unknown as Record<string, unknown> });
      } else {
        productId = crypto.randomUUID();
        const created = await repo.createProduct(supabase, {
          id: productId,
          tenant_id: tenantId,
          name: rawName.trim(),
          price: 0,
          category_id: rawCategory || null,
          description: rawDescription || null,
          image_path: null,
          is_active: rawActive,
          product_type: "RAW_MATERIAL",
          updated_at: now,
        });
        dispatch({ type: "UPSERT", table: "products", payload: created as unknown as Record<string, unknown> });
        // Create initial inventory row — normalize unit to base (L→mL, kg→g)
        const baseRawUnit = rawUnit === "L" ? "mL" : rawUnit === "kg" ? "g" : rawUnit;
        const inv = await repo.upsertInventory(supabase, {
          product_id: productId!,
          variant_id: "",
          tenant_id: tenantId,
          current_qty: 0,
          min_qty: 0,
          unit: baseRawUnit,
          avg_cogs: 0,
          updated_at: now,
        });
        dispatch({ type: "UPSERT", table: "inventory", payload: inv as unknown as Record<string, unknown> });
        if (pendingRawItemIdx >= 0) {
          setPendingRawItemIdx(-1);
        }
      }
      setShowRawForm(false);
    } catch (err) {
      console.error("Save raw material failed:", err);
    }
    setSaving(false);
  };

  const handleDeleteRaw = async (id: string) => {
    if (!confirm(copy.common.deleteWarning)) return;
    try {
      await repo.deleteGoodsReceivingItemsByProductId(supabase, id);
      await repo.deleteComponentsByProductId(supabase, id);
      await repo.deleteInventoryByProductId(supabase, id);
      await repo.deleteProduct(supabase, id);
      dispatch({ type: "DELETE", table: "products", id });
    } catch (err) {
      console.error("Delete raw material failed:", err);
    }
  };

  // Raw material category CRUD
  const openCreateRawCat = () => {
    setEditRawCatId(null);
    setRawCatName("");
    setRawCatOrder("0");
    setShowRawCatForm(true);
  };

  const openEditRawCat = (cat: DbCategory) => {
    setEditRawCatId(cat.id);
    setRawCatName(cat.name);
    setRawCatOrder(String(cat.sort_order));
    setShowRawCatForm(true);
  };

  const handleSaveRawCat = async () => {
    const nameLower = rawCatName.trim().toLowerCase();
    const duplicate = rawCategories.some(
      (c) => c.name.toLowerCase() === nameLower && c.id !== editRawCatId
    );
    if (duplicate) {
      alert(copy.purchasing.duplicateRawCategory);
      return;
    }
    setSaving(true);
    try {
      if (editRawCatId) {
        const updated = await repo.updateCategory(supabase, editRawCatId, {
          name: rawCatName,
          sort_order: parseInt(rawCatOrder) || 0,
        });
        dispatch({ type: "UPSERT", table: "categories", payload: updated as unknown as Record<string, unknown> });
      } else {
        const newCatId = crypto.randomUUID();
        const created = await repo.createCategory(supabase, {
          id: newCatId,
          tenant_id: tenantId,
          name: rawCatName,
          sort_order: parseInt(rawCatOrder) || 0,
          category_type: "RAW_MATERIAL",
          updated_at: Date.now(),
        });
        dispatch({ type: "UPSERT", table: "categories", payload: created as unknown as Record<string, unknown> });
        // Auto-select the new category in the raw material form if it was open
        if (rawCatFromRawForm) {
          setRawCategory(newCatId);
          setRawCatFromRawForm(false);
        }
      }
      setShowRawCatForm(false);
    } catch (err) {
      console.error("Save raw category failed:", err);
    }
    setSaving(false);
  };

  const handleDeleteRawCat = async (id: string) => {
    if (!confirm(copy.common.deleteWarning)) return;
    try {
      await repo.deleteCategory(supabase, id);
      dispatch({ type: "DELETE", table: "categories", id });
    } catch (err) {
      console.error("Delete raw category failed:", err);
    }
  };

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">{copy.purchasing.title}</h1>
        {tab === "receiving" && (
          <button className="erp-btn erp-btn--primary erp-btn--sm" onClick={openCreateReceiving}>
            {copy.purchasing.addReceiving}
          </button>
        )}
        {tab === "vendors" && (
          <button className="erp-btn erp-btn--primary erp-btn--sm" onClick={openCreateVendor}>
            {copy.purchasing.addVendor}
          </button>
        )}
        {tab === "rawMaterials" && (
          <button className="erp-btn erp-btn--primary erp-btn--sm" onClick={openCreateRaw}>
            {copy.purchasing.addRawMaterial}
          </button>
        )}
        {tab === "categories" && (
          <button className="erp-btn erp-btn--primary erp-btn--sm" onClick={openCreateRawCat}>
            {copy.purchasing.addRawCategory}
          </button>
        )}
      </div>

      <div className="erp-tabs">
        <button className={`erp-tab${tab === "receiving" ? " erp-tab--active" : ""}`} onClick={() => setTab("receiving")}>
          {copy.purchasing.goodsReceiving}
        </button>
        <button className={`erp-tab${tab === "vendors" ? " erp-tab--active" : ""}`} onClick={() => setTab("vendors")}>
          {copy.purchasing.vendors}
        </button>
        <button className={`erp-tab${tab === "rawMaterials" ? " erp-tab--active" : ""}`} onClick={() => setTab("rawMaterials")}>
          {copy.purchasing.rawMaterials}
        </button>
        <button className={`erp-tab${tab === "categories" ? " erp-tab--active" : ""}`} onClick={() => setTab("categories")}>
          {copy.purchasing.categories}
        </button>
      </div>

      {tab === "rawMaterials" && (
        <>
          {/* Category filter chips */}
          <div className="erp-filter-bar">
            <span
              className={`erp-chip${filterRawCategory === "" ? " erp-chip--active" : ""}`}
              onClick={() => setFilterRawCategory("")}
            >
              {copy.pos.allCategories}
            </span>
            {rawCategories.map((c) => (
              <span
                key={c.id}
                className={`erp-chip${filterRawCategory === c.id ? " erp-chip--active" : ""}`}
                onClick={() => setFilterRawCategory(filterRawCategory === c.id ? "" : c.id)}
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
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
            />
          </div>

          <div className="erp-table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>{copy.products.name}</th>
                  <th>{copy.products.category}</th>
                  <th>{copy.products.unit}</th>
                  <th>{copy.products.active}</th>
                  <th>{copy.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRawMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "var(--erp-muted)" }}>
                      {copy.purchasing.noRawMaterials}
                    </td>
                  </tr>
                ) : (
                  filteredRawMaterials.map((p) => (
                    <tr key={p.id}>
                      <td><strong>{p.name}</strong></td>
                      <td>{getRawCategoryName(p.category_id)}</td>
                      <td>{getRawInventoryUnit(p.id)}</td>
                      <td>
                        <span className={`erp-badge ${p.is_active ? "erp-badge--success" : "erp-badge--danger"}`}>
                          {p.is_active ? copy.products.active : copy.products.inactive}
                        </span>
                      </td>
                      <td className="erp-td-actions">
                        <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => openEditRaw(p)}>
                          {copy.common.edit}
                        </button>
                        {isOwner && (
                          <button
                            className="erp-btn erp-btn--ghost erp-btn--sm"
                            style={{ color: "var(--erp-danger)" }}
                            onClick={() => handleDeleteRaw(p.id)}
                          >
                            {copy.common.delete}
                          </button>
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

      {tab === "receiving" && (
        <>
          <div className="erp-filter-bar" style={{ flexWrap: "wrap", gap: 8 }}>
            <input
              className="erp-input"
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={{ width: "auto" }}
            />
            <select
              className="erp-select"
              value={filterVendorId}
              onChange={(e) => setFilterVendorId(e.target.value)}
              style={{ width: "auto" }}
            >
              <option value="">{locale === "id" ? "Semua Vendor" : "All Vendors"}</option>
              {state.vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            <div className="erp-search" style={{ flex: 1, minWidth: 160 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder={copy.products.name}
                value={filterItemName}
                onChange={(e) => setFilterItemName(e.target.value)}
              />
            </div>
            {(filterDate || filterVendorId || filterItemName) && (
              <button
                className="erp-btn erp-btn--ghost erp-btn--sm"
                onClick={() => { setFilterDate(""); setFilterVendorId(""); setFilterItemName(""); }}
              >
                ✕ {copy.common.close}
              </button>
            )}
          </div>
          <div className="erp-table-wrap">
          <table className="erp-table">
            <thead>
              <tr>
                <th>{copy.purchasing.date}</th>
                <th>{copy.purchasing.time}</th>
                <th>{copy.purchasing.vendor}</th>
                <th>{copy.purchasing.totalCost}</th>
                <th>{copy.purchasing.notes}</th>
                <th>{copy.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceivings.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--erp-muted)" }}>
                    {copy.purchasing.noReceivings}
                  </td>
                </tr>
              ) : (
                filteredReceivings.map((r) => {
                  const isExpanded = expandedReceivingId === r.id;
                  const lineItems = state.goodsReceivingItems.filter((i) => i.receiving_id === r.id);
                  return (
                    <React.Fragment key={r.id}>
                      <tr
                        style={{ cursor: "pointer" }}
                        onClick={() => setExpandedReceivingId(isExpanded ? null : r.id)}
                      >
                        <td>{isExpanded ? "▼" : "▶"} {formatDate(r.date, locale)}</td>
                        <td>{new Date(r.date).toLocaleTimeString(locale === "id" ? "id-ID" : "en-US", { hour: "2-digit", minute: "2-digit" })}</td>
                        <td>{getVendorName(r.vendor_id)}</td>
                        <td>{formatRupiah(getReceivingTotal(r.id))}</td>
                        <td>{r.notes || "—"}</td>
                        <td className="erp-td-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="erp-btn erp-btn--ghost erp-btn--sm"
                            onClick={() => openEditReceiving(r)}
                          >
                            {copy.common.edit}
                          </button>
                          {isOwner && (
                            <button
                              className="erp-btn erp-btn--ghost erp-btn--sm"
                              style={{ color: "var(--erp-danger)" }}
                              onClick={() => handleDeleteReceiving(r.id)}
                            >
                              {copy.common.delete}
                            </button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${r.id}-detail`} className="erp-table-row--expanded">
                          <td colSpan={6} style={{ padding: "0 0 8px 24px", background: "var(--erp-bg)" }}>
                            <table className="erp-table erp-tx-detail-table" style={{ margin: "8px 0" }}>
                              <thead>
                                <tr>
                                  <th>{copy.products.name}</th>
                                  <th>{copy.products.qty}</th>
                                  <th>{copy.products.unit}</th>
                                  <th>{copy.purchasing.totalAmount}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {lineItems.length === 0 ? (
                                  <tr><td colSpan={4} style={{ color: "var(--erp-muted)" }}>—</td></tr>
                                ) : (
                                  lineItems.map((li) => (
                                    <tr key={li.id}>
                                      <td>{getProductName(li.product_id)}</td>
                                      <td>{li.qty}</td>
                                      <td>{li.unit}</td>
                                      <td>{formatRupiah(li.qty * li.cost_per_unit)}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </>
      )}

      {tab === "vendors" && (
        <div className="erp-table-wrap">
          <table className="erp-table">
            <thead>
              <tr>
                <th>{copy.purchasing.vendorName}</th>
                <th>{copy.purchasing.phone}</th>
                <th>{copy.purchasing.address}</th>
                <th>{copy.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {state.vendors.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "var(--erp-muted)" }}>
                    {copy.purchasing.noVendors}
                  </td>
                </tr>
              ) : (
                state.vendors.map((v) => (
                  <tr key={v.id}>
                    <td><strong>{v.name}</strong></td>
                    <td>{v.phone || "—"}</td>
                    <td>{v.address || "—"}</td>
                    <td className="erp-td-actions">
                      <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => openEditVendor(v)}>
                        {copy.common.edit}
                      </button>
                      {isOwner && (
                        <button
                          className="erp-btn erp-btn--ghost erp-btn--sm"
                          style={{ color: "var(--erp-danger)" }}
                          onClick={() => handleDeleteVendor(v.id)}
                        >
                          {copy.common.delete}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
              {rawCategories.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "var(--erp-muted)" }}>
                    {copy.purchasing.noCategories}
                  </td>
                </tr>
              ) : (
                rawCategories.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td>{c.sort_order}</td>
                    <td>{rawMaterials.filter((p) => p.category_id === c.id).length}</td>
                    <td className="erp-td-actions">
                      {isOwner && (
                        <>
                          <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => openEditRawCat(c)}>
                            {copy.common.edit}
                          </button>
                          <button
                            className="erp-btn erp-btn--ghost erp-btn--sm"
                            style={{ color: "var(--erp-danger)" }}
                            onClick={() => handleDeleteRawCat(c.id)}
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

      {/* Goods Receiving Form */}
      {showReceivingForm && (
        <div className="erp-overlay" onClick={() => setShowReceivingForm(false)}>
          <div className="erp-dialog erp-dialog--lg" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{editReceivingId ? copy.purchasing.editReceiving : copy.purchasing.addReceiving}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowReceivingForm(false)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              <div className="erp-input-group">
                <label className="erp-label">{copy.purchasing.vendor}</label>
                <select
                  className="erp-select"
                  value={recVendor}
                  onChange={(e) => {
                    if (e.target.value === "__NEW__") {
                      setEditVendorId(null);
                      setVendorName("");
                      setVendorPhone("");
                      setVendorAddress("");
                      setShowVendorForm(true);
                    } else {
                      setRecVendor(e.target.value);
                    }
                  }}
                >
                  <option value="">—</option>
                  {state.vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                  <option value="__NEW__">{copy.purchasing.newVendorOption}</option>
                </select>
              </div>
              <div className="erp-input-group">
                <label className="erp-label">{copy.purchasing.notes}</label>
                <input className="erp-input" value={recNotes} onChange={(e) => setRecNotes(e.target.value)} />
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <label className="erp-label">{copy.purchasing.items}</label>
                  <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={addRecItem}>
                    + {copy.purchasing.addItem}
                  </button>
                </div>
                {recItems.map((item, idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
                    <select
                      className="erp-select"
                      value={item.productId}
                      onChange={(e) => {
                        if (e.target.value === "__NEW__") {
                          setPendingRawItemIdx(idx);
                          setEditRawId(null);
                          setRawName("");
                          setRawCategory("");
                          setRawDescription("");
                          setRawActive(true);
                          setRawUnit("pcs");
                          setShowRawForm(true);
                        } else {
                          updateRecItem(idx, "productId", e.target.value);
                        }
                      }}
                    >
                      <option value="">—</option>
                      {rawMaterials.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                      <option value="__NEW__">{copy.purchasing.newRawMaterialOption}</option>
                    </select>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input className="erp-input" type="text" inputMode="decimal" placeholder={copy.products.qty} value={item.qty} onChange={(e) => updateRecItem(idx, "qty", e.target.value)} style={{ minWidth: 0 }} />
                      <span className="erp-bom-unit-label" style={{ whiteSpace: "nowrap" }}>{item.unit || "—"}</span>
                    </div>
                    <input className="erp-input" type="text" inputMode="numeric" placeholder={copy.purchasing.totalAmount} value={fmtNum(item.costPerUnit)} onChange={(e) => updateRecItem(idx, "costPerUnit", e.target.value)} />
                    <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => removeRecItem(idx)} style={{ color: "var(--erp-danger)" }}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowReceivingForm(false)}>
                {copy.common.cancel}
              </button>
              <button className="erp-btn erp-btn--primary" onClick={handleSaveReceiving} disabled={saving || !recVendor}>
                {saving ? copy.common.loading : copy.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Form */}
      {showVendorForm && (
        <div className="erp-overlay" onClick={() => setShowVendorForm(false)}>
          <div className="erp-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{editVendorId ? copy.purchasing.editVendor : copy.purchasing.addVendor}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowVendorForm(false)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              <div className="erp-input-group">
                <label className="erp-label">{copy.purchasing.vendorName}</label>
                <input className="erp-input" value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
              </div>
              <div className="erp-input-group">
                <label className="erp-label">{copy.purchasing.phone}</label>
                <input className="erp-input" value={vendorPhone} onChange={(e) => setVendorPhone(e.target.value)} />
              </div>
              <div className="erp-input-group">
                <label className="erp-label">{copy.purchasing.address}</label>
                <input className="erp-input" value={vendorAddress} onChange={(e) => setVendorAddress(e.target.value)} />
              </div>
            </div>
            <div className="erp-dialog-footer">
              {editVendorId && isOwner && (
                <button
                  className="erp-btn erp-btn--danger erp-btn--sm"
                  onClick={() => { handleDeleteVendor(editVendorId); setShowVendorForm(false); }}
                  style={{ marginRight: "auto" }}
                >
                  {copy.common.delete}
                </button>
              )}
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowVendorForm(false)}>
                {copy.common.cancel}
              </button>
              <button className="erp-btn erp-btn--primary" onClick={handleSaveVendor} disabled={saving || !vendorName}>
                {saving ? copy.common.loading : copy.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raw Material Form */}
      {showRawForm && (
        <div className="erp-overlay" onClick={() => setShowRawForm(false)}>
          <div className="erp-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{editRawId ? copy.purchasing.editRawMaterial : copy.purchasing.addRawMaterial}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowRawForm(false)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              <div className="erp-input-group">
                <label className="erp-label">{copy.products.name}</label>
                <input className="erp-input" value={rawName} onChange={(e) => setRawName(e.target.value)} />
              </div>
              <div className="erp-input-group">
                <label className="erp-label">{copy.products.category}</label>
                <select
                  className="erp-select"
                  value={rawCategory}
                  onChange={(e) => {
                    if (e.target.value === "__NEW__") {
                      setRawCatFromRawForm(true);
                      setEditRawCatId(null);
                      setRawCatName("");
                      setRawCatOrder("0");
                      setShowRawCatForm(true);
                    } else {
                      setRawCategory(e.target.value);
                    }
                  }}
                >
                  <option value="">{copy.products.noCategory}</option>
                  {rawCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                  <option value="__NEW__">{copy.purchasing.newRawCategoryOption}</option>
                </select>
              </div>
              {!editRawId && (
                <div className="erp-input-group">
                  <label className="erp-label">{copy.products.unit}</label>
                  <select className="erp-select" value={rawUnit} onChange={(e) => setRawUnit(e.target.value)}>
                    {["pcs", "g", "mL", "kg", "L"].map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="erp-input-group">
                <label className="erp-label">{copy.products.description}</label>
                <input className="erp-input" value={rawDescription} onChange={(e) => setRawDescription(e.target.value)} />
              </div>
              <div className="erp-settings-row">
                <span className="erp-settings-row-label">{copy.products.active}</span>
                <label className="erp-toggle">
                  <input type="checkbox" checked={rawActive} onChange={(e) => setRawActive(e.target.checked)} />
                  <span className="erp-toggle-slider" />
                </label>
              </div>
            </div>
            <div className="erp-dialog-footer">
              {editRawId && isOwner && (
                <button
                  className="erp-btn erp-btn--danger erp-btn--sm"
                  onClick={() => { handleDeleteRaw(editRawId); setShowRawForm(false); }}
                  style={{ marginRight: "auto" }}
                >
                  {copy.common.delete}
                </button>
              )}
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowRawForm(false)}>
                {copy.common.cancel}
              </button>
              <button className="erp-btn erp-btn--primary" onClick={handleSaveRaw} disabled={saving || !rawName}>
                {saving ? copy.common.loading : copy.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raw Material Category Form */}
      {showRawCatForm && (
        <div className="erp-overlay" onClick={() => setShowRawCatForm(false)}>
          <div className="erp-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{editRawCatId ? copy.products.editCategory : copy.products.addCategory}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowRawCatForm(false)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              <div className="erp-input-group">
                <label className="erp-label">{copy.products.categoryName}</label>
                <input className="erp-input" value={rawCatName} onChange={(e) => setRawCatName(e.target.value)} />
              </div>
              <div className="erp-input-group">
                <label className="erp-label">{copy.products.sortOrder}</label>
                <input className="erp-input" type="number" value={rawCatOrder} onChange={(e) => setRawCatOrder(e.target.value)} />
              </div>
            </div>
            <div className="erp-dialog-footer">
              {editRawCatId && isOwner && (
                <button
                  className="erp-btn erp-btn--danger erp-btn--sm"
                  onClick={() => { handleDeleteRawCat(editRawCatId); setShowRawCatForm(false); }}
                  style={{ marginRight: "auto" }}
                >
                  {copy.common.delete}
                </button>
              )}
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowRawCatForm(false)}>
                {copy.common.cancel}
              </button>
              <button className="erp-btn erp-btn--primary" onClick={handleSaveRawCat} disabled={saving || !rawCatName}>
                {saving ? copy.common.loading : copy.common.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
