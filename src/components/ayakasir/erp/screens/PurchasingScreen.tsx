"use client";

import React, { useMemo, useState } from "react";
import { useErp } from "../store";
import { getErpCopy } from "../i18n";
import { usePlanLimits } from "../usePlanLimits";
import { formatRupiah, formatDate } from "../utils";
import * as repo from "@/lib/supabase/repositories";
import type { DbVendor, DbGoodsReceiving, DbGoodsReceivingItem, DbGeneralLedger, DbProduct, DbCategory, DbVariantGroup, DbVariantGroupValue } from "@/lib/supabase/types";

type Tab = "receiving" | "vendors" | "rawMaterials" | "categories" | "variants";

// ── Vendor CSV helpers ────────────────────────────────────────────────────────

function parseVendorCsvLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i <= line.length) {
    if (line[i] === '"') {
      let field = "";
      i++;
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2; }
        else if (line[i] === '"') { i++; break; }
        else { field += line[i++]; }
      }
      fields.push(field.trim());
      if (line[i] === ",") i++;
    } else {
      const end = line.indexOf(",", i);
      if (end === -1) { fields.push(line.slice(i).trim()); break; }
      fields.push(line.slice(i, end).trim());
      i = end + 1;
    }
  }
  return fields;
}

function normalizeVendorPhone(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // If starts with digit 1-9 but not 0, prepend 0
  if (/^[1-9]/.test(trimmed)) return "0" + trimmed;
  return trimmed;
}

function parseCatCsvLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i <= line.length) {
    if (line[i] === '"') {
      let field = "";
      i++;
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2; }
        else if (line[i] === '"') { i++; break; }
        else { field += line[i++]; }
      }
      fields.push(field.trim());
      if (line[i] === ",") i++;
    } else {
      const end = line.indexOf(",", i);
      if (end === -1) { fields.push(line.slice(i).trim()); break; }
      fields.push(line.slice(i, end).trim());
      i = end + 1;
    }
  }
  return fields;
}

type VendorImportRow = {
  name: string;
  phone: string | null;
  address: string | null;
  isDuplicate: boolean; // duplicate name in existing vendors or within batch
};

type CatImportRow = {
  name: string;
  sort_order: number;
  isDuplicate: boolean;
};

// ── Raw material CSV helpers ──────────────────────────────────────────────────

function parseRawCsvLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i <= line.length) {
    if (line[i] === '"') {
      let field = "";
      i++;
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2; }
        else if (line[i] === '"') { i++; break; }
        else { field += line[i++]; }
      }
      fields.push(field.trim());
      if (line[i] === ",") i++;
    } else {
      const end = line.indexOf(",", i);
      if (end === -1) { fields.push(line.slice(i).trim()); break; }
      fields.push(line.slice(i, end).trim());
      i = end + 1;
    }
  }
  return fields;
}

// Normalize unit strings from CSV: kg→kg, KG→kg, Kg→kg, g→g, G→g, ml→mL, ML→mL, l→L, L→L, pcs→pcs etc.
function normalizeUnit(raw: string): string {
  const u = raw.trim().toLowerCase();
  if (u === "kg") return "kg";
  if (u === "g") return "g";
  if (u === "ml" || u === "ml.") return "mL";
  if (u === "l") return "L";
  if (u === "pcs" || u === "pc") return "pcs";
  // Return lowercase if unknown — will fall back to pcs on save
  return u || "pcs";
}

type GroupImportRow = {
  presetName: string;
  values: string[];       // non-blank variant_N values
  isDuplicate: boolean;   // preset name already exists
  clashingValues: string[]; // values that exist in another group
};

type RawImportRow = {
  name: string;
  category: string;  // category name from CSV
  unit: string;
  description: string;
  presetVariant: string;   // variant group name from CSV
  presetValues: string[];  // variant_1, variant_2, … values (non-blank only)
  isDuplicate: boolean;
  isNewCategory: boolean;
  isNewPreset: boolean;
};


interface VariantRow {
  variantId: string;
  variantName: string;
  qty: string;
  costPerUnit: string;
}

interface FormItem {
  productId: string;
  variantId: string;
  qty: string;
  costPerUnit: string;
  unit: string;
  useVariants: boolean;
  variantRows: VariantRow[];
  // per-row item picker state
  categoryId: string;
  itemSearch: string;
}

function getConvertibleUnitTarget(unit: string): string | null {
  if (unit === "g") return "kg";
  if (unit === "kg") return "g";
  if (unit === "mL") return "L";
  if (unit === "L") return "mL";
  return null;
}

function convertQtyBetweenUnits(qty: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return qty;
  if ((fromUnit === "kg" && toUnit === "g") || (fromUnit === "L" && toUnit === "mL")) return qty * 1000;
  if ((fromUnit === "g" && toUnit === "kg") || (fromUnit === "mL" && toUnit === "L")) return qty / 1000;
  return qty;
}

function convertCostPerUnitBetweenUnits(costPerUnit: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return costPerUnit;
  // cost/kg -> cost/g (divide 1000), cost/g -> cost/kg (multiply 1000)
  if ((fromUnit === "kg" && toUnit === "g") || (fromUnit === "L" && toUnit === "mL")) return costPerUnit / 1000;
  if ((fromUnit === "g" && toUnit === "kg") || (fromUnit === "mL" && toUnit === "L")) return costPerUnit * 1000;
  return costPerUnit;
}

function normalizeInventoryUnit(unit: string): string {
  if (unit === "kg") return "g";
  if (unit === "L") return "mL";
  return unit;
}

