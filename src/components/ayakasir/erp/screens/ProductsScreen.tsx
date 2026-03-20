"use client";

import { useMemo, useState, useRef } from "react";
import { useErp } from "../store";
import { getErpCopy } from "../i18n";
import { usePlanLimits } from "../usePlanLimits";
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
  component_variant_id: string;
  required_qty: string;
  unit: InventoryUnit;
}

type Tab = "products" | "variants" | "categories";

// ── CSV helpers ──────────────────────────────────────────────────────────────

function parseProdCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          cur += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        cur += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ",") {
        fields.push(cur);
        cur = "";
        i++;
      } else {
        cur += ch;
        i++;
      }
    }
  }
  fields.push(cur);
  return fields;
}

interface ProdCsvRow {
  name: string;
  category: string;
  price: number;
  description: string;
  active: boolean;
  isDuplicate: boolean;
  isNewCategory: boolean;
  // variants: "Name:PriceAdj|Name2:PriceAdj2" raw string for display
  variantsRaw: string;
  // bom_materials: "RawName:Qty:Unit|..." raw string for display
  bomRaw: string;
  parsedVariants: { name: string; priceAdj: number }[];
  parsedBom: { rawName: string; qty: number; unit: string; isMissing: boolean; isUnitMismatch: boolean }[];
  hasMissingRaw: boolean;
  hasUnitMismatch: boolean;
}

// ── Unit normalization ───────────────────────────────────────────────────────