export default function PurchasingScreen() {
  const { state, dispatch, supabase, tenantId, locale } = useErp();
  const copy = getErpCopy(locale);
  const isOwner = state.user?.role === "OWNER";
  const planLimits = usePlanLimits();

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
  const [recItems, setRecItems] = useState<FormItem[]>([{ productId: "", variantId: "", qty: "", costPerUnit: "", unit: "", useVariants: false, variantRows: [], categoryId: "", itemSearch: "" }]);
  // Index of the item row that triggered inline new-raw-material creation (-1 = none)
  const [pendingRawItemIdx, setPendingRawItemIdx] = useState<number>(-1);
  // Whether the raw category form was opened from within the raw material form
  const [rawCatFromRawForm, setRawCatFromRawForm] = useState(false);

  // Vendor form state
  const [vendorName, setVendorName] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");

  // Vendor tab — search, pagination, bulk delete, CSV import
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorPage, setVendorPage] = useState(0);
  const [vendorPageSize, setVendorPageSize] = useState<10 | 25 | 50>(10);
  const [selectedVendorIds, setSelectedVendorIds] = useState<Set<string>>(new Set());
  const [showVendorBulkConfirm, setShowVendorBulkConfirm] = useState(false);
  const [vendorBulkDeleting, setVendorBulkDeleting] = useState(false);
  const [vendorImportPreview, setVendorImportPreview] = useState<VendorImportRow[] | null>(null);
  const [vendorImportSaving, setVendorImportSaving] = useState(false);
  const [vendorImportMsg, setVendorImportMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Raw material product form state
  const [showRawForm, setShowRawForm] = useState(false);
  const [editRawId, setEditRawId] = useState<string | null>(null);
  const [rawName, setRawName] = useState("");
  const [rawCategory, setRawCategory] = useState("");
  const [rawDescription, setRawDescription] = useState("");
  const [rawActive, setRawActive] = useState(true);
  const [rawUnit, setRawUnit] = useState("pcs");
  // Preset variant group selected in the raw material form ("" = none)
  const [rawPresetGroupId, setRawPresetGroupId] = useState("");

  // Raw material pre-save warning state
  const [showRawWarning, setShowRawWarning] = useState(false);

  // Raw material category form state
  const [showRawCatForm, setShowRawCatForm] = useState(false);
  const [editRawCatId, setEditRawCatId] = useState<string | null>(null);
  const [rawCatName, setRawCatName] = useState("");
  const [rawCatOrder, setRawCatOrder] = useState("0");

  // Category tab — search, pagination, bulk delete, CSV import
  const [catSearch, setCatSearch] = useState("");
  const [catPage, setCatPage] = useState(0);
  const [catPageSize, setCatPageSize] = useState<10 | 25 | 50>(10);
  const [selectedCatIds, setSelectedCatIds] = useState<Set<string>>(new Set());
  const [showCatBulkConfirm, setShowCatBulkConfirm] = useState(false);
  const [catBulkDeleting, setCatBulkDeleting] = useState(false);
  const [catImportPreview, setCatImportPreview] = useState<CatImportRow[] | null>(null);
  const [catImportSaving, setCatImportSaving] = useState(false);
  const [catImportMsg, setCatImportMsg] = useState<{ text: string; ok: boolean } | null>(null);
  // Delete category with options (same pattern as customers)
  const [deleteCatTarget, setDeleteCatTarget] = useState<{ id: string; name: string; rawMaterialCount: number } | null>(null);

  // Raw material tab — pagination, bulk delete, CSV import
  const [rawPage, setRawPage] = useState(0);
  const [rawPageSize, setRawPageSize] = useState<10 | 25 | 50>(10);
  const [selectedRawIds, setSelectedRawIds] = useState<Set<string>>(new Set());
  const [showRawBulkConfirm, setShowRawBulkConfirm] = useState(false);
  const [rawBulkDeleting, setRawBulkDeleting] = useState(false);
  const [rawImportPreview, setRawImportPreview] = useState<RawImportRow[] | null>(null);
  const [rawImportSaving, setRawImportSaving] = useState(false);
  const [rawImportMsg, setRawImportMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [rawSearch, setRawSearch] = useState("");
  const [filterRawCategory, setFilterRawCategory] = useState("");

  // Variant Groups tab — form, pagination, bulk delete
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  // Inline value list during group create/edit: array of { tempId, name }
  const [groupFormValues, setGroupFormValues] = useState<{ tempId: string; name: string }[]>([]);
  // Applied-to product IDs managed inside the edit dialog (edit mode only)
  const [editAppliedProductIds, setEditAppliedProductIds] = useState<string[]>([]);
  const [editAddProductId, setEditAddProductId] = useState("");
  const [groupPage, setGroupPage] = useState(0);
  const [groupPageSize, setGroupPageSize] = useState<10 | 25 | 50>(10);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [showGroupBulkConfirm, setShowGroupBulkConfirm] = useState(false);
  const [groupBulkDeleting, setGroupBulkDeleting] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");
  const [groupImportPreview, setGroupImportPreview] = useState<GroupImportRow[] | null>(null);
  const [groupImportSaving, setGroupImportSaving] = useState(false);
  const [groupImportMsg, setGroupImportMsg] = useState<{ text: string; ok: boolean } | null>(null);
  // Apply preset dialog (from Variants tab)
  const [applyGroupTarget, setApplyGroupTarget] = useState<DbVariantGroup | null>(null);
  const [applyProductId, setApplyProductId] = useState("");
  // Inline apply preset (from receiving form) — tracks which item row is applying
  const [inlineApplyIdx, setInlineApplyIdx] = useState<number>(-1);
  const [inlineApplyGroupId, setInlineApplyGroupId] = useState("");

  // Receiving filters
  const [filterDate, setFilterDate] = useState("");
  const [filterVendorId, setFilterVendorId] = useState("");
  const [filterItemName, setFilterItemName] = useState("");
  // Receiving pagination
  const [receivingPage, setReceivingPage] = useState(0);
  const [receivingPageSize, setReceivingPageSize] = useState<10 | 25 | 50>(10);

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

  const receivingTotalPages = Math.ceil(filteredReceivings.length / receivingPageSize);
  const pagedReceivings = filteredReceivings.slice(receivingPage * receivingPageSize, receivingPage * receivingPageSize + receivingPageSize);

  const sortedVendors = useMemo(() => {
    let list = [...state.vendors];
    if (vendorSearch) {
      const q = vendorSearch.toLowerCase();
      list = list.filter((v) => v.name.toLowerCase().includes(q) || (v.phone || "").toLowerCase().includes(q) || (v.address || "").toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [state.vendors, vendorSearch]);

  const pagedVendors = useMemo(() => {
    const start = vendorPage * vendorPageSize;
    return sortedVendors.slice(start, start + vendorPageSize);
  }, [sortedVendors, vendorPage, vendorPageSize]);

  const vendorTotalPages = Math.ceil(sortedVendors.length / vendorPageSize);

  const sortedRawCategories = useMemo(() => {
    let list = [...rawCategories];
    if (catSearch) {
      const q = catSearch.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [rawCategories, catSearch]);

  const pagedRawCategories = useMemo(() => {
    const start = catPage * catPageSize;
    return sortedRawCategories.slice(start, start + catPageSize);
  }, [sortedRawCategories, catPage, catPageSize]);

  const catTotalPages = Math.ceil(sortedRawCategories.length / catPageSize);

  const filteredRawMaterials = useMemo(() => {
    let list = rawMaterials;
    if (filterRawCategory) {
      list = list.filter((p) => p.category_id === filterRawCategory);
    }
    if (rawSearch) {
      const q = rawSearch.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    // Sort: category name alphabetically first, then name alphabetically within
    return [...list].sort((a, b) => {
      const catA = (a.category_id ? state.categories.find((c) => c.id === a.category_id)?.name ?? "" : "").toLowerCase();
      const catB = (b.category_id ? state.categories.find((c) => c.id === b.category_id)?.name ?? "" : "").toLowerCase();
      const catCmp = catA.localeCompare(catB);
      if (catCmp !== 0) return catCmp;
      return a.name.localeCompare(b.name);
    });
  }, [rawMaterials, filterRawCategory, rawSearch, state.categories]);

  const pagedRawMaterials = useMemo(() => {
    const start = rawPage * rawPageSize;
    return filteredRawMaterials.slice(start, start + rawPageSize);
  }, [filteredRawMaterials, rawPage, rawPageSize]);

  const rawTotalPages = Math.ceil(filteredRawMaterials.length / rawPageSize);

  const filteredGroups = useMemo(() => {
    let list = state.variantGroups;
    if (groupSearch) {
      const q = groupSearch.toLowerCase();
      list = list.filter((g) => g.name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [state.variantGroups, groupSearch]);

  const pagedGroups = useMemo(() => {
    const start = groupPage * groupPageSize;
    return filteredGroups.slice(start, start + groupPageSize);
  }, [filteredGroups, groupPage, groupPageSize]);

  const groupTotalPages = Math.ceil(filteredGroups.length / groupPageSize);

  const getGroupValues = (groupId: string) =>
    state.variantGroupValues.filter((v) => v.group_id === groupId).sort((a, b) => a.sort_order - b.sort_order);

  // Products that have any variants from a given group (by matching value names)
  const getGroupAppliedProducts = (groupId: string) => {
    const values = getGroupValues(groupId);
    const valueNames = new Set(values.map((v) => v.name.toLowerCase()));
    return rawMaterials.filter((p) =>
      state.variants.some((v) => v.product_id === p.id && valueNames.has(v.name.toLowerCase()))
    );
  };

  const getProductVariants = (productId: string) =>
    state.variants.filter((v) => v.product_id === productId);

  // Map each raw material to the variant group it already belongs to (if any).
  // A raw material can only belong to one preset variant group.
  const rawMaterialGroupMap = useMemo(() => {
    const map = new Map<string, string>(); // productId -> groupId
    for (const group of state.variantGroups) {
      const valueNames = new Set(
        state.variantGroupValues.filter((v) => v.group_id === group.id).map((v) => v.name.toLowerCase())
      );
      for (const rm of rawMaterials) {
        if (map.has(rm.id)) continue; // already assigned to a group
        const hasVariantFromGroup = state.variants.some(
          (v) => v.product_id === rm.id && valueNames.has(v.name.toLowerCase())
        );
        if (hasVariantFromGroup) map.set(rm.id, group.id);
      }
    }
    return map;
  }, [state.variantGroups, state.variantGroupValues, state.variants, rawMaterials]);

  const getRawCategoryName = (id: string | null) => {
    if (!id) return copy.products.noCategory;
    return state.categories.find((c) => c.id === id)?.name || copy.products.noCategory;
  };

  const getRawInventoryUnit = (productId: string) => {
    const inv = state.inventory.find((i) => i.product_id === productId && (!i.variant_id || i.variant_id === ""));
    return inv?.unit ?? "—";
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
    if (!planLimits.canAddReceiving) { alert(copy.plan.limitReached); return; }
    setEditReceivingId(null);
    setRecVendor("");
    setRecNotes("");
    setRecItems([{ productId: "", variantId: "", qty: "", costPerUnit: "", unit: "", useVariants: false, variantRows: [], categoryId: "", itemSearch: "" }]);
    setShowReceivingForm(true);
  };

  const openEditReceiving = (r: DbGoodsReceiving) => {
    setEditReceivingId(r.id);
    setRecVendor(r.vendor_id || "");
    setRecNotes(r.notes || "");
    const rawItems = state.goodsReceivingItems.filter((i) => i.receiving_id === r.id);

    // Group items by product: if a product has multiple items each with a variant_id,
    // they were saved as variant sub-rows — restore them as a single FormItem with useVariants=true.
    const productGroups = new Map<string, typeof rawItems>();
    for (const item of rawItems) {
      const key = item.product_id;
      if (!productGroups.has(key)) productGroups.set(key, []);
      productGroups.get(key)!.push(item);
    }

    const existingItems: FormItem[] = [];
    for (const [productId, items] of productGroups) {
      const hasVariants = items.some((i) => i.variant_id && i.variant_id !== "");
      if (hasVariants) {
        // Restore as variant sub-rows
        const firstItem = items[0];
        let displayUnit = firstItem.unit;
        if (displayUnit === "g") displayUnit = "kg";
        else if (displayUnit === "mL") displayUnit = "L";
        const variantRows: VariantRow[] = items.map((i) => {
          let dispQty = i.qty;
          if (i.unit === "g") dispQty = i.qty / 1000;
          else if (i.unit === "mL") dispQty = i.qty / 1000;
          const variantName = state.variants.find((v) => v.id === i.variant_id)?.name || i.variant_id || "";
          return {
            variantId: i.variant_id || "",
            variantName,
            qty: String(dispQty),
            costPerUnit: String(Math.round(dispQty * i.cost_per_unit * (i.unit === "g" || i.unit === "mL" ? 1000 : 1))),
          };
        });
        const cat = state.products.find((p) => p.id === productId)?.category_id || "";
        existingItems.push({ productId, variantId: "", qty: "", costPerUnit: "", unit: displayUnit, useVariants: true, variantRows, categoryId: cat, itemSearch: "" });
      } else {
        // Single item row
        const i = items[0];
        let displayQty = i.qty;
        let displayUnit = i.unit;
        if (i.unit === "g") { displayQty = i.qty / 1000; displayUnit = "kg"; }
        else if (i.unit === "mL") { displayQty = i.qty / 1000; displayUnit = "L"; }
        const cat = state.products.find((p) => p.id === i.product_id)?.category_id || "";
        existingItems.push({
          productId: i.product_id,
          variantId: i.variant_id || "",
          qty: String(displayQty),
          costPerUnit: String(i.qty * i.cost_per_unit),
          unit: displayUnit,
          useVariants: false,
          variantRows: [],
          categoryId: cat,
          itemSearch: "",
        });
      }
    }
    setRecItems(existingItems.length > 0 ? existingItems : [{ productId: "", variantId: "", qty: "", costPerUnit: "", unit: "", useVariants: false, variantRows: [], categoryId: "", itemSearch: "" }]);
    setShowReceivingForm(true);
  };

  const addRecItem = () => {
    setRecItems([...recItems, { productId: "", variantId: "", qty: "", costPerUnit: "", unit: "", useVariants: false, variantRows: [], categoryId: "", itemSearch: "" }]);
  };

  const fmtNum = (raw: string) =>
    raw === "" ? "" : Number(raw.replace(/\D/g, "")).toLocaleString("id-ID");

  const parseNum = (formatted: string) => formatted.replace(/\D/g, "");
  const parseQtyInput = (raw: string): number => parseFloat(raw.replace(",", ".")) || 0;
  const formatQtyInput = (qty: number): string => {
    const rounded = parseFloat(qty.toFixed(6));
    return Number.isFinite(rounded) ? String(rounded) : "0";
  };

  const updateRecItem = (idx: number, field: keyof FormItem, value: string) => {
    const next = [...recItems];
    // qty allows decimals (e.g. 1,5 kg) — store raw; costPerUnit is integer currency — strip non-digits
    const stored = field === "costPerUnit" ? parseNum(value) : value;
    next[idx] = { ...next[idx], [field]: stored };
    // Auto-set unit from inventory — unit is stored as display unit (kg/L/pcs)
    if (field === "productId") {
      const inv = state.inventory.find((i) => i.product_id === value && (!i.variant_id || i.variant_id === ""));
      if (inv) {
        next[idx].unit = inv.unit;
      }
      // Auto-select category from the raw material
      if (value) {
        const rm = rawMaterials.find((p) => p.id === value);
        if (rm?.category_id) next[idx].categoryId = rm.category_id;
      }
      // Reset variant fields when product changes
      next[idx].variantId = "";
      next[idx].useVariants = false;
      next[idx].variantRows = [];
      // Reset inline preset picker
      setInlineApplyIdx(-1);
      setInlineApplyGroupId("");
    }
    setRecItems(next);
  };

  const toggleRecItemUnit = (idx: number) => {
    const next = [...recItems];
    const item = next[idx];
    const targetUnit = getConvertibleUnitTarget(item.unit);
    if (!targetUnit) return;

    const convertedQty = item.qty ? formatQtyInput(convertQtyBetweenUnits(parseQtyInput(item.qty), item.unit, targetUnit)) : "";
    const convertedVariantRows = item.variantRows.map((vr) => ({
      ...vr,
      qty: vr.qty ? formatQtyInput(convertQtyBetweenUnits(parseQtyInput(vr.qty), item.unit, targetUnit)) : "",
    }));

    next[idx] = { ...item, unit: targetUnit, qty: convertedQty, variantRows: convertedVariantRows };
    setRecItems(next);
  };

  const toggleUseVariants = (idx: number) => {
    const next = [...recItems];
    const item = next[idx];
    const productVariants = item.productId ? getProductVariants(item.productId) : [];
    if (!item.useVariants) {
      // Enable variant sub-rows: seed one row per variant
      const variantRows: VariantRow[] = productVariants.map((v) => ({
        variantId: v.id,
        variantName: v.name,
        qty: "",
        costPerUnit: "",
      }));
      next[idx] = { ...item, useVariants: true, variantRows, qty: "", costPerUnit: "", variantId: "" };
    } else {
      next[idx] = { ...item, useVariants: false, variantRows: [], variantId: "" };
    }
    setRecItems(next);
  };

  const updateVariantRow = (itemIdx: number, varIdx: number, field: keyof VariantRow, value: string) => {
    const next = [...recItems];
    const rows = [...next[itemIdx].variantRows];
    const stored = field === "costPerUnit" ? parseNum(value) : value;
    rows[varIdx] = { ...rows[varIdx], [field]: stored };
    next[itemIdx] = { ...next[itemIdx], variantRows: rows };
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

      // Align receiving qty to inventory's stored unit. If inventory is "kg" and item is "kg", just use qty.
      // If inventory is "g" and item is "kg", convert to grams. Etc.
      const toInvQty = (itemQty: number, itemUnit: string, invUnit: string): number =>
        convertQtyBetweenUnits(itemQty, itemUnit, invUnit);

      const header: Omit<DbGoodsReceiving, "sync_status"> = {
        id: recId,
        tenant_id: tenantId,
        vendor_id: recVendor || null,
        date: isEdit ? (state.goodsReceivings.find((r) => r.id === recId)?.date ?? now) : now,
        notes: recNotes || null,
        updated_at: now,
      };

      // Determine the base (stored) unit for a display unit — mirrors normalizeInventoryUnit
      const toBaseUnit = (displayUnit: string): string => {
        if (displayUnit === "kg") return "g";
        if (displayUnit === "L") return "mL";
        return displayUnit;
      };

      const items: Omit<DbGoodsReceivingItem, "sync_status">[] = recItems
        .filter((i) => i.productId)
        .flatMap((i) => {
          const baseUnit = toBaseUnit(i.unit);
          if (i.useVariants && i.variantRows.length > 0) {
            // Produce one item per variant sub-row (skip rows with no qty)
            return i.variantRows
              .filter((vr) => vr.variantId && vr.qty)
              .map((vr) => {
                const displayQty = parseFloat(vr.qty.replace(",", ".")) || 0;
                // Convert display qty → base unit (e.g. 1.5 L → 1500 mL)
                const baseQty = Math.round(convertQtyBetweenUnits(displayQty, i.unit, baseUnit));
                const totalCost = parseInt(vr.costPerUnit) || 0;
                // cost_per_unit stored per base unit, rounded to integer
                const costPerBase = baseQty > 0 ? Math.round(totalCost / baseQty) : 0;
                const variantName = state.variants.find((v) => v.id === vr.variantId)?.name || vr.variantName || "";
                return {
                  id: crypto.randomUUID(),
                  tenant_id: tenantId,
                  receiving_id: recId,
                  product_id: i.productId,
                  variant_id: vr.variantId,
                  variant_name: variantName,
                  qty: baseQty,
                  cost_per_unit: costPerBase,
                  unit: baseUnit,
                  updated_at: now,
                };
              });
          }
          const displayQty = parseFloat(i.qty.replace(",", ".")) || 0;
          // Convert display qty → base unit
          const baseQty = Math.round(convertQtyBetweenUnits(displayQty, i.unit, baseUnit));
          const totalCost = parseInt(i.costPerUnit) || 0;
          const costPerBase = baseQty > 0 ? Math.round(totalCost / baseQty) : 0;
          return [{
            id: crypto.randomUUID(),
            tenant_id: tenantId,
            receiving_id: recId,
            product_id: i.productId,
            variant_id: i.variantId || "",
            variant_name: "",
            qty: baseQty,
            cost_per_unit: costPerBase,
            unit: baseUnit,
            updated_at: now,
          }];
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
          const key = `${old.product_id}|${old.variant_id ?? ""}`;
          const existing = inventorySnapshot.get(key);
          if (existing) {
            // Convert old item qty to inventory's stored unit before subtracting
            const oldInvQty = toInvQty(old.qty, old.unit, existing.unit);
            const newQty = Math.max(0, existing.current_qty - oldInvQty);
            const oldCostPerInvUnit = convertCostPerUnitBetweenUnits(old.cost_per_unit, old.unit, existing.unit);
            // Recover avg_cogs: back-calculate before this purchase was applied
            const recoveredAvg = newQty > 0
              ? Math.max(0, ((existing.avg_cogs ?? 0) * existing.current_qty - oldCostPerInvUnit * oldInvQty) / newQty)
              : 0;
            const reversed = await repo.upsertInventory(supabase, {
              product_id: old.product_id,
              variant_id: existing.variant_id, // use actual DB value (may be null, not "")
              tenant_id: tenantId,
              current_qty: Math.round(newQty),
              min_qty: existing.min_qty,
              unit: existing.unit,
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
        const key = `${item.product_id}|${item.variant_id ?? ""}`;
        const existing = inventorySnapshot.get(key);
        // Determine inventory's stored unit: use existing unit, fall back to item's unit for brand-new rows
        const invUnit = existing?.unit || item.unit;
        // Convert received qty to inventory's stored unit
        const receivedInvQty = toInvQty(item.qty, item.unit, invUnit);
        const costPerInvUnit = convertCostPerUnitBetweenUnits(item.cost_per_unit, item.unit, invUnit);
        const currentQty = existing?.current_qty ?? 0;
        const newTotalQty = currentQty + receivedInvQty;
        // Weighted-average COGS — cost_per_unit is per item.unit; convert to per invUnit
        const newAvgCogs = newTotalQty > 0
          ? ((existing?.avg_cogs ?? 0) * currentQty + costPerInvUnit * receivedInvQty) / newTotalQty
          : 0;
        // Use existing row's variant_id (may be null in DB) to match the upsert conflict key correctly
        const upsertVariantId = existing ? existing.variant_id : (item.variant_id || "");
        const updated = await repo.upsertInventory(supabase, {
          product_id: item.product_id,
          variant_id: upsertVariantId,
          tenant_id: tenantId,
          current_qty: Math.round(newTotalQty),
          min_qty: existing?.min_qty || 0,
          unit: invUnit,
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
      alert(copy.common.error);
    }
    setSaving(false);
  };

  const handleDeleteReceiving = async (id: string) => {
    if (!confirm(copy.common.deleteWarning)) return;
    try {
      // Reverse inventory effect of the deleted receiving
      const oldItems = state.goodsReceivingItems.filter((i) => i.receiving_id === id);
      const now = Date.now();
      for (const old of oldItems) {
        const existing = state.inventory.find(
          (i) => i.product_id === old.product_id && (!i.variant_id || i.variant_id === old.variant_id)
        );
        if (existing) {
          const oldInvQty = convertQtyBetweenUnits(old.qty, old.unit, existing.unit);
          const newQty = Math.max(0, Math.round(existing.current_qty - oldInvQty));
          const oldCostPerInvUnit = convertCostPerUnitBetweenUnits(old.cost_per_unit, old.unit, existing.unit);
          const recoveredAvg = newQty > 0
            ? Math.max(0, ((existing.avg_cogs ?? 0) * existing.current_qty - oldCostPerInvUnit * oldInvQty) / newQty)
            : 0;
          const updated = await repo.upsertInventory(supabase, {
            product_id: old.product_id,
            variant_id: old.variant_id,
            tenant_id: tenantId,
            current_qty: newQty,
            min_qty: existing.min_qty,
            unit: existing.unit,
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
    if (!planLimits.canAddVendor) { alert(copy.plan.limitReached); return; }
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
    if (!editVendorId && !planLimits.canAddVendor) {
      alert(copy.plan.limitReached);
      return;
    }
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
    setRawPresetGroupId("");
    setShowRawForm(true);
  };

  const openEditRaw = (p: DbProduct) => {
    setEditRawId(p.id);
    setRawName(p.name);
    setRawCategory(p.category_id || "");
    setRawDescription(p.description || "");
    setRawActive(p.is_active);
    const storedUnit = state.inventory.find((i) => i.product_id === p.id && (!i.variant_id || i.variant_id === ""))?.unit || "pcs";
    setRawUnit(storedUnit);
    setRawPresetGroupId(rawMaterialGroupMap.get(p.id) || "");
    setShowRawForm(true);
  };

  const handleSaveRaw = async (skipWarnings = false) => {
    if (!editRawId && !planLimits.canAddRawMaterial) {
      alert(copy.plan.limitReached);
      return;
    }
    const nameLower = rawName.trim().toLowerCase();
    const duplicate = rawMaterials.some(
      (p) => p.name.toLowerCase() === nameLower && p.id !== editRawId
    );
    if (duplicate) {
      alert(copy.purchasing.duplicateRawMaterial);
      return;
    }
    if (!editRawId && !skipWarnings && !rawCategory) {
      setShowRawWarning(true);
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
        // Store inventory unit in smallest unit to support fine-grained adjustments/receiving.
        const invUnit = normalizeInventoryUnit(rawUnit);
        const inv = await repo.upsertInventory(supabase, {
          product_id: productId!,
          variant_id: "",
          tenant_id: tenantId,
          current_qty: 0,
          min_qty: 0,
          unit: invUnit,
          avg_cogs: 0,
          updated_at: now,
        });
        dispatch({ type: "UPSERT", table: "inventory", payload: inv as unknown as Record<string, unknown> });
        if (pendingRawItemIdx >= 0) {
          setPendingRawItemIdx(-1);
        }
      }
      // Apply or update preset variant group
      if (productId) {
        const prevGroupId = rawMaterialGroupMap.get(productId) || "";
        if (rawPresetGroupId !== prevGroupId) {
          // Remove old preset variants if deselected
          if (!rawPresetGroupId && prevGroupId) {
            const prevValues = getGroupValues(prevGroupId);
            const prevValueNames = new Set(prevValues.map((v) => v.name.toLowerCase()));
            const affectedVariants = state.variants.filter(
              (v) => v.product_id === productId && prevValueNames.has(v.name.toLowerCase())
            );
            for (const v of affectedVariants) {
              await repo.deleteInventoryByProductVariant(supabase, v.product_id, v.id);
              dispatch({ type: "DELETE", table: "inventory", id: "", compositeKey: { product_id: v.product_id, variant_id: v.id } });
              await repo.deleteVariant(supabase, v.id);
              dispatch({ type: "DELETE", table: "variants", id: v.id });
            }
          }
          // Apply new preset if selected
          if (rawPresetGroupId) {
            const group = state.variantGroups.find((g) => g.id === rawPresetGroupId);
            if (group) {
              const values = getGroupValues(rawPresetGroupId);
              const existingVariantNames = new Set(
                state.variants.filter((v) => v.product_id === productId).map((v) => v.name.toLowerCase())
              );
              const parentInv = state.inventory.find(
                (i) => i.product_id === productId && (!i.variant_id || i.variant_id === "")
              );
              for (const val of values) {
                if (existingVariantNames.has(val.name.toLowerCase())) continue;
                const variantId = crypto.randomUUID();
                const created = await repo.createVariant(supabase, {
                  id: variantId,
                  tenant_id: tenantId,
                  product_id: productId,
                  name: val.name,
                  price_adjustment: 0,
                  updated_at: now,
                });
                dispatch({ type: "UPSERT", table: "variants", payload: created as unknown as Record<string, unknown> });
                const varInv = await repo.upsertInventory(supabase, {
                  product_id: productId,
                  variant_id: variantId,
                  tenant_id: tenantId,
                  current_qty: 0,
                  min_qty: 0,
                  unit: parentInv?.unit || normalizeInventoryUnit(rawUnit),
                  avg_cogs: 0,
                  updated_at: now,
                });
                dispatch({ type: "UPSERT", table: "inventory", payload: varInv as unknown as Record<string, unknown> });
              }
            }
          }
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

  // Vendor bulk delete
  const handleVendorBulkDelete = async () => {
    setVendorBulkDeleting(true);
    try {
      for (const id of selectedVendorIds) {
        await repo.deleteVendor(supabase, id);
        dispatch({ type: "DELETE", table: "vendors", id });
      }
      setSelectedVendorIds(new Set());
    } catch (err) {
      console.error("Bulk delete vendors failed:", err);
    } finally {
      setVendorBulkDeleting(false);
      setShowVendorBulkConfirm(false);
    }
  };

  // Category bulk delete
  const handleCatBulkDelete = async (includeRaws: boolean) => {
    setCatBulkDeleting(true);
    try {
      for (const id of selectedCatIds) {
        if (includeRaws) {
          const raws = rawMaterials.filter((p) => p.category_id === id);
          for (const raw of raws) {
            await repo.deleteProduct(supabase, raw.id);
            dispatch({ type: "DELETE", table: "products", id: raw.id });
          }
        } else {
          const raws = rawMaterials.filter((p) => p.category_id === id);
          for (const raw of raws) {
            const updated = await repo.updateProduct(supabase, raw.id, { category_id: null });
            dispatch({ type: "UPSERT", table: "products", payload: updated as unknown as Record<string, unknown> });
          }
        }
        await repo.deleteCategory(supabase, id);
        dispatch({ type: "DELETE", table: "categories", id });
      }
      setSelectedCatIds(new Set());
    } catch (err) {
      console.error("Bulk delete categories failed:", err);
    } finally {
      setCatBulkDeleting(false);
      setShowCatBulkConfirm(false);
    }
  };

  // Raw material bulk delete
  const handleRawBulkDelete = async () => {
    setRawBulkDeleting(true);
    try {
      for (const id of selectedRawIds) {
        await repo.deleteGoodsReceivingItemsByProductId(supabase, id);
        await repo.deleteComponentsByProductId(supabase, id);
        await repo.deleteInventoryByProductId(supabase, id);
        await repo.deleteProduct(supabase, id);
        dispatch({ type: "DELETE", table: "products", id });
      }
      setSelectedRawIds(new Set());
    } catch (err) {
      console.error("Bulk delete raw materials failed:", err);
    } finally {
      setRawBulkDeleting(false);
      setShowRawBulkConfirm(false);
    }
  };

  // ── Variant Group CSV ─────────────────────────────────────────────────────

  const handleDownloadGroupTemplate = () => {
    const headers = ["preset_name", "variant_1", "variant_2", "variant_3"];
    const example = ["Grade", "Regular", "Premium", "Super"];
    const csv = "\uFEFF" + headers.join(",") + "\n" + example.map((v) => `"${v}"`).join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ayakasir_preset_variants_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportGroupCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setGroupImportMsg(null);
    try {
      const text = await file.text();
      const content = text.startsWith("\uFEFF") ? text.slice(1) : text;
      const lines = content.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) throw new Error(copy.purchasing.groupImportError);

      const headers = parseRawCsvLine(lines[0]).map((h) => h.toLowerCase());
      const idx = (key: string) => headers.indexOf(key);

      const existingGroupNames = new Set(state.variantGroups.map((g) => g.name.toLowerCase()));
      // Build cross-group value uniqueness map
      const allValuesByName = new Map<string, string>();
      for (const g of state.variantGroups) {
        for (const v of state.variantGroupValues.filter((v) => v.group_id === g.id)) {
          allValuesByName.set(v.name.toLowerCase(), g.name);
        }
      }

      const rows: GroupImportRow[] = [];
      const batchGroupNames = new Set<string>();
      // Track values claimed by earlier rows in this batch
      const batchValuesByName = new Map<string, string>(); // valueLower → presetName

      for (let i = 1; i < lines.length; i++) {
        const cols = parseRawCsvLine(lines[i]);
        const presetName = idx("preset_name") >= 0 ? (cols[idx("preset_name")] || "").trim() : "";
        if (!presetName) continue;

        // Collect variant_N columns
        const values: string[] = [];
        for (let hi = 0; hi < headers.length; hi++) {
          if (/^variant_\d+$/.test(headers[hi])) {
            const val = (cols[hi] || "").trim();
            if (val) values.push(val);
          }
        }

        const nameLower = presetName.toLowerCase();
        const isDuplicate = existingGroupNames.has(nameLower) || batchGroupNames.has(nameLower);
        batchGroupNames.add(nameLower);

        // Find values that clash with existing or batch-earlier groups
        const clashingValues = values.filter((v) => {
          const vl = v.toLowerCase();
          return allValuesByName.has(vl) || batchValuesByName.has(vl);
        });
        // Register non-clashing values for later rows in this batch
        for (const v of values) {
          const vl = v.toLowerCase();
          if (!allValuesByName.has(vl) && !batchValuesByName.has(vl)) {
            batchValuesByName.set(vl, presetName);
          }
        }

        rows.push({ presetName, values, isDuplicate, clashingValues });
      }

      if (rows.length === 0) throw new Error(copy.purchasing.groupImportError);
      setGroupImportPreview(rows);
    } catch (err) {
      setGroupImportMsg({ text: err instanceof Error ? err.message : copy.purchasing.groupImportError, ok: false });
    }
  };

  const handleConfirmGroupImport = async () => {
    if (!groupImportPreview) return;
    setGroupImportSaving(true);
    let imported = 0;
    let skipped = 0;
    try {
      const now = Date.now();
      // Build cross-group value map (existing)
      const allValuesByName = new Map<string, string>();
      for (const g of state.variantGroups) {
        for (const v of state.variantGroupValues.filter((v) => v.group_id === g.id)) {
          allValuesByName.set(v.name.toLowerCase(), g.name);
        }
      }

      for (const row of groupImportPreview) {
        if (row.isDuplicate) { skipped++; continue; }
        const newGroupId = crypto.randomUUID();
        const created = await repo.createVariantGroup(supabase, {
          id: newGroupId,
          tenant_id: tenantId,
          name: row.presetName,
          updated_at: now,
        });
        dispatch({ type: "UPSERT", table: "variantGroups", payload: created as unknown as Record<string, unknown> });
        let sortIdx = 0;
        for (const valName of row.values) {
          const valLower = valName.toLowerCase();
          if (allValuesByName.has(valLower)) continue; // skip clashing
          const val = await repo.createVariantGroupValue(supabase, {
            id: crypto.randomUUID(),
            group_id: newGroupId,
            tenant_id: tenantId,
            name: valName,
            sort_order: sortIdx++,
            updated_at: now,
          });
          dispatch({ type: "UPSERT", table: "variantGroupValues", payload: val as unknown as Record<string, unknown> });
          allValuesByName.set(valLower, row.presetName); // register for later rows
        }
        imported++;
      }
      const msg = skipped > 0
        ? `${copy.purchasing.groupImportSuccess} (${skipped} ${copy.purchasing.rawImportSkipped})`
        : copy.purchasing.groupImportSuccess;
      setGroupImportMsg({ text: msg, ok: true });
    } catch (err) {
      setGroupImportMsg({ text: copy.purchasing.groupImportError, ok: false });
      console.error("Group import failed:", err);
    } finally {
      setGroupImportSaving(false);
      setGroupImportPreview(null);
    }
  };

  // ── Variant Group CRUD ────────────────────────────────────────────────────
  const openCreateGroup = () => {
    if (!planLimits.canAddVariantGroup) { alert(copy.plan.limitReached); return; }
    setEditGroupId(null);
    setGroupName("");
    setGroupFormValues([{ tempId: crypto.randomUUID(), name: "" }]);
    setShowGroupForm(true);
  };

  const openEditGroup = (g: DbVariantGroup) => {
    setEditGroupId(g.id);
    setGroupName(g.name);
    const existing = getGroupValues(g.id).map((v) => ({ tempId: v.id, name: v.name }));
    setGroupFormValues(existing.length > 0 ? existing : [{ tempId: crypto.randomUUID(), name: "" }]);
    setEditAppliedProductIds(getGroupAppliedProducts(g.id).map((p) => p.id));
    setEditAddProductId("");
    setShowGroupForm(true);
  };

  const handleSaveGroup = async () => {
    if (!editGroupId && !planLimits.canAddVariantGroup) {
      alert(copy.plan.limitReached);
      return;
    }
    const trimName = groupName.trim();
    if (!trimName) return;
    const validValues = groupFormValues.filter((v) => v.name.trim());
    if (validValues.length === 0) { alert(copy.purchasing.noGroupValues); return; }
    // Duplicate group name check
    const dupGroup = state.variantGroups.some(
      (g) => g.name.toLowerCase() === trimName.toLowerCase() && g.id !== editGroupId
    );
    if (dupGroup) { alert(copy.purchasing.duplicateGroup); return; }
    // Duplicate value name check within form
    const valueNames = validValues.map((v) => v.name.trim().toLowerCase());
    if (new Set(valueNames).size !== valueNames.length) { alert(copy.purchasing.duplicateGroupValue); return; }
    // Cross-group duplicate value check — no value may exist in another group
    for (const otherGroup of state.variantGroups) {
      if (otherGroup.id === editGroupId) continue;
      const otherValues = state.variantGroupValues.filter((v) => v.group_id === otherGroup.id);
      for (const v of validValues) {
        const nameLower = v.name.trim().toLowerCase();
        const clash = otherValues.find((ov) => ov.name.toLowerCase() === nameLower);
        if (clash) { alert(copy.purchasing.duplicateGroupValueCrossGroup(v.name.trim(), otherGroup.name)); return; }
      }
    }

    setSaving(true);
    try {
      const now = Date.now();
      if (editGroupId) {
        const updated = await repo.updateVariantGroup(supabase, editGroupId, { name: trimName });
        dispatch({ type: "UPSERT", table: "variantGroups", payload: updated as unknown as Record<string, unknown> });

        // Sync values: delete all existing, re-insert current list
        const existingValues = getGroupValues(editGroupId);
        for (const ev of existingValues) {
          await repo.deleteVariantGroupValue(supabase, ev.id);
          dispatch({ type: "DELETE", table: "variantGroupValues", id: ev.id });
        }
        for (let i = 0; i < validValues.length; i++) {
          const created = await repo.createVariantGroupValue(supabase, {
            id: crypto.randomUUID(),
            group_id: editGroupId,
            tenant_id: tenantId,
            name: validValues[i].name.trim(),
            sort_order: i,
            updated_at: now,
          });
          dispatch({ type: "UPSERT", table: "variantGroupValues", payload: created as unknown as Record<string, unknown> });
        }

        // Sync applied-to products: apply to newly added, remove from removed
        const prevApplied = getGroupAppliedProducts(editGroupId).map((p) => p.id);
        const newValueNames = new Set(validValues.map((v) => v.name.trim().toLowerCase()));

        // Remove from products that were de-listed
        for (const productId of prevApplied) {
          if (!editAppliedProductIds.includes(productId)) {
            const toRemove = state.variants.filter(
              (v) => v.product_id === productId && newValueNames.has(v.name.toLowerCase())
            );
            for (const v of toRemove) {
              await repo.deleteInventoryByProductVariant(supabase, productId, v.id);
              dispatch({ type: "DELETE", table: "inventory", id: "", compositeKey: { product_id: productId, variant_id: v.id } });
              await repo.deleteVariant(supabase, v.id);
              dispatch({ type: "DELETE", table: "variants", id: v.id });
            }
          }
        }

        // Apply to newly added products
        for (const productId of editAppliedProductIds) {
          if (prevApplied.includes(productId)) continue;
          const existingVariantNames = new Set(
            state.variants.filter((v) => v.product_id === productId).map((v) => v.name.toLowerCase())
          );
          const parentInv = state.inventory.find(
            (i) => i.product_id === productId && (!i.variant_id || i.variant_id === "")
          );
          for (const val of validValues) {
            const valNameLower = val.name.trim().toLowerCase();
            if (existingVariantNames.has(valNameLower)) continue;
            const variantId = crypto.randomUUID();
            const createdVar = await repo.createVariant(supabase, {
              id: variantId,
              tenant_id: tenantId,
              product_id: productId,
              name: val.name.trim(),
              price_adjustment: 0,
              updated_at: now,
            });
            dispatch({ type: "UPSERT", table: "variants", payload: createdVar as unknown as Record<string, unknown> });
            const inv = await repo.upsertInventory(supabase, {
              product_id: productId,
              variant_id: variantId,
              tenant_id: tenantId,
              current_qty: 0,
              min_qty: 0,
              unit: parentInv?.unit || "pcs",
              avg_cogs: 0,
              updated_at: now,
            });
            dispatch({ type: "UPSERT", table: "inventory", payload: inv as unknown as Record<string, unknown> });
          }
        }
      } else {
        const groupId = crypto.randomUUID();
        const created = await repo.createVariantGroup(supabase, {
          id: groupId,
          tenant_id: tenantId,
          name: trimName,
          updated_at: now,
        });
        dispatch({ type: "UPSERT", table: "variantGroups", payload: created as unknown as Record<string, unknown> });
        for (let i = 0; i < validValues.length; i++) {
          const val = await repo.createVariantGroupValue(supabase, {
            id: crypto.randomUUID(),
            group_id: groupId,
            tenant_id: tenantId,
            name: validValues[i].name.trim(),
            sort_order: i,
            updated_at: now,
          });
          dispatch({ type: "UPSERT", table: "variantGroupValues", payload: val as unknown as Record<string, unknown> });
        }
        // Auto-select the newly created preset if the raw form is open
        if (showRawForm) setRawPresetGroupId(groupId);
      }
      setShowGroupForm(false);
    } catch (err) {
      console.error("Save group failed:", err);
    }
    setSaving(false);
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm(copy.purchasing.deleteGroupConfirm)) return;
    try {
      // Remove DbVariant rows for products that used this group's values
      const values = getGroupValues(groupId);
      const valueNames = new Set(values.map((v) => v.name.toLowerCase()));
      const affectedVariants = state.variants.filter(
        (v) => rawMaterials.some((p) => p.id === v.product_id) && valueNames.has(v.name.toLowerCase())
      );
      for (const v of affectedVariants) {
        await repo.deleteInventoryByProductVariant(supabase, v.product_id, v.id);
        dispatch({ type: "DELETE", table: "inventory", id: "", compositeKey: { product_id: v.product_id, variant_id: v.id } });
        await repo.deleteVariant(supabase, v.id);
        dispatch({ type: "DELETE", table: "variants", id: v.id });
      }
      // Delete group (cascades values)
      await repo.deleteVariantGroup(supabase, groupId);
      dispatch({ type: "DELETE", table: "variantGroups", id: groupId });
      // Remove values from state
      for (const val of values) {
        dispatch({ type: "DELETE", table: "variantGroupValues", id: val.id });
      }
    } catch (err) {
      console.error("Delete group failed:", err);
    }
  };

  const handleBulkDeleteGroups = async () => {
    setGroupBulkDeleting(true);
    try {
      for (const gid of selectedGroupIds) {
        await handleDeleteGroup(gid);
      }
      setSelectedGroupIds(new Set());
    } catch (err) {
      console.error("Bulk delete groups failed:", err);
    } finally {
      setGroupBulkDeleting(false);
      setShowGroupBulkConfirm(false);
    }
  };

  const handleApplyPreset = async () => {
    if (!applyGroupTarget || !applyProductId) return;
    setSaving(true);
    try {
      const now = Date.now();
      const values = getGroupValues(applyGroupTarget.id);
      const existingVariantNames = new Set(
        state.variants.filter((v) => v.product_id === applyProductId).map((v) => v.name.toLowerCase())
      );
      const parentInv = state.inventory.find(
        (i) => i.product_id === applyProductId && (!i.variant_id || i.variant_id === "")
      );
      for (const val of values) {
        if (existingVariantNames.has(val.name.toLowerCase())) continue; // skip already applied
        const variantId = crypto.randomUUID();
        const created = await repo.createVariant(supabase, {
          id: variantId,
          tenant_id: tenantId,
          product_id: applyProductId,
          name: val.name,
          price_adjustment: 0,
          updated_at: now,
        });
        dispatch({ type: "UPSERT", table: "variants", payload: created as unknown as Record<string, unknown> });
        const inv = await repo.upsertInventory(supabase, {
          product_id: applyProductId,
          variant_id: variantId,
          tenant_id: tenantId,
          current_qty: 0,
          min_qty: 0,
          unit: parentInv?.unit || "pcs",
          avg_cogs: 0,
          updated_at: now,
        });
        dispatch({ type: "UPSERT", table: "inventory", payload: inv as unknown as Record<string, unknown> });
      }
      setApplyGroupTarget(null);
      setApplyProductId("");
    } catch (err) {
      console.error("Apply preset failed:", err);
    }
    setSaving(false);
  };

  // Inline apply preset from receiving form — creates DbVariant + inventory rows then seeds variantRows
  const handleInlineApplyPreset = async (itemIdx: number, groupId: string, productId: string) => {
    if (!groupId || !productId) return;
    setSaving(true);
    try {
      const now = Date.now();
      const values = getGroupValues(groupId);
      const existingVariants = state.variants.filter((v) => v.product_id === productId);
      const existingVariantNames = new Set(existingVariants.map((v) => v.name.toLowerCase()));
      const parentInv = state.inventory.find(
        (i) => i.product_id === productId && (!i.variant_id || i.variant_id === "")
      );

      // Build variant rows only for values in the selected group
      // Use a local array so we can build variantRows immediately without waiting for state update
      const groupValueNames = new Set(values.map((v) => v.name.toLowerCase()));
      const allVariantRows: VariantRow[] = existingVariants
        .filter((v) => groupValueNames.has(v.name.toLowerCase()))
        .map((v) => ({
          variantId: v.id,
          variantName: v.name,
          qty: "",
          costPerUnit: "",
        }));

      for (const val of values) {
        if (existingVariantNames.has(val.name.toLowerCase())) continue;
        const variantId = crypto.randomUUID();
        const created = await repo.createVariant(supabase, {
          id: variantId,
          tenant_id: tenantId,
          product_id: productId,
          name: val.name,
          price_adjustment: 0,
          updated_at: now,
        });
        dispatch({ type: "UPSERT", table: "variants", payload: created as unknown as Record<string, unknown> });
        const inv = await repo.upsertInventory(supabase, {
          product_id: productId,
          variant_id: variantId,
          tenant_id: tenantId,
          current_qty: 0,
          min_qty: 0,
          unit: parentInv?.unit || "pcs",
          avg_cogs: 0,
          updated_at: now,
        });
        dispatch({ type: "UPSERT", table: "inventory", payload: inv as unknown as Record<string, unknown> });
        allVariantRows.push({ variantId, variantName: val.name, qty: "", costPerUnit: "" });
      }

      // Auto-enable useVariants with the full variant list (no need to wait for state update)
      const next = [...recItems];
      next[itemIdx] = { ...next[itemIdx], useVariants: true, variantRows: allVariantRows, variantId: "" };
      setRecItems(next);
      setInlineApplyIdx(-1);
      setInlineApplyGroupId("");
    } catch (err) {
      console.error("Inline apply preset failed:", err);
    }
    setSaving(false);
  };

  // Raw material CSV template download
  const handleDownloadRawTemplate = () => {
    const headers = ["name", "category", "unit", "description", "preset_variant", "variant_1", "variant_2", "variant_3"];
    const example = ["Chicken Breast", "Protein", "kg", "Fresh chicken breast", "Grade", "Regular", "Premium", "Super"];
    const csv = "\uFEFF" + headers.join(",") + "\n" + example.map((v) => `"${v}"`).join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ayakasir_raw_materials_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Raw material CSV import — step 1: parse → preview
  const handleImportRawCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setRawImportMsg(null);
    try {
      const text = await file.text();
      const content = text.startsWith("\uFEFF") ? text.slice(1) : text;
      const lines = content.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) throw new Error(copy.purchasing.rawImportError);

      const headers = parseRawCsvLine(lines[0]).map((h) => h.toLowerCase());
      const idx = (key: string) => headers.indexOf(key);

      const existingNames = new Set(rawMaterials.map((p) => p.name.toLowerCase()));
      const batchNames = new Set<string>();
      const existingCatNames = new Set(rawCategories.map((c) => c.name.toLowerCase()));
      const existingGroupNames = new Set(state.variantGroups.map((g) => g.name.toLowerCase()));

      const rows: RawImportRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseRawCsvLine(lines[i]);
        const name = idx("name") >= 0 ? cols[idx("name")] ?? "" : "";
        if (!name) continue;

        const category = idx("category") >= 0 ? cols[idx("category")] || "" : "";
        const rawUnit = idx("unit") >= 0 ? cols[idx("unit")] || "pcs" : "pcs";
        const unit = normalizeUnit(rawUnit);
        const description = idx("description") >= 0 ? cols[idx("description")] || "" : "";
        const presetVariant = idx("preset_variant") >= 0 ? cols[idx("preset_variant")] || "" : "";

        // Collect variant_1, variant_2, … variant_N — any column matching /^variant_\d+$/
        const presetValues: string[] = [];
        for (let hi = 0; hi < headers.length; hi++) {
          if (/^variant_\d+$/.test(headers[hi])) {
            const val = (cols[hi] || "").trim();
            if (val) presetValues.push(val);
          }
        }

        const nameLower = name.toLowerCase();
        const isDuplicate = existingNames.has(nameLower) || batchNames.has(nameLower);
        batchNames.add(nameLower);

        const isNewCategory = category.length > 0 && !existingCatNames.has(category.toLowerCase());
        const isNewPreset = presetVariant.length > 0 && !existingGroupNames.has(presetVariant.toLowerCase());

        rows.push({ name, category, unit, description, presetVariant, presetValues, isDuplicate, isNewCategory, isNewPreset });
      }

      if (rows.length === 0) throw new Error(copy.purchasing.rawImportError);
      setRawImportPreview(rows);
    } catch (err) {
      setRawImportMsg({ text: err instanceof Error ? err.message : copy.purchasing.rawImportError, ok: false });
    }
  };

  // Raw material CSV import — step 2: confirm → save
  const handleConfirmRawImport = async () => {
    if (!rawImportPreview) return;
    setRawImportSaving(true);
    const maxRawMaterials = planLimits.limits.maxRawMaterials;
    const currentRawCount = state.products.filter((p) => p.product_type === "RAW_MATERIAL").length;
    let imported = 0;
    let skipped = 0;
    let hitPlanLimit = false;
    try {
      const now = Date.now();
      // Build a live category name map (may have been updated since preview)
      const catByName = new Map(rawCategories.map((c) => [c.name.toLowerCase(), c.id]));
      // Build a live preset group name map (name → { id, valueNames[] })
      type GroupEntry = { id: string; valueNames: string[] };
      const groupByName = new Map<string, GroupEntry>(
        state.variantGroups.map((g) => [
          g.name.toLowerCase(),
          { id: g.id, valueNames: state.variantGroupValues.filter((v) => v.group_id === g.id).map((v) => v.name) },
        ])
      );
      // Build a cross-group value uniqueness map: valueName.lower → groupName (for clash detection)
      const allValuesByName = new Map<string, string>();
      for (const g of state.variantGroups) {
        for (const v of state.variantGroupValues.filter((v) => v.group_id === g.id)) {
          allValuesByName.set(v.name.toLowerCase(), g.name);
        }
      }

      for (const row of rawImportPreview) {
        if (row.isDuplicate) { skipped++; continue; }
        if (currentRawCount + imported >= maxRawMaterials) { hitPlanLimit = true; break; }

        // Auto-create category if needed
        let categoryId: string | null = null;
        if (row.category) {
          const catKey = row.category.toLowerCase();
          if (catByName.has(catKey)) {
            categoryId = catByName.get(catKey)!;
          } else {
            const newCatId = crypto.randomUUID();
            const created = await repo.createCategory(supabase, {
              id: newCatId,
              tenant_id: tenantId,
              name: row.category.trim(),
              sort_order: 0,
              category_type: "RAW_MATERIAL",
              updated_at: now,
            });
            dispatch({ type: "UPSERT", table: "categories", payload: created as unknown as Record<string, unknown> });
            catByName.set(catKey, newCatId);
            categoryId = newCatId;
          }
        }

        // Auto-create preset variant group if new (group with no values — values must be added manually)
        let presetGroupEntry: GroupEntry | null = null;
        if (row.presetVariant) {
          const presetKey = row.presetVariant.toLowerCase();
          if (groupByName.has(presetKey)) {
            presetGroupEntry = groupByName.get(presetKey)!;
          } else {
            const newGroupId = crypto.randomUUID();
            const createdGroup = await repo.createVariantGroup(supabase, {
              id: newGroupId,
              tenant_id: tenantId,
              name: row.presetVariant.trim(),
              updated_at: now,
            });
            dispatch({ type: "UPSERT", table: "variantGroups", payload: createdGroup as unknown as Record<string, unknown> });
            // Create group values from variant_1..N columns (blank values already filtered in parse step)
            // Skip any value that already exists in another group (cross-group uniqueness)
            const newValueNames: string[] = [];
            let sortIdx = 0;
            for (const rawVal of row.presetValues) {
              const valLower = rawVal.toLowerCase();
              if (allValuesByName.has(valLower)) continue; // clashes with existing/already-created value
              const val = await repo.createVariantGroupValue(supabase, {
                id: crypto.randomUUID(),
                group_id: newGroupId,
                tenant_id: tenantId,
                name: rawVal,
                sort_order: sortIdx++,
                updated_at: now,
              });
              dispatch({ type: "UPSERT", table: "variantGroupValues", payload: val as unknown as Record<string, unknown> });
              newValueNames.push(rawVal);
              allValuesByName.set(valLower, row.presetVariant.trim()); // register so later rows in same batch see it
            }
            presetGroupEntry = { id: newGroupId, valueNames: newValueNames };
            groupByName.set(presetKey, presetGroupEntry);
          }
        }

        const productId = crypto.randomUUID();
        const created = await repo.createProduct(supabase, {
          id: productId,
          tenant_id: tenantId,
          name: row.name.trim(),
          price: 0,
          category_id: categoryId,
          description: row.description || null,
          image_path: null,
          is_active: true,
          product_type: "RAW_MATERIAL",
          updated_at: now,
        });
        dispatch({ type: "UPSERT", table: "products", payload: created as unknown as Record<string, unknown> });

        // Store inventory unit in smallest unit to support fine-grained adjustments/receiving.
        const invUnit = normalizeInventoryUnit(row.unit);
        const inv = await repo.upsertInventory(supabase, {
          product_id: productId,
          variant_id: "",
          tenant_id: tenantId,
          current_qty: 0,
          min_qty: 0,
          unit: invUnit,
          avg_cogs: 0,
          updated_at: now,
        });
        dispatch({ type: "UPSERT", table: "inventory", payload: inv as unknown as Record<string, unknown> });

        // Apply preset group variants to the new product
        if (presetGroupEntry && presetGroupEntry.valueNames.length > 0) {
          for (const variantName of presetGroupEntry.valueNames) {
            const variantId = crypto.randomUUID();
            const createdVar = await repo.createVariant(supabase, {
              id: variantId,
              tenant_id: tenantId,
              product_id: productId,
              name: variantName,
              price_adjustment: 0,
              updated_at: now,
            });
            dispatch({ type: "UPSERT", table: "variants", payload: createdVar as unknown as Record<string, unknown> });
            const varInv = await repo.upsertInventory(supabase, {
              product_id: productId,
              variant_id: variantId,
              tenant_id: tenantId,
              current_qty: 0,
              min_qty: 0,
              unit: invUnit,
              avg_cogs: 0,
              updated_at: now,
            });
            dispatch({ type: "UPSERT", table: "inventory", payload: varInv as unknown as Record<string, unknown> });
          }
        }

        imported++;
      }
      const limitNote = hitPlanLimit ? ` — ${copy.purchasing.rawImportPlanLimit}` : "";
      const msg = skipped > 0
        ? `${copy.purchasing.rawImportSuccess} (${skipped} ${copy.purchasing.rawImportSkipped})${limitNote}`
        : `${copy.purchasing.rawImportSuccess}${limitNote}`;
      setRawImportMsg({ text: msg, ok: !hitPlanLimit });
    } catch (err) {
      setRawImportMsg({ text: copy.purchasing.rawImportError, ok: false });
      console.error("Raw material import failed:", err);
    } finally {
      setRawImportSaving(false);
      setRawImportPreview(null);
    }
  };

  // Vendor CSV template download
  const handleDownloadVendorTemplate = () => {
    const headers = ["name", "phone", "address"];
    const example = ["PT Maju Jaya", "08123456789", "Jl. Sudirman No. 1, Jakarta"];
    const csv = "\uFEFF" + headers.join(",") + "\n" + example.map((v) => `"${v}"`).join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ayakasir_vendors_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Vendor CSV import — step 1: parse → preview
  const handleImportVendorCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setVendorImportMsg(null);
    try {
      const text = await file.text();
      const content = text.startsWith("\uFEFF") ? text.slice(1) : text;
      const lines = content.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) throw new Error(copy.purchasing.importError);

      const headers = parseVendorCsvLine(lines[0]).map((h) => h.toLowerCase());
      const idx = (key: string) => headers.indexOf(key);

      const existingNames = new Set(state.vendors.map((v) => v.name.toLowerCase()));
      const batchNames = new Set<string>();

      const rows: VendorImportRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseVendorCsvLine(lines[i]);
        const name = idx("name") >= 0 ? cols[idx("name")] ?? "" : "";
        if (!name) continue;

        const rawPhone = idx("phone") >= 0 ? cols[idx("phone")] || null : null;
        const phone = normalizeVendorPhone(rawPhone);
        const address = idx("address") >= 0 ? cols[idx("address")] || null : null;

        const nameLower = name.toLowerCase();
        const isDuplicate = existingNames.has(nameLower) || batchNames.has(nameLower);
        batchNames.add(nameLower);

        rows.push({ name, phone, address, isDuplicate });
      }

      if (rows.length === 0) throw new Error(copy.purchasing.importError);
      setVendorImportPreview(rows);
    } catch (err) {
      setVendorImportMsg({ text: err instanceof Error ? err.message : copy.purchasing.importError, ok: false });
    }
  };

  // Vendor CSV import — step 2: confirm → save
  const handleConfirmVendorImport = async () => {
    if (!vendorImportPreview) return;
    setVendorImportSaving(true);
    const maxVendors = planLimits.limits.maxVendors;
    const currentVendorCount = state.vendors.length;
    let imported = 0;
    let skipped = 0;
    let hitPlanLimit = false;
    try {
      const now = Date.now();
      for (const row of vendorImportPreview) {
        if (row.isDuplicate) { skipped++; continue; }
        if (currentVendorCount + imported >= maxVendors) { hitPlanLimit = true; break; }
        const newId = crypto.randomUUID();
        const created = await repo.createVendor(supabase, {
          id: newId,
          tenant_id: tenantId,
          name: row.name.trim(),
          phone: row.phone || null,
          address: row.address || null,
          updated_at: now,
        });
        dispatch({ type: "UPSERT", table: "vendors", payload: created as unknown as Record<string, unknown> });
        imported++;
      }
      const limitNote = hitPlanLimit ? ` — ${copy.purchasing.importPlanLimit}` : "";
      const msg = skipped > 0
        ? `${copy.purchasing.importSuccess} (${skipped} ${copy.purchasing.importSkipped})${limitNote}`
        : `${copy.purchasing.importSuccess}${limitNote}`;
      setVendorImportMsg({ text: msg, ok: !hitPlanLimit });
    } catch (err) {
      setVendorImportMsg({ text: copy.purchasing.importError, ok: false });
      console.error("Vendor import failed:", err);
    } finally {
      setVendorImportSaving(false);
      setVendorImportPreview(null);
    }
  };

  // Category CSV template download
  const handleDownloadCatTemplate = () => {
    const headers = ["name", "sort_order"];
    const example = ["Sayuran", "1"];
    const csv = "\uFEFF" + headers.join(",") + "\n" + example.map((v, i) => i === 1 ? v : `"${v}"`).join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ayakasir_raw_categories_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Category CSV import — step 1: parse → preview
  const handleImportCatCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCatImportMsg(null);
    try {
      const text = await file.text();
      const content = text.startsWith("\uFEFF") ? text.slice(1) : text;
      const lines = content.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) throw new Error(copy.purchasing.importError);

      const headers = parseCatCsvLine(lines[0]).map((h) => h.toLowerCase());
      const idx = (key: string) => headers.indexOf(key);

      const existingNames = new Set(rawCategories.map((c) => c.name.toLowerCase()));
      const batchNames = new Set<string>();

      const rows: CatImportRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCatCsvLine(lines[i]);
        const name = idx("name") >= 0 ? cols[idx("name")] ?? "" : "";
        if (!name) continue;

        const sort_order = idx("sort_order") >= 0 ? parseInt(cols[idx("sort_order")] || "0") || 0 : 0;

        const nameLower = name.toLowerCase();
        const isDuplicate = existingNames.has(nameLower) || batchNames.has(nameLower);
        batchNames.add(nameLower);

        rows.push({ name, sort_order, isDuplicate });
      }

      if (rows.length === 0) throw new Error(copy.purchasing.importError);
      setCatImportPreview(rows);
    } catch (err) {
      setCatImportMsg({ text: err instanceof Error ? err.message : copy.purchasing.importError, ok: false });
    }
  };

  // Category CSV import — step 2: confirm → save
  const handleConfirmCatImport = async () => {
    if (!catImportPreview) return;
    setCatImportSaving(true);
    const maxRawCategories = planLimits.limits.maxRawCategories;
    const currentCatCount = rawCategories.length;
    let imported = 0;
    let skipped = 0;
    let hitPlanLimit = false;
    try {
      const now = Date.now();
      for (const row of catImportPreview) {
        if (row.isDuplicate) { skipped++; continue; }
        if (currentCatCount + imported >= maxRawCategories) { hitPlanLimit = true; break; }
        const newId = crypto.randomUUID();
        const created = await repo.createCategory(supabase, {
          id: newId,
          tenant_id: tenantId,
          name: row.name.trim(),
          sort_order: row.sort_order,
          category_type: "RAW_MATERIAL",
          updated_at: now,
        });
        dispatch({ type: "UPSERT", table: "categories", payload: created as unknown as Record<string, unknown> });
        imported++;
      }
      const limitNote = hitPlanLimit ? ` — ${copy.purchasing.catImportPlanLimit}` : "";
      const msg = skipped > 0
        ? `${copy.purchasing.catImportSuccess} (${skipped} ${copy.purchasing.importSkipped})${limitNote}`
        : `${copy.purchasing.catImportSuccess}${limitNote}`;
      setCatImportMsg({ text: msg, ok: !hitPlanLimit });
    } catch (err) {
      setCatImportMsg({ text: copy.purchasing.importError, ok: false });
      console.error("Category import failed:", err);
    } finally {
      setCatImportSaving(false);
      setCatImportPreview(null);
    }
  };

  // Raw material category CRUD
  const openCreateRawCat = () => {
    if (!planLimits.canAddRawCategory) { alert(copy.plan.limitReached); return; }
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
    if (!editRawCatId && !planLimits.canAddRawCategory) {
      alert(copy.plan.limitReached);
      return;
    }
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

  const handleDeleteRawCat = (id: string) => {
    const cat = rawCategories.find((c) => c.id === id);
    if (!cat) return;
    const rawMaterialCount = rawMaterials.filter((p) => p.category_id === id).length;
    setShowRawCatForm(false);
    setShowCatBulkConfirm(false);
    setDeleteCatTarget({ id, name: cat.name, rawMaterialCount });
  };

  const handleConfirmDeleteCatWithRaws = async () => {
    if (!deleteCatTarget) return;
    try {
      // Delete all raw materials in this category first
      const raws = rawMaterials.filter((p) => p.category_id === deleteCatTarget.id);
      for (const raw of raws) {
        await repo.deleteProduct(supabase, raw.id);
        dispatch({ type: "DELETE", table: "products", id: raw.id });
      }
      await repo.deleteCategory(supabase, deleteCatTarget.id);
      dispatch({ type: "DELETE", table: "categories", id: deleteCatTarget.id });
    } catch (err) {
      console.error("Delete category with raws failed:", err);
    }
    setDeleteCatTarget(null);
  };

  const handleConfirmDeleteCatKeepRaws = async () => {
    if (!deleteCatTarget) return;
    try {
      // Patch all raw materials to null category_id
      const raws = rawMaterials.filter((p) => p.category_id === deleteCatTarget.id);
      for (const raw of raws) {
        const updated = await repo.updateProduct(supabase, raw.id, { category_id: null });
        dispatch({ type: "UPSERT", table: "products", payload: updated as unknown as Record<string, unknown> });
      }
      await repo.deleteCategory(supabase, deleteCatTarget.id);
      dispatch({ type: "DELETE", table: "categories", id: deleteCatTarget.id });
    } catch (err) {
      console.error("Delete category keep raws failed:", err);
    }
    setDeleteCatTarget(null);
  };

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">{copy.purchasing.title}</h1>
        {tab === "receiving" && (
          <button className="erp-btn erp-btn--primary erp-btn--sm" onClick={openCreateReceiving} disabled={!planLimits.canAddReceiving}>
            {copy.purchasing.addReceiving} {planLimits.limits.maxGoodsReceivings < Infinity ? `(${planLimits.counts.goodsReceivings}/${planLimits.limits.maxGoodsReceivings})` : ""}
          </button>
        )}
        {tab === "vendors" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={handleDownloadVendorTemplate}>
              ↓ {copy.purchasing.downloadTemplate}
            </button>
            <label className="erp-btn erp-btn--ghost erp-btn--sm" style={{ cursor: "pointer" }}>
              ↑ {copy.purchasing.importCsv}
              <input type="file" accept=".csv" style={{ display: "none" }} onChange={handleImportVendorCsv} />
            </label>
            <button className="erp-btn erp-btn--primary erp-btn--sm" onClick={openCreateVendor} disabled={!planLimits.canAddVendor}>
              {copy.purchasing.addVendor} {planLimits.limits.maxVendors < Infinity ? `(${planLimits.counts.vendors}/${planLimits.limits.maxVendors})` : ""}
            </button>
          </div>
        )}
        {tab === "rawMaterials" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={handleDownloadRawTemplate}>
              ↓ {copy.purchasing.rawDownloadTemplate}
            </button>
            <label className="erp-btn erp-btn--ghost erp-btn--sm" style={{ cursor: "pointer" }}>
              ↑ {copy.purchasing.rawImportCsv}
              <input type="file" accept=".csv" style={{ display: "none" }} onChange={handleImportRawCsv} />
            </label>
            <button className="erp-btn erp-btn--primary erp-btn--sm" onClick={openCreateRaw} disabled={!planLimits.canAddRawMaterial}>
              {copy.purchasing.addRawMaterial} {planLimits.limits.maxRawMaterials < Infinity ? `(${planLimits.counts.rawMaterials}/${planLimits.limits.maxRawMaterials})` : ""}
            </button>
          </div>
        )}
        {tab === "categories" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={handleDownloadCatTemplate}>
              ↓ {copy.purchasing.downloadTemplate}
            </button>
            <label className="erp-btn erp-btn--ghost erp-btn--sm" style={{ cursor: "pointer" }}>
              ↑ {copy.purchasing.importCsv}
              <input type="file" accept=".csv" style={{ display: "none" }} onChange={handleImportCatCsv} />
            </label>
            <button className="erp-btn erp-btn--primary erp-btn--sm" onClick={openCreateRawCat} disabled={!planLimits.canAddRawCategory}>
              {copy.purchasing.addRawCategory} {planLimits.limits.maxRawCategories < Infinity ? `(${planLimits.counts.rawCategories}/${planLimits.limits.maxRawCategories})` : ""}
            </button>
          </div>
        )}
        {tab === "variants" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={handleDownloadGroupTemplate}>
              ↓ {copy.purchasing.groupDownloadTemplate}
            </button>
            <label className="erp-btn erp-btn--ghost erp-btn--sm" style={{ cursor: "pointer" }}>
              ↑ {copy.purchasing.groupImportCsv}
              <input type="file" accept=".csv" style={{ display: "none" }} onChange={handleImportGroupCsv} />
            </label>
            <button className="erp-btn erp-btn--primary erp-btn--sm" onClick={openCreateGroup} disabled={!planLimits.canAddVariantGroup}>
              {copy.purchasing.addVariantGroup} {planLimits.limits.maxVariantGroups < Infinity ? `(${planLimits.counts.variantGroups}/${planLimits.limits.maxVariantGroups})` : ""}
            </button>
          </div>
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
        <button className={`erp-tab${tab === "variants" ? " erp-tab--active" : ""}`} onClick={() => setTab("variants")}>
          {copy.purchasing.variants}
        </button>
      </div>

      {tab === "rawMaterials" && (
        <>
          {/* Import message banner */}
          {rawImportMsg && (
            <div className={`erp-import-msg${rawImportMsg.ok ? " erp-import-msg--ok" : " erp-import-msg--err"}`}>
              {rawImportMsg.text}
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setRawImportMsg(null)} style={{ marginLeft: 8 }}>✕</button>
            </div>
          )}

          {/* Bulk bar */}
          {isOwner && selectedRawIds.size > 0 && (
            <div className="erp-bulk-bar">
              <span>{selectedRawIds.size} {copy.common.selected}</span>
              <button
                className="erp-btn erp-btn--danger erp-btn--sm"
                onClick={() => setShowRawBulkConfirm(true)}
              >
                {copy.purchasing.rawBulkDelete}
              </button>
            </div>
          )}

          {/* Category filter chips + pagination info */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            <div className="erp-filter-bar" style={{ margin: 0 }}>
              <span
                className={`erp-chip${filterRawCategory === "" ? " erp-chip--active" : ""}`}
                onClick={() => { setFilterRawCategory(""); setRawPage(0); setSelectedRawIds(new Set()); }}
              >
                {copy.pos.allCategories}
              </span>
              {rawCategories.map((c) => (
                <span
                  key={c.id}
                  className={`erp-chip${filterRawCategory === c.id ? " erp-chip--active" : ""}`}
                  onClick={() => { setFilterRawCategory(filterRawCategory === c.id ? "" : c.id); setRawPage(0); setSelectedRawIds(new Set()); }}
                >
                  {c.name}
                </span>
              ))}
            </div>
            <div className="erp-table-pagination-info">
              <span>{copy.purchasing.rawRowsPerPage}:</span>
              {([10, 25, 50] as const).map((n) => (
                <span
                  key={n}
                  className={`erp-chip erp-chip--sm${rawPageSize === n ? " erp-chip--active" : ""}`}
                  onClick={() => { setRawPageSize(n); setRawPage(0); setSelectedRawIds(new Set()); }}
                >
                  {n}
                </span>
              ))}
              <span>
                {filteredRawMaterials.length === 0 ? "0" : `${rawPage * rawPageSize + 1}–${Math.min((rawPage + 1) * rawPageSize, filteredRawMaterials.length)}`} / {filteredRawMaterials.length}
              </span>
            </div>
          </div>

          <div className="erp-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder={copy.common.search}
              value={rawSearch}
              onChange={(e) => { setRawSearch(e.target.value); setRawPage(0); setSelectedRawIds(new Set()); }}
            />
          </div>

          <div className="erp-table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  {isOwner && (
                    <th style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        checked={pagedRawMaterials.length > 0 && pagedRawMaterials.every((p) => selectedRawIds.has(p.id))}
                        onChange={(e) => {
                          const next = new Set(selectedRawIds);
                          pagedRawMaterials.forEach((p) => e.target.checked ? next.add(p.id) : next.delete(p.id));
                          setSelectedRawIds(next);
                        }}
                      />
                    </th>
                  )}
                  <th>{copy.products.name}</th>
                  <th>{copy.products.category}</th>
                  <th>{copy.products.unit}</th>
                  <th>{copy.purchasing.variants}</th>
                  <th>{copy.products.active}</th>
                  <th>{copy.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRawMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={isOwner ? 7 : 6} style={{ textAlign: "center", color: "var(--erp-muted)" }}>
                      {copy.purchasing.noRawMaterials}
                    </td>
                  </tr>
                ) : (
                  pagedRawMaterials.map((p) => {
                    const assignedGroupId = rawMaterialGroupMap.get(p.id);
                    const assignedGroup = assignedGroupId ? state.variantGroups.find((g) => g.id === assignedGroupId) : null;
                    const groupValues = assignedGroupId
                      ? state.variantGroupValues.filter((v) => v.group_id === assignedGroupId).sort((a, b) => a.sort_order - b.sort_order)
                      : [];
                    return (
                    <tr key={p.id} className={selectedRawIds.has(p.id) ? "erp-table-row--selected" : ""}>
                      {isOwner && (
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedRawIds.has(p.id)}
                            onChange={(e) => {
                              const next = new Set(selectedRawIds);
                              e.target.checked ? next.add(p.id) : next.delete(p.id);
                              setSelectedRawIds(next);
                            }}
                          />
                        </td>
                      )}
                      <td><strong>{p.name}</strong></td>
                      <td>{getRawCategoryName(p.category_id)}</td>
                      <td>{getRawInventoryUnit(p.id)}</td>
                      <td>
                        {assignedGroup ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: "var(--erp-muted)", marginRight: 2 }}>{assignedGroup.name}:</span>
                            {groupValues.map((v) => (
                              <span key={v.id} className="erp-badge erp-badge--info" style={{ fontSize: 11 }}>{v.name}</span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: "var(--erp-muted)", fontSize: 12 }}>—</span>
                        )}
                      </td>
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination nav */}
          {rawTotalPages > 1 && (
            <div className="erp-table-pagination">
              <button className="erp-btn erp-btn--ghost erp-btn--sm" disabled={rawPage === 0} onClick={() => setRawPage((p) => p - 1)}>‹</button>
              <span style={{ fontSize: 13 }}>{rawPage + 1} / {rawTotalPages}</span>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" disabled={rawPage >= rawTotalPages - 1} onClick={() => setRawPage((p) => p + 1)}>›</button>
            </div>
          )}
        </>
      )}

      {tab === "receiving" && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 8 }}>
            <div className="erp-table-pagination-info">
              <span>{copy.purchasing.rowsPerPage}:</span>
              {([10, 25, 50] as const).map((n) => (
                <span
                  key={n}
                  className={`erp-chip erp-chip--sm${receivingPageSize === n ? " erp-chip--active" : ""}`}
                  onClick={() => { setReceivingPageSize(n); setReceivingPage(0); }}
                >
                  {n}
                </span>
              ))}
              <span>
                {filteredReceivings.length === 0 ? "0" : `${receivingPage * receivingPageSize + 1}–${Math.min((receivingPage + 1) * receivingPageSize, filteredReceivings.length)}`} / {filteredReceivings.length}
              </span>
            </div>
          </div>

          <div className="erp-filter-bar" style={{ flexWrap: "wrap", gap: 8 }}>
            <input
              className="erp-input"
              type="date"
              value={filterDate}
              onChange={(e) => { setFilterDate(e.target.value); setReceivingPage(0); }}
              style={{ width: "auto" }}
            />
            <select
              className="erp-select"
              value={filterVendorId}
              onChange={(e) => { setFilterVendorId(e.target.value); setReceivingPage(0); }}
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
                onChange={(e) => { setFilterItemName(e.target.value); setReceivingPage(0); }}
              />
            </div>
            {(filterDate || filterVendorId || filterItemName) && (
              <button
                className="erp-btn erp-btn--ghost erp-btn--sm"
                onClick={() => { setFilterDate(""); setFilterVendorId(""); setFilterItemName(""); setReceivingPage(0); }}
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
                pagedReceivings.map((r) => {
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
                                  lineItems.map((li) => {
                                    const dispQty = li.unit === "g" ? li.qty / 1000 : li.unit === "mL" ? li.qty / 1000 : li.qty;
                                    const dispUnit = li.unit === "g" ? "kg" : li.unit === "mL" ? "L" : li.unit;
                                    return (
                                      <tr key={li.id}>
                                        <td>
                                          {getProductName(li.product_id)}
                                          {li.variant_id && (() => { const vn = state.variants.find((v) => v.id === li.variant_id); return vn ? <span style={{ color: "var(--erp-muted)" }}> ({vn.name})</span> : null; })()}
                                        </td>
                                        <td>{dispQty % 1 === 0 ? dispQty : dispQty.toFixed(3).replace(/\.?0+$/, "")}</td>
                                        <td>{dispUnit}</td>
                                        <td>{formatRupiah(li.qty * li.cost_per_unit)}</td>
                                      </tr>
                                    );
                                  })
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
          {receivingTotalPages > 1 && (
            <div className="erp-table-pagination">
              <button className="erp-btn erp-btn--ghost erp-btn--sm" disabled={receivingPage === 0} onClick={() => setReceivingPage((p) => p - 1)}>‹</button>
              <span style={{ fontSize: 13 }}>{receivingPage + 1} / {receivingTotalPages}</span>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" disabled={receivingPage >= receivingTotalPages - 1} onClick={() => setReceivingPage((p) => p + 1)}>›</button>
            </div>
          )}
          </div>
        </>
      )}

      {tab === "vendors" && (
        <>
          {/* Import message banner */}
          {vendorImportMsg && (
            <div className={`erp-import-msg${vendorImportMsg.ok ? " erp-import-msg--ok" : " erp-import-msg--err"}`}>
              {vendorImportMsg.text}
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setVendorImportMsg(null)} style={{ marginLeft: 8 }}>✕</button>
            </div>
          )}

          {/* Bulk bar */}
          {isOwner && selectedVendorIds.size > 0 && (
            <div className="erp-bulk-bar">
              <span>{selectedVendorIds.size} {copy.common.selected}</span>
              <button
                className="erp-btn erp-btn--danger erp-btn--sm"
                onClick={() => setShowVendorBulkConfirm(true)}
              >
                {copy.purchasing.bulkDelete}
              </button>
            </div>
          )}

          {/* Pagination info + search */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 6 }}>
            <div className="erp-table-pagination-info">
              <span>{copy.purchasing.rowsPerPage}:</span>
              {([10, 25, 50] as const).map((n) => (
                <span
                  key={n}
                  className={`erp-chip erp-chip--sm${vendorPageSize === n ? " erp-chip--active" : ""}`}
                  onClick={() => { setVendorPageSize(n); setVendorPage(0); setSelectedVendorIds(new Set()); }}
                >
                  {n}
                </span>
              ))}
              <span>
                {sortedVendors.length === 0 ? "0" : `${vendorPage * vendorPageSize + 1}–${Math.min((vendorPage + 1) * vendorPageSize, sortedVendors.length)}`} / {sortedVendors.length}
              </span>
            </div>
          </div>

          <div className="erp-search" style={{ marginBottom: 8 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder={copy.common.search}
              value={vendorSearch}
              onChange={(e) => { setVendorSearch(e.target.value); setVendorPage(0); setSelectedVendorIds(new Set()); }}
            />
          </div>

          <div className="erp-table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  {isOwner && (
                    <th style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        checked={pagedVendors.length > 0 && pagedVendors.every((v) => selectedVendorIds.has(v.id))}
                        onChange={(e) => {
                          const next = new Set(selectedVendorIds);
                          pagedVendors.forEach((v) => e.target.checked ? next.add(v.id) : next.delete(v.id));
                          setSelectedVendorIds(next);
                        }}
                      />
                    </th>
                  )}
                  <th>{copy.purchasing.vendorName}</th>
                  <th>{copy.purchasing.phone}</th>
                  <th>{copy.purchasing.address}</th>
                  <th>{copy.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {sortedVendors.length === 0 ? (
                  <tr>
                    <td colSpan={isOwner ? 5 : 4} style={{ textAlign: "center", color: "var(--erp-muted)" }}>
                      {copy.purchasing.noVendors}
                    </td>
                  </tr>
                ) : (
                  pagedVendors.map((v) => (
                    <tr key={v.id} className={selectedVendorIds.has(v.id) ? "erp-table-row--selected" : ""}>
                      {isOwner && (
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedVendorIds.has(v.id)}
                            onChange={(e) => {
                              const next = new Set(selectedVendorIds);
                              e.target.checked ? next.add(v.id) : next.delete(v.id);
                              setSelectedVendorIds(next);
                            }}
                          />
                        </td>
                      )}
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

          {/* Pagination nav */}
          {vendorTotalPages > 1 && (
            <div className="erp-table-pagination">
              <button className="erp-btn erp-btn--ghost erp-btn--sm" disabled={vendorPage === 0} onClick={() => setVendorPage((p) => p - 1)}>‹</button>
              <span style={{ fontSize: 13 }}>{vendorPage + 1} / {vendorTotalPages}</span>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" disabled={vendorPage >= vendorTotalPages - 1} onClick={() => setVendorPage((p) => p + 1)}>›</button>
            </div>
          )}
        </>
      )}

      {tab === "categories" && (
        <>
          {catImportMsg && (
            <div className={`erp-import-msg${catImportMsg.ok ? " erp-import-msg--ok" : " erp-import-msg--err"}`}>
              {catImportMsg.text}
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setCatImportMsg(null)}>✕</button>
            </div>
          )}

          {isOwner && selectedCatIds.size > 0 && (
            <div className="erp-bulk-bar">
              <span>{selectedCatIds.size} {copy.common.selected}</span>
              <button
                className="erp-btn erp-btn--danger erp-btn--sm"
                onClick={() => { setDeleteCatTarget(null); setShowCatBulkConfirm(true); }}
              >
                {copy.purchasing.bulkDelete}
              </button>
            </div>
          )}

          {/* Pagination info + search */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 6 }}>
            <div className="erp-table-pagination-info">
              <span>{copy.purchasing.rowsPerPage}:</span>
              {([10, 25, 50] as const).map((n) => (
                <span
                  key={n}
                  className={`erp-chip erp-chip--sm${catPageSize === n ? " erp-chip--active" : ""}`}
                  onClick={() => { setCatPageSize(n); setCatPage(0); setSelectedCatIds(new Set()); }}
                >
                  {n}
                </span>
              ))}
              <span>
                {sortedRawCategories.length === 0 ? "0" : `${catPage * catPageSize + 1}–${Math.min((catPage + 1) * catPageSize, sortedRawCategories.length)}`} / {sortedRawCategories.length}
              </span>
            </div>
          </div>

          <div className="erp-search" style={{ marginBottom: 8 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder={copy.common.search}
              value={catSearch}
              onChange={(e) => { setCatSearch(e.target.value); setCatPage(0); setSelectedCatIds(new Set()); }}
            />
          </div>

          <div className="erp-table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  {isOwner && <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={pagedRawCategories.length > 0 && pagedRawCategories.every((c) => selectedCatIds.has(c.id))}
                      onChange={(e) => {
                        const next = new Set(selectedCatIds);
                        pagedRawCategories.forEach((c) => e.target.checked ? next.add(c.id) : next.delete(c.id));
                        setSelectedCatIds(next);
                      }}
                    />
                  </th>}
                  <th>{copy.products.categoryName}</th>
                  <th>{copy.products.sortOrder}</th>
                  <th>{copy.purchasing.itemCount}</th>
                  <th>{copy.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {sortedRawCategories.length === 0 ? (
                  <tr>
                    <td colSpan={isOwner ? 5 : 4} style={{ textAlign: "center", color: "var(--erp-muted)" }}>
                      {copy.purchasing.noCategories}
                    </td>
                  </tr>
                ) : (
                  pagedRawCategories.map((c) => (
                    <tr key={c.id} className={selectedCatIds.has(c.id) ? "erp-table-row--selected" : ""}>
                      {isOwner && (
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedCatIds.has(c.id)}
                            onChange={(e) => {
                              const next = new Set(selectedCatIds);
                              e.target.checked ? next.add(c.id) : next.delete(c.id);
                              setSelectedCatIds(next);
                            }}
                          />
                        </td>
                      )}
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

          {/* Pagination nav */}
          {catTotalPages > 1 && (
            <div className="erp-table-pagination">
              <button className="erp-btn erp-btn--ghost erp-btn--sm" disabled={catPage === 0} onClick={() => setCatPage((p) => p - 1)}>‹</button>
              <span style={{ fontSize: 13 }}>{catPage + 1} / {catTotalPages}</span>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" disabled={catPage >= catTotalPages - 1} onClick={() => setCatPage((p) => p + 1)}>›</button>
            </div>
          )}
        </>
      )}

      {/* ── Variants Tab ──────────────────────────────────────────────────── */}
      {tab === "variants" && (
        <>
          {/* Import message banner */}
          {groupImportMsg && (
            <div className={`erp-import-msg${groupImportMsg.ok ? " erp-import-msg--ok" : " erp-import-msg--err"}`}>
              {groupImportMsg.text}
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setGroupImportMsg(null)} style={{ marginLeft: 8 }}>✕</button>
            </div>
          )}

          {/* Bulk bar */}
          {isOwner && selectedGroupIds.size > 0 && (
            <div className="erp-bulk-bar">
              <span>{selectedGroupIds.size} {copy.common.selected}</span>
              <button className="erp-btn erp-btn--danger erp-btn--sm" onClick={() => setShowGroupBulkConfirm(true)}>
                {copy.purchasing.groupBulkDelete}
              </button>
            </div>
          )}

          {/* Pagination info + search */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 6 }}>
            <div className="erp-table-pagination-info">
              <span>{copy.purchasing.variantGroupRowsPerPage}:</span>
              {([10, 25, 50] as const).map((s) => (
                <span key={s} className={`erp-chip erp-chip--sm${groupPageSize === s ? " erp-chip--active" : ""}`} onClick={() => { setGroupPageSize(s); setGroupPage(0); setSelectedGroupIds(new Set()); }}>{s}</span>
              ))}
              <span>
                {filteredGroups.length === 0 ? "0" : `${groupPage * groupPageSize + 1}–${Math.min((groupPage + 1) * groupPageSize, filteredGroups.length)}`} / {filteredGroups.length}
              </span>
            </div>
          </div>

          <div className="erp-search" style={{ marginBottom: 8 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder={copy.common.search}
              value={groupSearch}
              onChange={(e) => { setGroupSearch(e.target.value); setGroupPage(0); setSelectedGroupIds(new Set()); }}
            />
          </div>

          <div className="erp-table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  {isOwner && (
                    <th style={{ width: 32 }}>
                      <input type="checkbox" checked={pagedGroups.length > 0 && pagedGroups.every((g) => selectedGroupIds.has(g.id))} onChange={(e) => {
                        const next = new Set(selectedGroupIds);
                        pagedGroups.forEach((g) => e.target.checked ? next.add(g.id) : next.delete(g.id));
                        setSelectedGroupIds(next);
                      }} />
                    </th>
                  )}
                  <th>{copy.purchasing.variantGroupName}</th>
                  <th>{copy.purchasing.groupValues}</th>
                  <th>{copy.purchasing.appliedTo}</th>
                  <th>{copy.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {pagedGroups.length === 0 ? (
                  <tr><td colSpan={isOwner ? 5 : 4} style={{ color: "var(--erp-muted)", textAlign: "center" }}>{copy.purchasing.noGroups}</td></tr>
                ) : (
                  pagedGroups.map((g) => {
                    const values = getGroupValues(g.id);
                    const applied = getGroupAppliedProducts(g.id);
                    return (
                      <tr key={g.id} className={selectedGroupIds.has(g.id) ? "erp-table-row--selected" : ""}>
                        {isOwner && (
                          <td>
                            <input type="checkbox" checked={selectedGroupIds.has(g.id)} onChange={(e) => {
                              const next = new Set(selectedGroupIds);
                              e.target.checked ? next.add(g.id) : next.delete(g.id);
                              setSelectedGroupIds(next);
                            }} />
                          </td>
                        )}
                        <td><strong>{g.name}</strong></td>
                        <td>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {values.map((v) => (
                              <span key={v.id} className="erp-badge erp-badge--info" style={{ fontSize: 11 }}>{v.name}</span>
                            ))}
                          </div>
                        </td>
                        <td style={{ fontSize: 13, color: "var(--erp-ink-secondary)" }}>
                          {applied.length === 0 ? "—" : applied.map((p) => p.name).join(", ")}
                        </td>
                        <td className="erp-td-actions">
                          <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => { setApplyGroupTarget(g); setApplyProductId(""); }}>
                            {copy.purchasing.applyPreset}
                          </button>
                          <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => openEditGroup(g)}>
                            {copy.common.edit}
                          </button>
                          {isOwner && (
                            <button className="erp-btn erp-btn--ghost erp-btn--sm" style={{ color: "var(--erp-danger)" }} onClick={() => handleDeleteGroup(g.id)}>
                              {copy.common.delete}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination nav */}
          {groupTotalPages > 1 && (
            <div className="erp-table-pagination">
              <button className="erp-btn erp-btn--ghost erp-btn--sm" disabled={groupPage === 0} onClick={() => setGroupPage((p) => p - 1)}>‹</button>
              <span style={{ fontSize: 13 }}>{groupPage + 1} / {groupTotalPages}</span>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" disabled={groupPage >= groupTotalPages - 1} onClick={() => setGroupPage((p) => p + 1)}>›</button>
            </div>
          )}
        </>
      )}

      {/* Variant Group Form Dialog */}
      {showGroupForm && (
        <div className={`erp-overlay${showRawForm ? " erp-overlay--top" : ""}`} onClick={() => setShowGroupForm(false)}>
          <div className="erp-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{editGroupId ? copy.purchasing.editVariantGroup : copy.purchasing.addVariantGroup}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowGroupForm(false)}>{copy.common.close}</button>
            </div>
            <div className="erp-dialog-body">
              <div className="erp-input-group">
                <label className="erp-label">{copy.purchasing.variantGroupName}</label>
                <input className="erp-input" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Size, Color" />
              </div>
              <div className="erp-input-group">
                <label className="erp-label" style={{ marginBottom: 8 }}>{copy.purchasing.groupValues}</label>
                {groupFormValues.map((v, i) => (
                  <div key={v.tempId} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <input
                      className="erp-input"
                      value={v.name}
                      placeholder={`${copy.purchasing.addValue} ${i + 1}`}
                      onChange={(e) => {
                        const next = [...groupFormValues];
                        next[i] = { ...next[i], name: e.target.value };
                        setGroupFormValues(next);
                      }}
                    />
                    {groupFormValues.length > 1 && (
                      <button className="erp-btn erp-btn--ghost erp-btn--sm" style={{ color: "var(--erp-danger)" }}
                        onClick={() => setGroupFormValues(groupFormValues.filter((_, j) => j !== i))}>✕</button>
                    )}
                  </div>
                ))}
                <button className="erp-btn erp-btn--ghost erp-btn--sm" style={{ marginTop: 4 }}
                  onClick={() => setGroupFormValues([...groupFormValues, { tempId: crypto.randomUUID(), name: "" }])}>
                  + {copy.purchasing.addValue}
                </button>
              </div>
              {editGroupId && (
                <div className="erp-input-group">
                  <label className="erp-label" style={{ marginBottom: 8 }}>{copy.purchasing.appliedTo}</label>
                  {editAppliedProductIds.length === 0 && (
                    <p style={{ fontSize: 13, color: "var(--erp-muted)", marginBottom: 6 }}>—</p>
                  )}
                  {editAppliedProductIds.map((pid) => {
                    const p = rawMaterials.find((r) => r.id === pid);
                    return p ? (
                      <div key={pid} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ flex: 1, fontSize: 13 }}>{p.name}</span>
                        <button
                          className="erp-btn erp-btn--ghost erp-btn--sm"
                          style={{ color: "var(--erp-danger)" }}
                          onClick={() => setEditAppliedProductIds(editAppliedProductIds.filter((id) => id !== pid))}
                        >{copy.purchasing.removeFromProduct}</button>
                      </div>
                    ) : null;
                  })}
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    <select
                      className="erp-select"
                      value={editAddProductId}
                      onChange={(e) => setEditAddProductId(e.target.value)}
                      style={{ flex: 1 }}
                    >
                      <option value="">— {copy.purchasing.applyToProduct} —</option>
                      {rawMaterials
                        .filter((p) => {
                          if (editAppliedProductIds.includes(p.id)) return false;
                          const assignedGroup = rawMaterialGroupMap.get(p.id);
                          return !assignedGroup || assignedGroup === editGroupId;
                        })
                        .map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    <button
                      className="erp-btn erp-btn--ghost erp-btn--sm"
                      disabled={!editAddProductId}
                      onClick={() => {
                        if (!editAddProductId) return;
                        setEditAppliedProductIds([...editAppliedProductIds, editAddProductId]);
                        setEditAddProductId("");
                      }}
                    >+ {copy.purchasing.applyPreset}</button>
                  </div>
                </div>
              )}
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowGroupForm(false)}>{copy.common.cancel}</button>
              <button className="erp-btn erp-btn--primary" onClick={handleSaveGroup} disabled={saving || !groupName.trim()}>
                {saving ? copy.common.loading : copy.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apply Preset Dialog */}
      {applyGroupTarget && (
        <div className="erp-overlay" onClick={() => setApplyGroupTarget(null)}>
          <div className="erp-dialog erp-dialog--sm" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.purchasing.applyToProduct}: {applyGroupTarget.name}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setApplyGroupTarget(null)}>{copy.common.close}</button>
            </div>
            <div className="erp-dialog-body">
              <div className="erp-input-group">
                <label className="erp-label">{copy.purchasing.rawMaterials}</label>
                <select className="erp-select" value={applyProductId} onChange={(e) => setApplyProductId(e.target.value)}>
                  <option value="">—</option>
                  {rawMaterials.filter((p) => {
                    const assignedGroup = rawMaterialGroupMap.get(p.id);
                    // Allow if unassigned or already belongs to this same group
                    return !assignedGroup || assignedGroup === applyGroupTarget?.id;
                  }).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setApplyGroupTarget(null)}>{copy.common.cancel}</button>
              <button className="erp-btn erp-btn--primary" onClick={handleApplyPreset} disabled={saving || !applyProductId}>
                {saving ? copy.common.loading : copy.purchasing.applyPreset}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group CSV Import Preview */}
      {groupImportPreview && (
        <div className="erp-overlay" onClick={() => setGroupImportPreview(null)}>
          <div className="erp-dialog erp-dialog--wide" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.purchasing.groupImportPreviewTitle}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setGroupImportPreview(null)}>{copy.common.close}</button>
            </div>
            <div className="erp-dialog-body">
              <p style={{ fontSize: 13, color: "var(--erp-ink-secondary)", marginBottom: 12 }}>{copy.purchasing.groupImportPreviewHint}</p>
              <div className="erp-table-wrap">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>{copy.purchasing.variantGroupName}</th>
                      <th>{copy.purchasing.groupValues}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupImportPreview.map((row, i) => (
                      <tr key={i} style={{ opacity: row.isDuplicate ? 0.5 : 1 }}>
                        <td><strong>{row.presetName}</strong></td>
                        <td>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {row.values.map((v, vi) => (
                              <span
                                key={vi}
                                className={`erp-badge ${row.clashingValues.includes(v) ? "erp-badge--danger" : "erp-badge--info"}`}
                                style={{ fontSize: 11 }}
                                title={row.clashingValues.includes(v) ? copy.purchasing.groupImportClash : undefined}
                              >
                                {v}{row.clashingValues.includes(v) ? " ✕" : ""}
                              </span>
                            ))}
                            {row.values.length === 0 && <span style={{ color: "var(--erp-muted)", fontSize: 12 }}>—</span>}
                          </div>
                        </td>
                        <td>
                          {row.isDuplicate && (
                            <span className="erp-badge erp-badge--danger" style={{ fontSize: 11 }}>
                              {copy.purchasing.rawImportDuplicate}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setGroupImportPreview(null)}>{copy.common.cancel}</button>
              <button
                className="erp-btn erp-btn--primary"
                onClick={handleConfirmGroupImport}
                disabled={groupImportSaving || groupImportPreview.every((r) => r.isDuplicate)}
              >
                {groupImportSaving ? copy.common.loading : copy.purchasing.groupImportConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Bulk Delete Confirm */}
      {showGroupBulkConfirm && (
        <div className="erp-overlay" onClick={() => setShowGroupBulkConfirm(false)}>
          <div className="erp-dialog erp-dialog--sm" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.purchasing.groupBulkDelete}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowGroupBulkConfirm(false)}>{copy.common.close}</button>
            </div>
            <div className="erp-dialog-body">
              <p>{copy.purchasing.groupBulkDeleteConfirm}</p>
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowGroupBulkConfirm(false)}>{copy.common.cancel}</button>
              <button className="erp-btn erp-btn--danger" onClick={handleBulkDeleteGroups} disabled={groupBulkDeleting}>
                {groupBulkDeleting ? copy.common.loading : copy.common.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goods Receiving Form */}
      {showReceivingForm && (() => {
        const grandTotal = recItems.reduce((sum, item) => {
          if (item.useVariants) {
            return sum + item.variantRows.reduce((s, vr) => s + (parseFloat(vr.costPerUnit) || 0), 0);
          }
          return sum + (parseFloat(item.costPerUnit) || 0);
        }, 0);
        return (
        <div className="erp-overlay" onClick={() => setShowReceivingForm(false)}>
          <div className="erp-dialog erp-dialog--lg" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{editReceivingId ? copy.purchasing.editReceiving : copy.purchasing.addReceiving}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowReceivingForm(false)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              {/* Vendor + Notes */}
              <div className="erp-rec-form-section">
                <div className="erp-input-group">
                  <label className="erp-label">{copy.purchasing.vendor} *</label>
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
                  <input className="erp-input" value={recNotes} onChange={(e) => setRecNotes(e.target.value)} placeholder="—" />
                </div>
              </div>

              {/* Items */}
              <div className="erp-rec-items-header">
                <span>{copy.purchasing.items}</span>
                <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={addRecItem}>
                  + {copy.purchasing.addItem}
                </button>
              </div>

              {recItems.map((item, idx) => {
                const itemVariants = item.productId ? getProductVariants(item.productId) : [];
                const rowFiltered = item.categoryId
                  ? rawMaterials.filter((p) => p.category_id === item.categoryId)
                  : rawMaterials;
                return (
                  <div key={idx} className="erp-rec-item-card">
                    {/* Single row: Category | Raw Material | Qty | Total | Preset | Remove */}
                    <div className="erp-rec-item-row">
                      {/* Category filter */}
                      <div className="erp-rec-col erp-rec-col--cat">
                        <div className="erp-rec-item-label">{copy.products.category}</div>
                        <select
                          className="erp-select"
                          value={item.categoryId}
                          onChange={(e) => {
                            const next = [...recItems];
                            next[idx] = { ...next[idx], categoryId: e.target.value, itemSearch: "", productId: "", variantId: "", useVariants: false, variantRows: [], qty: "", costPerUnit: "", unit: "" };
                            setRecItems(next);
                            setInlineApplyIdx(-1);
                            setInlineApplyGroupId("");
                          }}
                        >
                          <option value="">—</option>
                          {rawCategories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Raw Material dropdown */}
                      <div className="erp-rec-col erp-rec-col--product">
                        <div className="erp-rec-item-label">{copy.purchasing.rawMaterials}</div>
                        <select
                          className="erp-select"
                          value={item.productId}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "__NEW__") {
                              setPendingRawItemIdx(idx);
                              setEditRawId(null);
                              setRawName("");
                              setRawCategory(item.categoryId);
                              setRawDescription("");
                              setRawActive(true);
                              setRawUnit("pcs");
                              setShowRawForm(true);
                            } else {
                              updateRecItem(idx, "productId", val);
                            }
                          }}
                        >
                          <option value="">—</option>
                          {rowFiltered.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                          <option value="__NEW__">{copy.purchasing.newRawMaterialOption}</option>
                        </select>
                      </div>

                      {/* Qty */}
                      {!item.useVariants ? (
                        <div className="erp-rec-col erp-rec-col--qty">
                          <div className="erp-rec-item-label">{copy.products.qty}</div>
                          <div className="erp-rec-item-qty-group">
                            <input className="erp-input" type="text" inputMode="decimal" placeholder="0" value={item.qty} onChange={(e) => updateRecItem(idx, "qty", e.target.value)} />
                            {item.unit && getConvertibleUnitTarget(item.unit) ? (
                              <button
                                type="button"
                                className="erp-unit-toggle"
                                onClick={() => toggleRecItemUnit(idx)}
                                title={copy.products.unit}
                              >
                                ⇄ {item.unit}
                              </button>
                            ) : (
                              <span className="erp-bom-unit-label">{item.unit || "—"}</span>
                            )}
                          </div>
                        </div>
                      ) : <div className="erp-rec-col erp-rec-col--qty" />}

                      {/* Total */}
                      {!item.useVariants ? (
                        <div className="erp-rec-col erp-rec-col--total">
                          <div className="erp-rec-item-label">{copy.purchasing.totalAmount}</div>
                          <input className="erp-input" type="text" inputMode="numeric" placeholder="Rp 0" value={fmtNum(item.costPerUnit)} onChange={(e) => updateRecItem(idx, "costPerUnit", e.target.value)} />
                        </div>
                      ) : <div className="erp-rec-col erp-rec-col--total" />}

                      {/* Preset — only when product selected, has an assigned preset group, and no preset applied yet */}
                      <div className="erp-rec-col erp-rec-col--preset">
                        {item.productId && state.variantGroups.length > 0 && !item.useVariants ? (() => {
                          const assignedGroupId = rawMaterialGroupMap.get(item.productId);
                          // Only show the assigned group; hide entirely if none assigned
                          const availableGroups = assignedGroupId
                            ? state.variantGroups.filter((g) => g.id === assignedGroupId)
                            : [];
                          return availableGroups.length > 0 ? (
                            <>
                              <div className="erp-rec-item-label">{copy.purchasing.applyPresetInline}</div>
                              <select
                                className="erp-select"
                                value={inlineApplyIdx === idx ? inlineApplyGroupId : ""}
                                disabled={saving}
                                onChange={(e) => {
                                  const gid = e.target.value;
                                  if (!gid) return;
                                  setInlineApplyIdx(idx);
                                  setInlineApplyGroupId(gid);
                                  handleInlineApplyPreset(idx, gid, item.productId);
                                }}
                              >
                                <option value="">—</option>
                                {availableGroups.map((g) => (
                                  <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                              </select>
                            </>
                          ) : <div />;
                        })() : <div />}
                      </div>

                      {/* Remove */}
                      <div className="erp-rec-col erp-rec-col--remove">
                        <div className="erp-rec-item-label" style={{ visibility: "hidden" }}>x</div>
                        <button
                          className="erp-btn erp-btn--ghost erp-btn--sm"
                          onClick={() => removeRecItem(idx)}
                          style={{ color: "var(--erp-danger)" }}
                          title={copy.common.delete}
                        >✕</button>
                      </div>
                    </div>


                    {/* Variant sub-rows */}
                    {item.useVariants && item.variantRows.map((vr, vi) => (
                      <div key={vr.variantId} className="erp-rec-variant-row">
                        <div className="erp-rec-variant-name">↳ {vr.variantName}</div>
                        <div>
                          <div className="erp-rec-item-label">{copy.products.qty}</div>
                          <div className="erp-rec-item-qty-group">
                            <input className="erp-input" type="text" inputMode="decimal" placeholder="0" value={vr.qty} onChange={(e) => updateVariantRow(idx, vi, "qty", e.target.value)} />
                            {item.unit && getConvertibleUnitTarget(item.unit) ? (
                              <button
                                type="button"
                                className="erp-unit-toggle"
                                onClick={() => toggleRecItemUnit(idx)}
                                title={copy.products.unit}
                              >
                                ⇄ {item.unit}
                              </button>
                            ) : (
                              <span className="erp-bom-unit-label">{item.unit || "—"}</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="erp-rec-item-label">{copy.purchasing.totalAmount}</div>
                          <input className="erp-input" type="text" inputMode="numeric" placeholder="Rp 0" value={fmtNum(vr.costPerUnit)} onChange={(e) => updateVariantRow(idx, vi, "costPerUnit", e.target.value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* Grand Total */}
              {recItems.some((i) => i.productId) && (
                <div className="erp-rec-total-row">
                  <span>{copy.purchasing.totalCost}</span>
                  <span className="erp-rec-total-amount">{formatRupiah(grandTotal)}</span>
                </div>
              )}
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
        );
      })()}

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
              <div className="erp-input-group">
                <label className="erp-label">{copy.purchasing.variants}</label>
                <select
                  className="erp-select"
                  value={rawPresetGroupId}
                  onChange={(e) => {
                    if (e.target.value === "__NEW__") {
                      setEditGroupId(null);
                      setGroupName("");
                      setGroupFormValues([{ tempId: crypto.randomUUID(), name: "" }]);
                      setShowGroupForm(true);
                    } else {
                      setRawPresetGroupId(e.target.value);
                    }
                  }}
                >
                  <option value="">— {copy.purchasing.noGroups.replace("yet", "").trim()} —</option>
                  {state.variantGroups
                    .filter((g) => {
                      const assigned = rawMaterialGroupMap.get(editRawId || "");
                      return !assigned || assigned === g.id || rawPresetGroupId === g.id;
                    })
                    .map((g) => {
                      const vals = getGroupValues(g.id);
                      return (
                        <option key={g.id} value={g.id}>
                          {g.name}{vals.length > 0 ? ` (${vals.map((v) => v.name).join(", ")})` : ""}
                        </option>
                      );
                    })}
                  <option value="__NEW__">{copy.purchasing.addVariantGroup}</option>
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
              <button className="erp-btn erp-btn--primary" onClick={() => handleSaveRaw()} disabled={saving || !rawName}>
                {saving ? copy.common.loading : copy.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raw Material pre-save warning */}
      {showRawWarning && (
        <div className="erp-overlay" onClick={() => setShowRawWarning(false)}>
          <div className="erp-dialog erp-dialog--sm" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.purchasing.warnRawTitle}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowRawWarning(false)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                <li style={{ marginBottom: "0.5rem" }}>{copy.purchasing.warnRawNoCategory}</li>
              </ul>
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowRawWarning(false)}>
                {copy.common.cancel}
              </button>
              <button
                className="erp-btn erp-btn--primary"
                onClick={() => { setShowRawWarning(false); handleSaveRaw(true); }}
              >
                {copy.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Bulk Delete Confirm */}
      {showVendorBulkConfirm && (
        <div className="erp-overlay" onClick={() => setShowVendorBulkConfirm(false)}>
          <div className="erp-dialog erp-dialog--sm" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.purchasing.bulkDelete}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowVendorBulkConfirm(false)}>{copy.common.close}</button>
            </div>
            <div className="erp-dialog-body">
              <p>{copy.purchasing.bulkDeleteConfirm}</p>
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowVendorBulkConfirm(false)}>{copy.common.cancel}</button>
              <button className="erp-btn erp-btn--danger" onClick={handleVendorBulkDelete} disabled={vendorBulkDeleting}>
                {vendorBulkDeleting ? copy.common.loading : copy.common.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor CSV Import Preview */}
      {vendorImportPreview && (
        <div className="erp-overlay" onClick={() => setVendorImportPreview(null)}>
          <div className="erp-dialog erp-dialog--wide" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.purchasing.importPreviewTitle}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setVendorImportPreview(null)}>{copy.common.close}</button>
            </div>
            <div className="erp-dialog-body">
              <p style={{ fontSize: 13, color: "var(--erp-ink-secondary)", marginBottom: 12 }}>{copy.purchasing.importPreviewHint}</p>
              <div className="erp-table-wrap">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>{copy.purchasing.vendorName}</th>
                      <th>{copy.purchasing.phone}</th>
                      <th>{copy.purchasing.address}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorImportPreview.map((row, i) => (
                      <tr key={i} style={{ opacity: row.isDuplicate ? 0.5 : 1 }}>
                        <td><strong>{row.name}</strong></td>
                        <td>{row.phone || "—"}</td>
                        <td>{row.address || "—"}</td>
                        <td>
                          {row.isDuplicate && (
                            <span className="erp-badge erp-badge--danger" style={{ fontSize: 11 }}>
                              {copy.purchasing.importDuplicate}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setVendorImportPreview(null)}>{copy.common.cancel}</button>
              <button
                className="erp-btn erp-btn--primary"
                onClick={handleConfirmVendorImport}
                disabled={vendorImportSaving || vendorImportPreview.every((r) => r.isDuplicate)}
              >
                {vendorImportSaving ? copy.common.loading : copy.purchasing.importConfirm}
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
                  onClick={() => handleDeleteRawCat(editRawCatId!)}
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

      {/* Category Bulk Delete Confirm */}
      {showCatBulkConfirm && (() => {
        const bulkRawCount = rawMaterials.filter((p) => p.category_id && selectedCatIds.has(p.category_id)).length;
        return (
          <div className="erp-overlay" onClick={() => setShowCatBulkConfirm(false)}>
            <div className="erp-dialog erp-dialog--sm" onClick={(e) => e.stopPropagation()}>
              <div className="erp-dialog-header">
                <h3>{copy.purchasing.bulkDelete}</h3>
                <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowCatBulkConfirm(false)}>{copy.common.close}</button>
              </div>
              <div className="erp-dialog-body">
                <p style={{ fontSize: 13, color: "var(--erp-ink-secondary)", marginBottom: 12 }}>
                  {bulkRawCount > 0
                    ? `${bulkRawCount} ${copy.purchasing.deleteCategoryRawCount}`
                    : copy.purchasing.catBulkDeleteConfirm}
                </p>
              </div>
              <div className="erp-dialog-footer" style={{ flexDirection: "column", gap: 8 }}>
                {bulkRawCount > 0 ? (
                  <>
                    <button className="erp-btn erp-btn--danger" style={{ width: "100%" }} onClick={() => handleCatBulkDelete(true)} disabled={catBulkDeleting}>
                      {catBulkDeleting ? copy.common.loading : copy.purchasing.deleteCategoryWithRaws}
                    </button>
                    <button className="erp-btn erp-btn--danger" style={{ width: "100%" }} onClick={() => handleCatBulkDelete(false)} disabled={catBulkDeleting}>
                      {catBulkDeleting ? copy.common.loading : copy.purchasing.deleteCategoryKeepRaws}
                    </button>
                  </>
                ) : (
                  <button className="erp-btn erp-btn--danger" style={{ width: "100%" }} onClick={() => handleCatBulkDelete(false)} disabled={catBulkDeleting}>
                    {catBulkDeleting ? copy.common.loading : copy.common.delete}
                  </button>
                )}
                <button className="erp-btn erp-btn--secondary" style={{ width: "100%" }} onClick={() => setShowCatBulkConfirm(false)}>{copy.common.cancel}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Category CSV Import Preview */}
      {catImportPreview && (
        <div className="erp-overlay" onClick={() => setCatImportPreview(null)}>
          <div className="erp-dialog erp-dialog--wide" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.purchasing.importPreviewTitle}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setCatImportPreview(null)}>{copy.common.close}</button>
            </div>
            <div className="erp-dialog-body">
              <p style={{ fontSize: 13, color: "var(--erp-ink-secondary)", marginBottom: 12 }}>{copy.purchasing.catImportPreviewHint}</p>
              <div className="erp-table-wrap">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>{copy.products.categoryName}</th>
                      <th>{copy.products.sortOrder}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {catImportPreview.map((row, i) => (
                      <tr key={i} style={{ opacity: row.isDuplicate ? 0.5 : 1 }}>
                        <td><strong>{row.name}</strong></td>
                        <td>{row.sort_order}</td>
                        <td>
                          {row.isDuplicate && (
                            <span className="erp-badge erp-badge--danger" style={{ fontSize: 11 }}>
                              {copy.purchasing.importDuplicate}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setCatImportPreview(null)}>{copy.common.cancel}</button>
              <button
                className="erp-btn erp-btn--primary"
                onClick={handleConfirmCatImport}
                disabled={catImportSaving || catImportPreview.every((r) => r.isDuplicate)}
              >
                {catImportSaving ? copy.common.loading : copy.purchasing.importConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raw Material Bulk Delete Confirm */}
      {showRawBulkConfirm && (
        <div className="erp-overlay" onClick={() => setShowRawBulkConfirm(false)}>
          <div className="erp-dialog erp-dialog--sm" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.purchasing.rawBulkDelete}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowRawBulkConfirm(false)}>{copy.common.close}</button>
            </div>
            <div className="erp-dialog-body">
              <p>{copy.purchasing.rawBulkDeleteConfirm}</p>
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowRawBulkConfirm(false)}>{copy.common.cancel}</button>
              <button className="erp-btn erp-btn--danger" onClick={handleRawBulkDelete} disabled={rawBulkDeleting}>
                {rawBulkDeleting ? copy.common.loading : copy.common.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raw Material CSV Import Preview */}
      {rawImportPreview && (
        <div className="erp-overlay" onClick={() => setRawImportPreview(null)}>
          <div className="erp-dialog erp-dialog--wide" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.purchasing.rawImportPreviewTitle}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setRawImportPreview(null)}>{copy.common.close}</button>
            </div>
            <div className="erp-dialog-body">
              <p style={{ fontSize: 13, color: "var(--erp-ink-secondary)", marginBottom: 12 }}>{copy.purchasing.rawImportPreviewHint}</p>
              <div className="erp-table-wrap">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>{copy.products.name}</th>
                      <th>{copy.products.category}</th>
                      <th>{copy.products.unit}</th>
                      <th>{copy.products.description}</th>
                      <th>{copy.purchasing.variants}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawImportPreview.map((row, i) => (
                      <tr key={i} style={{ opacity: row.isDuplicate ? 0.5 : 1 }}>
                        <td><strong>{row.name}</strong></td>
                        <td>
                          {row.category || "—"}
                          {row.isNewCategory && !row.isDuplicate && (
                            <span className="erp-badge erp-badge--warning" style={{ fontSize: 11, marginLeft: 4 }}>
                              {copy.purchasing.rawImportNewCategory}
                            </span>
                          )}
                        </td>
                        <td>{row.unit}</td>
                        <td>{row.description || "—"}</td>
                        <td>
                          {row.presetVariant ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                              <span style={{ fontSize: 12 }}>{row.presetVariant}</span>
                              {row.isNewPreset && !row.isDuplicate && (
                                <span className="erp-badge erp-badge--warning" style={{ fontSize: 11 }}>
                                  {copy.purchasing.rawImportNewCategory}
                                </span>
                              )}
                              {row.presetValues.map((v, vi) => (
                                <span key={vi} className="erp-badge erp-badge--info" style={{ fontSize: 11 }}>{v}</span>
                              ))}
                            </div>
                          ) : "—"}
                        </td>
                        <td>
                          {row.isDuplicate && (
                            <span className="erp-badge erp-badge--danger" style={{ fontSize: 11 }}>
                              {copy.purchasing.rawImportDuplicate}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setRawImportPreview(null)}>{copy.common.cancel}</button>
              <button
                className="erp-btn erp-btn--primary"
                onClick={handleConfirmRawImport}
                disabled={rawImportSaving || rawImportPreview.every((r) => r.isDuplicate)}
              >
                {rawImportSaving ? copy.common.loading : copy.purchasing.rawImportConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Options Dialog */}
      {deleteCatTarget && (
        <div className="erp-overlay" onClick={() => setDeleteCatTarget(null)}>
          <div className="erp-dialog erp-dialog--sm" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.purchasing.deleteCategoryTitle}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setDeleteCatTarget(null)}>{copy.common.close}</button>
            </div>
            <div className="erp-dialog-body">
              <p style={{ fontSize: 13, color: "var(--erp-ink-secondary)", marginBottom: 12 }}>
                {deleteCatTarget.rawMaterialCount > 0
                  ? `${deleteCatTarget.rawMaterialCount} ${copy.purchasing.deleteCategoryRawCount}`
                  : copy.common.deleteWarning}
              </p>
            </div>
            <div className="erp-dialog-footer" style={{ flexDirection: "column", gap: 8 }}>
              {deleteCatTarget.rawMaterialCount > 0 ? (
                <>
                  <button className="erp-btn erp-btn--danger" style={{ width: "100%" }} onClick={handleConfirmDeleteCatWithRaws}>
                    {copy.purchasing.deleteCategoryWithRaws}
                  </button>
                  <button className="erp-btn erp-btn--danger" style={{ width: "100%" }} onClick={handleConfirmDeleteCatKeepRaws}>
                    {copy.purchasing.deleteCategoryKeepRaws}
                  </button>
                </>
              ) : (
                <button className="erp-btn erp-btn--danger" style={{ width: "100%" }} onClick={handleConfirmDeleteCatKeepRaws}>
                  {copy.common.delete}
                </button>
              )}
              <button className="erp-btn erp-btn--secondary" style={{ width: "100%" }} onClick={() => setDeleteCatTarget(null)}>
                {copy.common.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