function normalizeToBaseUnit(qty: number, fromUnit: string, toUnit: string): number | null {
  if (fromUnit === toUnit) return qty;
  if (fromUnit === "kg" && toUnit === "g") return qty * 1000;
  if (fromUnit === "g" && toUnit === "kg") return qty / 1000;
  if (fromUnit === "L" && toUnit === "mL") return qty * 1000;
  if (fromUnit === "mL" && toUnit === "L") return qty / 1000;
  return null;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ProductsScreen() {
  const { state, dispatch, supabase, tenantId, locale } = useErp();
  const copy = getErpCopy(locale);
  const isOwner = state.user?.role === "OWNER";
  const planLimits = usePlanLimits();

  const [tab, setTab] = useState<Tab>("products");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);

  // Pagination
  const [prodPage, setProdPage] = useState(0);
  const [prodPageSize, setProdPageSize] = useState(10);

  // Bulk delete
  const [selectedProdIds, setSelectedProdIds] = useState<Set<string>>(new Set());
  const [showProdBulkConfirm, setShowProdBulkConfirm] = useState(false);

  // CSV import
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvRows, setCsvRows] = useState<ProdCsvRow[]>([]);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importMsg, setImportMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [importing, setImporting] = useState(false);

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

  // Warning dialog state
  const [productWarnings, setProductWarnings] = useState<string[]>([]);
  const [showProductWarning, setShowProductWarning] = useState(false);

  // Category form state
  const [catName, setCatName] = useState("");
  const [catOrder, setCatOrder] = useState("0");
  const [catFromProductForm, setCatFromProductForm] = useState(false);

  // (Variant name form state removed — presets managed in Purchasing)

  // ── Derived data ────────────────────────────────────────────────────────────

  const filteredProducts = useMemo(() => {
    let list = state.products.filter((p) => p.product_type === "MENU_ITEM");
    if (filterCategory) {
      list = list.filter((p) => p.category_id === filterCategory);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    const catMap = new Map(state.categories.map((c) => [c.id, c]));
    return [...list].sort((a, b) => {
      const catA = a.category_id ? catMap.get(a.category_id) : undefined;
      const catB = b.category_id ? catMap.get(b.category_id) : undefined;
      const nameA = (catA?.name ?? "\uFFFF").toLowerCase();
      const nameB = (catB?.name ?? "\uFFFF").toLowerCase();
      const cmp = nameA.localeCompare(nameB);
      if (cmp !== 0) return cmp;
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  }, [state.products, state.categories, filterCategory, search]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / prodPageSize));
  const safePage = Math.min(prodPage, totalPages - 1);
  const pagedProducts = filteredProducts.slice(safePage * prodPageSize, safePage * prodPageSize + prodPageSize);

  const categories = useMemo(
    () =>
      state.categories
        .filter((c) => c.category_type === "MENU")
        .sort((a, b) => {
          if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        }),
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

  // Unique variant names: union of DB variants + variant group values, alphabetically sorted
  const uniqueVariantNames = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const v of state.variants) {
      const key = v.name.toLowerCase();
      if (!seen.has(key)) { seen.add(key); names.push(v.name); }
    }
    for (const gv of state.variantGroupValues) {
      const key = gv.name.toLowerCase();
      if (!seen.has(key)) { seen.add(key); names.push(gv.name); }
    }
    return names.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }, [state.variants, state.variantGroupValues]);

  const getInventoryUnit = (productId: string): InventoryUnit => {
    const inv = state.inventory.find((i) => i.product_id === productId && i.variant_id === "");
    return inv?.unit || "pcs";
  };

  const getCompatibleUnits = (baseUnit: InventoryUnit): InventoryUnit[] => {
    if (baseUnit === "g" || baseUnit === "kg") return ["g", "kg"];
    if (baseUnit === "mL" || baseUnit === "L") return ["mL", "L"];
    return [baseUnit];
  };

  // Get variants for a raw material (used in variant-aware BOM)
  const getRawMaterialVariants = (productId: string) =>
    state.variants.filter((v) => v.product_id === productId);

  // Determine which variant group is applied to the current product's variants
  const productPresetGroupId = useMemo(() => {
    if (formVariants.length === 0) return null;
    const variantNames = formVariants.map((v) => v.name.trim().toLowerCase()).filter(Boolean);
    if (variantNames.length === 0) return null;
    for (const g of state.variantGroups) {
      const groupValues = state.variantGroupValues
        .filter((gv) => gv.group_id === g.id)
        .map((gv) => gv.name.toLowerCase());
      if (groupValues.length > 0 && variantNames.every((n) => groupValues.includes(n))) return g.id;
    }
    return null;
  }, [formVariants, state.variantGroups, state.variantGroupValues]);

  // Check if a raw material has variants matching the current product's preset group
  const rawHasMatchingVariants = (productId: string) => {
    if (!productPresetGroupId) return false;
    const rmVariants = getRawMaterialVariants(productId);
    if (rmVariants.length === 0) return false;
    const groupValues = state.variantGroupValues
      .filter((gv) => gv.group_id === productPresetGroupId)
      .map((gv) => gv.name.toLowerCase());
    return rmVariants.some((v) => groupValues.includes(v.name.toLowerCase()));
  };

  // Apply preset: populate formVariants from a variant group
  const handleApplyPreset = (groupId: string) => {
    const values = state.variantGroupValues
      .filter((gv) => gv.group_id === groupId)
      .sort((a, b) => a.sort_order - b.sort_order);
    const newVariants: FormVariant[] = values.map((gv) => {
      // Preserve existing price_adjustment if variant with same name exists
      const existing = formVariants.find((fv) => fv.name.trim().toLowerCase() === gv.name.toLowerCase());
      return { id: existing?.id ?? null, name: gv.name, price_adjustment: existing?.price_adjustment ?? "0" };
    });
    setFormVariants(newVariants);
  };

  // ── Reset helpers ───────────────────────────────────────────────────────────

  const resetPageAndSelection = () => {
    setProdPage(0);
    setSelectedProdIds(new Set());
  };

  // ── Product form ────────────────────────────────────────────────────────────

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
        component_variant_id: c.component_variant_id || "",
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
    setFormComponents((prev) => [...prev, { id: null, component_product_id: "", component_variant_id: "", required_qty: "1", unit: "pcs" }]);

  const removeComponent = (idx: number) =>
    setFormComponents((prev) => prev.filter((_, i) => i !== idx));

  const updateComponent = (idx: number, field: keyof FormComponent, value: string) => {
    setFormComponents((prev) =>
      prev.map((c, i) => {
        if (i !== idx) return c;
        const updated = { ...c, [field]: value };
        if (field === "component_product_id") {
          updated.unit = value ? getInventoryUnit(value) : "pcs";
          updated.component_variant_id = "";
        }
        return updated;
      })
    );
  };

  const handleSaveProduct = async (skipWarnings = false) => {
    // Plan limit check (new products only)
    if (!editId && !planLimits.canAddProduct) {
      alert(copy.plan.limitReached);
      return;
    }
    // Req 7: duplicate name check (case-insensitive) against MENU_ITEM products, excluding current editId
    const nameLower = formName.trim().toLowerCase();
    const duplicate = state.products.find(
      (p) =>
        p.product_type === "MENU_ITEM" &&
        p.name.toLowerCase() === nameLower &&
        p.id !== editId
    );
    if (duplicate) {
      alert(copy.products.duplicateProduct);
      return;
    }

    // Block saving if any two variants in the form share the same name (case-insensitive)
    const variantNamesLower = formVariants.map((v) => v.name.trim().toLowerCase()).filter(Boolean);
    if (new Set(variantNamesLower).size !== variantNamesLower.length) {
      alert(copy.products.duplicateVariantName);
      return;
    }

    if (!editId && !skipWarnings) {
      const warnings: string[] = [];
      if (!formCategory) warnings.push(copy.products.warnNoCategory);
      if (formComponents.length === 0) warnings.push(copy.products.warnNoBom);
      if (warnings.length > 0) {
        setProductWarnings(warnings);
        setShowProductWarning(true);
        return;
      }
    }
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

      // Req 8 & 9: Save BOM components with unit normalization
      const validComponents: typeof formComponents = [];
      for (const c of formComponents) {
        if (!c.component_product_id || !(parseFloat(c.required_qty) > 0)) continue;
        const baseUnit = getInventoryUnit(c.component_product_id);
        const normalized = normalizeToBaseUnit(parseFloat(c.required_qty), c.unit, baseUnit);
        if (normalized === null) {
          // Incompatible units — skip with warning
          alert(`Unit mismatch: cannot convert "${c.unit}" to "${baseUnit}" for raw material. Row skipped.`);
          continue;
        }
        validComponents.push({ ...c, required_qty: String(normalized), unit: baseUnit });
      }

      const savedComponents = await repo.setProductComponents(
        supabase,
        productId,
        validComponents.map((c, idx) => ({
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          parent_product_id: productId!,
          component_product_id: c.component_product_id,
          component_variant_id: c.component_variant_id || "",
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

  // ── Bulk delete ─────────────────────────────────────────────────────────────

  const handleBulkDelete = async () => {
    try {
      for (const id of selectedProdIds) {
        await repo.deleteProduct(supabase, id);
        dispatch({ type: "DELETE", table: "products", id });
      }
    } catch (err) {
      console.error("Bulk delete failed:", err);
    }
    setSelectedProdIds(new Set());
    setShowProdBulkConfirm(false);
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedProdIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isAllPageSelected = pagedProducts.length > 0 && pagedProducts.every((p) => selectedProdIds.has(p.id));

  const toggleSelectAll = () => {
    if (isAllPageSelected) {
      setSelectedProdIds((prev) => {
        const next = new Set(prev);
        pagedProducts.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedProdIds((prev) => {
        const next = new Set(prev);
        pagedProducts.forEach((p) => next.add(p.id));
        return next;
      });
    }
  };

  // ── Clone ───────────────────────────────────────────────────────────────────

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

  // ── CSV template download ───────────────────────────────────────────────────

  const handleDownloadTemplate = () => {
    const BOM = "\uFEFF";
    const header = "name,category,price,description,active,variants,bom_materials";
    // variants format: "VariantName:PriceAdjustment|VariantName2:PriceAdjustment2"  (leave empty if none)
    // bom_materials format: "RawMaterialName:Qty:Unit|RawMaterialName2:Qty2:Unit2"  (leave empty if none)
    const example = `"Fried Chicken","Food","15000","Crispy fried chicken","true","Small:0|Large:5000","Chicken:200:g|Cooking Oil:10:mL"`;
    const csv = BOM + header + "\n" + example;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ayakasir_products_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── CSV parse & preview ─────────────────────────────────────────────────────

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) || "";
      // Strip UTF-8 BOM if present
      const stripped = text.startsWith("\uFEFF") ? text.slice(1) : text;
      const lines = stripped.split(/\r?\n/).filter((l) => l.trim() !== "");
      if (lines.length < 2) return;

      const headerFields = parseProdCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
      const colName = headerFields.indexOf("name");
      const colCategory = headerFields.indexOf("category");
      const colPrice = headerFields.indexOf("price");
      const colDescription = headerFields.indexOf("description");
      const colActive = headerFields.indexOf("active");
      const colVariants = headerFields.indexOf("variants");
      const colBom = headerFields.indexOf("bom_materials");

      if (colName === -1) return;

      // Build case-insensitive map of existing MENU categories
      const catByNameLower = new Map<string, string>();
      for (const c of state.categories) {
        if (c.category_type === "MENU") {
          catByNameLower.set(c.name.toLowerCase(), c.id);
        }
      }

      // Existing product names (MENU_ITEM) for duplicate detection
      const existingNames = new Set(
        state.products
          .filter((p) => p.product_type === "MENU_ITEM")
          .map((p) => p.name.toLowerCase())
      );

      const batchNames = new Set<string>();
      const rows: ProdCsvRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const fields = parseProdCsvLine(lines[i]);
        const name = (fields[colName] ?? "").trim();
        if (!name) continue;

        const category = colCategory >= 0 ? (fields[colCategory] ?? "").trim() : "";
        const priceRaw = colPrice >= 0 ? (fields[colPrice] ?? "").trim() : "";
        const price = parseInt(priceRaw.replace(/\D/g, ""), 10) || 0;
        const description = colDescription >= 0 ? (fields[colDescription] ?? "").trim() : "";
        const activeRaw = colActive >= 0 ? (fields[colActive] ?? "").trim().toLowerCase() : "";
        const active = activeRaw === "" ? true : activeRaw === "true" || activeRaw === "1" || activeRaw === "yes";

        const nameLower = name.toLowerCase();
        const isDuplicate = existingNames.has(nameLower) || batchNames.has(nameLower);
        if (!isDuplicate) batchNames.add(nameLower);

        const isNewCategory =
          category !== "" && !catByNameLower.has(category.toLowerCase());

        // Parse variants: "Name:PriceAdj|Name2:PriceAdj2"
        const variantsRaw = colVariants >= 0 ? (fields[colVariants] ?? "").trim() : "";
        const parsedVariants: { name: string; priceAdj: number }[] = variantsRaw
          ? variantsRaw.split("|").flatMap((seg) => {
              const parts = seg.split(":");
              const vName = parts[0]?.trim();
              if (!vName) return [];
              return [{ name: vName, priceAdj: parseInt(parts[1] ?? "0", 10) || 0 }];
            })
          : [];

        // Parse bom_materials: "RawName:Qty:Unit|..."
        const bomRaw = colBom >= 0 ? (fields[colBom] ?? "").trim() : "";
        const rawByNameLower = new Map(
          state.products
            .filter((p) => p.product_type === "RAW_MATERIAL")
            .map((p) => [p.name.toLowerCase(), p])
        );
        const parsedBom: { rawName: string; qty: number; unit: string; isMissing: boolean; isUnitMismatch: boolean }[] = bomRaw
          ? bomRaw.split("|").flatMap((seg) => {
              const parts = seg.split(":");
              const rawName = parts[0]?.trim();
              const qty = parseFloat(parts[1] ?? "0") || 0;
              const unit = (parts[2]?.trim() || "pcs").toLowerCase();
              if (!rawName || qty <= 0) return [];
              const isMissing = !rawByNameLower.has(rawName.toLowerCase());
              let isUnitMismatch = false;
              if (!isMissing) {
                const rm = rawByNameLower.get(rawName.toLowerCase())!;
                const invUnit = state.inventory.find((iv) => iv.product_id === rm.id && iv.variant_id === "")?.unit || "pcs";
                isUnitMismatch = normalizeToBaseUnit(qty, unit, invUnit) === null;
              }
              return [{ rawName, qty, unit, isMissing, isUnitMismatch }];
            })
          : [];
        const hasMissingRaw = parsedBom.some((b) => b.isMissing);
        const hasUnitMismatch = parsedBom.some((b) => b.isUnitMismatch);

        rows.push({ name, category, price, description, active, isDuplicate, isNewCategory, variantsRaw, bomRaw, parsedVariants, parsedBom, hasMissingRaw, hasUnitMismatch });
      }

      setCsvRows(rows);
      setShowImportPreview(true);
    };
    reader.readAsText(file, "utf-8");
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  // ── CSV confirm & save ──────────────────────────────────────────────────────

  const handleImportConfirm = async () => {
    setImporting(true);
    setShowImportPreview(false);
    try {
      const now = Date.now();

      // Build catByName map (case-insensitive) from MENU categories
      const catByName = new Map<string, string>();
      for (const c of state.categories) {
        if (c.category_type === "MENU") {
          catByName.set(c.name.toLowerCase(), c.id);
        }
      }

      let imported = 0;
      let skipped = 0;

      for (const row of csvRows) {
        if (row.isDuplicate) {
          skipped++;
          continue;
        }

        let categoryId: string | null = null;

        if (row.category) {
          const catKey = row.category.toLowerCase();
          if (catByName.has(catKey)) {
            categoryId = catByName.get(catKey)!;
          } else {
            // Create new MENU category
            const newCatId = crypto.randomUUID();
            const createdCat = await repo.createCategory(supabase, {
              id: newCatId,
              tenant_id: tenantId,
              name: row.category,
              sort_order: 0,
              category_type: "MENU",
              updated_at: now,
            });
            dispatch({ type: "UPSERT", table: "categories", payload: createdCat as unknown as Record<string, unknown> });
            catByName.set(catKey, newCatId);
            categoryId = newCatId;
          }
        }

        const newProdId = crypto.randomUUID();
        const created = await repo.createProduct(supabase, {
          id: newProdId,
          tenant_id: tenantId,
          name: row.name,
          price: row.price,
          category_id: categoryId,
          description: row.description || null,
          image_path: null,
          is_active: row.active,
          product_type: "MENU_ITEM",
          updated_at: now,
        });
        dispatch({ type: "UPSERT", table: "products", payload: created as unknown as Record<string, unknown> });

        // Save variants
        for (const fv of row.parsedVariants) {
          if (!fv.name) continue;
          const savedV = await repo.createVariant(supabase, {
            id: crypto.randomUUID(),
            tenant_id: tenantId,
            product_id: newProdId,
            name: fv.name,
            price_adjustment: fv.priceAdj,
            updated_at: now,
          });
          dispatch({ type: "UPSERT", table: "variants", payload: savedV as unknown as Record<string, unknown> });
        }

        // Save BOM components — match raw material name to existing RAW_MATERIAL products
        if (row.parsedBom.length > 0) {
          const rawByName = new Map(
            state.products
              .filter((p) => p.product_type === "RAW_MATERIAL")
              .map((p) => [p.name.toLowerCase(), p])
          );
          const components: Parameters<typeof repo.setProductComponents>[2] = [];
          for (let ci = 0; ci < row.parsedBom.length; ci++) {
            const b = row.parsedBom[ci];
            const rm = rawByName.get(b.rawName.toLowerCase());
            if (!rm) continue; // skip unknown raw materials
            const invUnit = getInventoryUnit(rm.id);
            const normalizedQty = normalizeToBaseUnit(b.qty, b.unit, invUnit);
            if (normalizedQty === null) continue; // incompatible units — skip
            components.push({
              id: crypto.randomUUID(),
              tenant_id: tenantId,
              parent_product_id: newProdId,
              component_product_id: rm.id,
              component_variant_id: "",
              required_qty: normalizedQty,
              unit: invUnit,
              sort_order: ci,
              updated_at: now,
            });
          }
          if (components.length > 0) {
            const savedComps = await repo.setProductComponents(supabase, newProdId, components);
            for (const sc of savedComps) {
              dispatch({ type: "UPSERT", table: "productComponents", payload: sc as unknown as Record<string, unknown> });
            }
          }
        }

        imported++;
      }

      const msg =
        skipped > 0
          ? `${copy.products.importSuccess} (${skipped} ${copy.products.importSkipped})`
          : copy.products.importSuccess;
      setImportMsg({ text: msg, ok: true });
    } catch (err) {
      console.error("Import failed:", err);
      setImportMsg({ text: copy.products.importError, ok: false });
    }
    setImporting(false);
    setCsvRows([]);
  };

  // ── Category CRUD ───────────────────────────────────────────────────────────

  const openCreateCategory = (fromProductForm = false) => {
    setEditCategoryId(null);
    setCatName("");
    setCatOrder("0");
    setCatFromProductForm(fromProductForm);
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
        const newCatId = crypto.randomUUID();
        const created = await repo.createCategory(supabase, {
          id: newCatId,
          tenant_id: tenantId,
          name: catName,
          sort_order: parseInt(catOrder) || 0,
          category_type: "MENU",
          updated_at: Date.now(),
        });
        dispatch({ type: "UPSERT", table: "categories", payload: created as unknown as Record<string, unknown> });
        if (catFromProductForm) {
          setFormCategory(newCatId);
        }
      }
      setCatFromProductForm(false);
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

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">{copy.products.title}</h1>
        {tab === "products" ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={handleDownloadTemplate}>
              ↓ {copy.products.downloadTemplate}
            </button>
            <label className="erp-btn erp-btn--ghost erp-btn--sm" style={{ cursor: "pointer", margin: 0 }}>
              ↑ {copy.products.importCsv}
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                style={{ display: "none" }}
                onChange={handleCsvFile}
              />
            </label>
            <button className="erp-btn erp-btn--primary erp-btn--sm" onClick={openCreate} disabled={!planLimits.canAddProduct}>
              + {copy.products.addProduct} {planLimits.limits.maxProducts < Infinity ? `(${planLimits.counts.products}/${planLimits.limits.maxProducts})` : ""}
            </button>
          </div>
        ) : tab === "categories" && isOwner ? (
          <button className="erp-btn erp-btn--primary erp-btn--sm" onClick={() => openCreateCategory()}>
            {copy.products.addCategory}
          </button>
        ) : null}
      </div>

      {/* Import message banner */}
      {importMsg && (
        <div className={`erp-import-msg${importMsg.ok ? " erp-import-msg--ok" : " erp-import-msg--err"}`}>
          <span>{importMsg.text}</span>
          <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setImportMsg(null)}>
            {copy.common.close}
          </button>
        </div>
      )}

      {/* Tab selector */}
      <div className="erp-tabs">
        <button
          className={`erp-tab${tab === "products" ? " erp-tab--active" : ""}`}
          onClick={() => setTab("products")}
        >
          {copy.products.title}
        </button>
        <button
          className={`erp-tab${tab === "variants" ? " erp-tab--active" : ""}`}
          onClick={() => setTab("variants")}
        >
          {copy.products.variantsTab}
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
              onClick={() => { setFilterCategory(""); resetPageAndSelection(); }}
            >
              {copy.pos.allCategories}
            </span>
            {categories.map((c) => (
              <span
                key={c.id}
                className={`erp-chip${filterCategory === c.id ? " erp-chip--active" : ""}`}
                onClick={() => { setFilterCategory(filterCategory === c.id ? "" : c.id); resetPageAndSelection(); }}
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
              onChange={(e) => { setSearch(e.target.value); resetPageAndSelection(); }}
            />
          </div>

          {/* Bulk bar */}
          {isOwner && selectedProdIds.size > 0 && (
            <div className="erp-bulk-bar">
              <span>{selectedProdIds.size} {copy.common.selected}</span>
              <button
                className="erp-btn erp-btn--danger erp-btn--sm"
                onClick={() => setShowProdBulkConfirm(true)}
              >
                {copy.products.bulkDelete}
              </button>
            </div>
          )}

          {/* Products table */}
          <div className="erp-table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  {isOwner && (
                    <th style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        checked={isAllPageSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all on page"
                      />
                    </th>
                  )}
                  <th>{copy.products.name}</th>
                  <th>{copy.products.category}</th>
                  <th>{copy.products.price}</th>
                  <th>{copy.products.active}</th>
                  <th>{copy.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {pagedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={isOwner ? 6 : 5} style={{ textAlign: "center", color: "var(--erp-muted)" }}>
                      {copy.products.noProducts}
                    </td>
                  </tr>
                ) : (
                  pagedProducts.map((p) => (
                    <tr key={p.id} className={selectedProdIds.has(p.id) ? "erp-table-row--selected" : undefined}>
                      {isOwner && (
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedProdIds.has(p.id)}
                            onChange={() => toggleSelectProduct(p.id)}
                          />
                        </td>
                      )}
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

          {/* Pagination */}
          <div className="erp-table-pagination">
            <div className="erp-table-pagination-info">
              <span>{copy.products.rowsPerPage}:</span>
              {[10, 25, 50].map((size) => (
                <span
                  key={size}
                  className={`erp-chip${prodPageSize === size ? " erp-chip--active" : ""}`}
                  onClick={() => { setProdPageSize(size); setProdPage(0); setSelectedProdIds(new Set()); }}
                  style={{ cursor: "pointer" }}
                >
                  {size}
                </span>
              ))}
              <span>
                {safePage * prodPageSize + 1}–{Math.min((safePage + 1) * prodPageSize, filteredProducts.length)} / {filteredProducts.length}
              </span>
            </div>
            <div style={{ display: "flex", gap: "0.25rem" }}>
              <button
                className="erp-btn erp-btn--ghost erp-btn--sm"
                disabled={safePage === 0}
                onClick={() => { setProdPage((p) => Math.max(0, p - 1)); setSelectedProdIds(new Set()); }}
              >
                ‹
              </button>
              <button
                className="erp-btn erp-btn--ghost erp-btn--sm"
                disabled={safePage >= totalPages - 1}
                onClick={() => { setProdPage((p) => Math.min(totalPages - 1, p + 1)); setSelectedProdIds(new Set()); }}
              >
                ›
              </button>
            </div>
          </div>
        </>
      )}

      {tab === "variants" && (
        <div className="erp-table-wrap">
          <table className="erp-table">
            <thead>
              <tr>
                <th>{copy.products.variantName}</th>
                <th>{copy.products.presetValues}</th>
                <th>{copy.products.presetAppliedTo}</th>
              </tr>
            </thead>
            <tbody>
              {state.variantGroups.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", color: "var(--erp-muted)" }}>
                    {copy.products.noPresets}
                  </td>
                </tr>
              ) : (
                state.variantGroups.map((g) => {
                  const values = state.variantGroupValues
                    .filter((gv) => gv.group_id === g.id)
                    .sort((a, b) => a.sort_order - b.sort_order);
                  // Find menu items that have variants matching this group
                  const appliedProducts: string[] = [];
                  for (const p of state.products.filter((pr) => pr.product_type === "MENU_ITEM")) {
                    const pVariants = state.variants.filter((v) => v.product_id === p.id);
                    if (pVariants.length > 0 && values.length > 0) {
                      const groupNames = values.map((gv) => gv.name.toLowerCase());
                      if (pVariants.every((pv) => groupNames.includes(pv.name.toLowerCase()))) {
                        appliedProducts.push(p.name);
                      }
                    }
                  }
                  return (
                    <tr key={g.id}>
                      <td><strong>{g.name}</strong></td>
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                          {values.map((gv) => (
                            <span key={gv.id} className="erp-badge erp-badge--sm">{gv.name}</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ color: "var(--erp-muted)", fontSize: "0.875rem" }}>
                        {appliedProducts.length > 0 ? appliedProducts.join(", ") : "—"}
                      </td>
                    </tr>
                  );
                })
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

      {/* ── Product form dialog ──────────────────────────────────────────────── */}
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
                <input
                  className="erp-input"
                  type="text"
                  inputMode="numeric"
                  value={formPrice ? parseInt(formPrice.replace(/\./g, ""), 10).toLocaleString("id-ID") : ""}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\./g, "").replace(/\D/g, "");
                    setFormPrice(raw);
                  }}
                  placeholder="0"
                />
              </div>
              <div className="erp-input-group">
                <label className="erp-label">{copy.products.category}</label>
                <select
                  className="erp-select"
                  value={formCategory}
                  onChange={(e) => {
                    if (e.target.value === "__NEW_CAT__") {
                      openCreateCategory(true);
                    } else {
                      setFormCategory(e.target.value);
                    }
                  }}
                >
                  <option value="">{copy.products.noCategory}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                  <option value="__NEW_CAT__">+ {copy.products.addCategory}</option>
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
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    {state.variantGroups.length > 0 && (
                      <select
                        className="erp-select erp-select--sm"
                        value=""
                        onChange={(e) => { if (e.target.value) handleApplyPreset(e.target.value); }}
                        style={{ maxWidth: 160, fontSize: "0.8rem" }}
                      >
                        <option value="">{copy.products.applyPreset}</option>
                        {state.variantGroups.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    )}
                    <button type="button" className="erp-btn erp-btn--ghost erp-btn--sm" onClick={addVariant}>
                      + {copy.products.addVariant}
                    </button>
                  </div>
                </div>
                {formVariants.length > 0 && (
                  <div className="erp-variant-list">
                    {formVariants.map((fv, idx) => {
                      const isDupName = formVariants.some(
                        (other, i) => i !== idx && other.name.trim().toLowerCase() === fv.name.trim().toLowerCase() && fv.name.trim() !== ""
                      );
                      const usedNames = formVariants
                        .filter((_, i) => i !== idx)
                        .map((v) => v.name.trim().toLowerCase());
                      return (
                        <div key={idx} className="erp-variant-row">
                          <select
                            className="erp-select erp-variant-name"
                            value={fv.name}
                            onChange={(e) => updateVariant(idx, "name", e.target.value)}
                            style={isDupName ? { borderColor: "var(--erp-danger)" } : undefined}
                          >
                            <option value="">{copy.products.variantName}</option>
                            {uniqueVariantNames
                              .filter((n) => !usedNames.includes(n.toLowerCase()) || n === fv.name)
                              .map((n) => <option key={n} value={n}>{n}</option>)}
                          </select>
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
                      );
                    })}
                  </div>
                )}
              </div>

              {/* BOM section */}
              <div className="erp-form-section">
                <div className="erp-form-section-header">
                  <span className="erp-form-section-title">
                    {copy.products.bom}
                    {formVariants.length > 0 && productPresetGroupId && (
                      <span style={{ fontSize: "0.75rem", color: "var(--erp-muted)", marginLeft: "0.5rem" }}>
                        ({copy.products.bomPerVariant})
                      </span>
                    )}
                  </span>
                  <button type="button" className="erp-btn erp-btn--ghost erp-btn--sm" onClick={addComponent}>
                    + {copy.products.addComponent}
                  </button>
                </div>
                {formComponents.length > 0 && (
                  <div className="erp-bom-list">
                    {formComponents.map((fc, idx) => {
                      const usedIds = formComponents
                        .filter((_, i) => i !== idx)
                        .map((c) => `${c.component_product_id}|${c.component_variant_id}`);
                      const available = rawMaterials.filter(
                        (rm) => !usedIds.includes(`${rm.id}|${fc.component_variant_id}`) || rm.id === fc.component_product_id
                      );
                      const rmVariants = fc.component_product_id ? getRawMaterialVariants(fc.component_product_id) : [];
                      const hasMatchingVariants = fc.component_product_id && rawHasMatchingVariants(fc.component_product_id);
                      return (
                        <div key={idx} className="erp-bom-row" style={hasMatchingVariants ? { flexWrap: "wrap" } : undefined}>
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
                          {hasMatchingVariants && rmVariants.length > 0 && (
                            <select
                              className="erp-select erp-bom-variant"
                              value={fc.component_variant_id}
                              onChange={(e) => updateComponent(idx, "component_variant_id", e.target.value)}
                              style={{ maxWidth: 120 }}
                            >
                              <option value="">{copy.products.selectComponentVariant}</option>
                              {rmVariants.map((v) => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                              ))}
                            </select>
                          )}
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
              <button className="erp-btn erp-btn--primary" onClick={() => handleSaveProduct()} disabled={saving || !formName}>
                {saving ? copy.common.loading : copy.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Product warning dialog ───────────────────────────────────────────── */}
      {showProductWarning && (
        <div className="erp-overlay" onClick={() => setShowProductWarning(false)}>
          <div className="erp-dialog erp-dialog--sm" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.products.warnProductTitle}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowProductWarning(false)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                {productWarnings.map((w, i) => (
                  <li key={i} style={{ marginBottom: "0.5rem" }}>{w}</li>
                ))}
              </ul>
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowProductWarning(false)}>
                {copy.common.cancel}
              </button>
              <button
                className="erp-btn erp-btn--primary"
                onClick={() => { setShowProductWarning(false); handleSaveProduct(true); }}
              >
                {copy.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk delete confirm dialog ───────────────────────────────────────── */}
      {showProdBulkConfirm && (
        <div className="erp-overlay" onClick={() => setShowProdBulkConfirm(false)}>
          <div className="erp-dialog erp-dialog--sm" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.common.confirmDelete}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowProdBulkConfirm(false)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              <p>{copy.products.bulkDeleteConfirm}</p>
              <p style={{ color: "var(--erp-muted)", fontSize: "0.85rem" }}>
                {selectedProdIds.size} {copy.common.selected}
              </p>
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowProdBulkConfirm(false)}>
                {copy.common.cancel}
              </button>
              <button className="erp-btn erp-btn--danger" onClick={handleBulkDelete}>
                {copy.common.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CSV import preview dialog ────────────────────────────────────────── */}
      {showImportPreview && (
        <div className="erp-overlay" onClick={() => setShowImportPreview(false)}>
          <div className="erp-dialog erp-dialog--wide" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.products.importPreviewTitle}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowImportPreview(false)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              <p style={{ color: "var(--erp-muted)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                {copy.products.importPreviewHint}
              </p>
              {csvRows.some((r) => r.hasMissingRaw) && (
                <div className="erp-import-msg erp-import-msg--err" style={{ marginBottom: "0.5rem" }}>
                  {copy.products.importBomMissingWarning}
                </div>
              )}
              {csvRows.some((r) => r.hasUnitMismatch) && (
                <div className="erp-import-msg erp-import-msg--err" style={{ marginBottom: "0.75rem" }}>
                  {copy.products.importBomUnitMismatchWarning}
                </div>
              )}
              <div className="erp-table-wrap">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>{copy.products.name}</th>
                      <th>{copy.products.category}</th>
                      <th>{copy.products.price}</th>
                      <th>{copy.products.active}</th>
                      <th>{copy.products.variants}</th>
                      <th>{copy.products.bom}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.map((row, i) => (
                      <tr key={i}>
                        <td>
                          {row.name}
                          {row.isDuplicate && (
                            <span className="erp-badge erp-badge--danger" style={{ marginLeft: 6 }}>
                              {copy.products.importDuplicate}
                            </span>
                          )}
                        </td>
                        <td>
                          {row.category || "—"}
                          {row.isNewCategory && !row.isDuplicate && (
                            <span className="erp-badge erp-badge--warning" style={{ marginLeft: 6 }}>
                              {copy.products.importNewCategory}
                            </span>
                          )}
                        </td>
                        <td>{formatRupiah(row.price)}</td>
                        <td>
                          <span className={`erp-badge ${row.active ? "erp-badge--success" : "erp-badge--danger"}`}>
                            {row.active ? copy.products.active : copy.products.inactive}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.8rem", color: "var(--erp-muted)" }}>
                          {row.parsedVariants.length > 0
                            ? row.parsedVariants.map((v) => `${v.name}${v.priceAdj !== 0 ? ` (+${v.priceAdj})` : ""}`).join(", ")
                            : "—"}
                        </td>
                        <td style={{ fontSize: "0.8rem" }}>
                          {row.parsedBom.length > 0
                            ? row.parsedBom.map((b, bi) => {
                                const isErr = b.isMissing || b.isUnitMismatch;
                                return (
                                  <span key={bi} style={{ color: isErr ? "var(--erp-danger)" : "var(--erp-muted)", marginRight: 4 }}>
                                    {b.rawName} {b.qty}{b.unit}{b.isMissing ? " ✗" : b.isUnitMismatch ? " ⚠︎" : ""}
                                    {bi < row.parsedBom.length - 1 ? ", " : ""}
                                  </span>
                                );
                              })
                            : <span style={{ color: "var(--erp-muted)" }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowImportPreview(false)}>
                {copy.common.cancel}
              </button>
              <button
                className="erp-btn erp-btn--primary"
                onClick={handleImportConfirm}
                disabled={importing || csvRows.every((r) => r.isDuplicate)}
              >
                {importing ? copy.common.loading : copy.products.importConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Variant name form dialog removed — presets managed in Purchasing */}

      {/* ── Category form dialog ─────────────────────────────────────────────── */}
      {showCategoryForm && (
        <div className="erp-overlay" onClick={() => { setCatFromProductForm(false); setShowCategoryForm(false); }}>
          <div className="erp-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{editCategoryId ? copy.products.editCategory : copy.products.addCategory}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => { setCatFromProductForm(false); setShowCategoryForm(false); }}>
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
              <button className="erp-btn erp-btn--secondary" onClick={() => { setCatFromProductForm(false); setShowCategoryForm(false); }}>
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
