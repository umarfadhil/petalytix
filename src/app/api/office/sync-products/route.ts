import { NextRequest, NextResponse } from "next/server";
import { getErpSession } from "@/lib/erp-auth";
import { createAdminClient } from "@/lib/supabase/server-admin";
import type { DbProduct, DbVariant, DbProductComponent, DbCategory } from "@/lib/supabase/types";

// POST /api/office/sync-products
// Body: { sourceId: string, targetIds: string[], syncType: "ALL" | "MENU_ITEM" | "RAW_MATERIAL" }
//
// Copies products (+ variants + product_components + categories) from source branch
// to target branches. Existing rows (matched by name) are skipped — no overwrites.

export async function POST(req: NextRequest) {
  const session = await getErpSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.sourceId || !Array.isArray(body.targetIds) || body.targetIds.length === 0) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { sourceId, targetIds, syncType = "ALL" } = body as {
    sourceId: string;
    targetIds: string[];
    syncType: "ALL" | "MENU_ITEM" | "RAW_MATERIAL";
  };

  const supabase = createAdminClient();
  const orgId = session.organizationId;

  // Resolve all branch IDs that belong to this owner's org.
  // Legacy: some tenants may have organization_id = null — also include branches
  // reachable via the owner's own tenantId (primary branch).
  let orgBranchIds: Set<string>;

  if (orgId) {
    // Primary query by organization_id; also include branches where org_id is null
    // but owner_email matches (legacy fallback, same pattern as office layout).
    const { data: orgBranches } = await supabase
      .from("tenants")
      .select("id")
      .eq("organization_id", orgId);

    const ids = new Set((orgBranches || []).map((b: { id: string }) => b.id));

    // Also include the session's own tenantId in case it lacks organization_id
    if (session.tenantId) ids.add(session.tenantId);

    orgBranchIds = ids;
  } else {
    // No organizationId in session — only allow the owner's own single tenant
    orgBranchIds = session.tenantId ? new Set([session.tenantId]) : new Set();
  }

  if (!orgBranchIds.has(sourceId) || targetIds.some((id) => !orgBranchIds.has(id))) {
    return NextResponse.json({ error: "Branch not in organization" }, { status: 403 });
  }

  // ── Fetch source data ──────────────────────────────────────────────
  const [srcProductsRes, srcVariantsRes, srcComponentsRes, srcCategoriesRes] = await Promise.all([
    supabase.from("products").select("*").eq("tenant_id", sourceId),
    supabase.from("variants").select("*").eq("tenant_id", sourceId),
    supabase.from("product_components").select("*").eq("tenant_id", sourceId),
    supabase.from("categories").select("*").eq("tenant_id", sourceId),
  ]);

  if (srcProductsRes.error) {
    return NextResponse.json({ error: `Failed to fetch source products: ${srcProductsRes.error.message}` }, { status: 500 });
  }

  let srcProducts = (srcProductsRes.data || []) as DbProduct[];
  if (syncType !== "ALL") {
    srcProducts = srcProducts.filter((p) => p.product_type === syncType);
  }

  if (srcProducts.length === 0) {
    return NextResponse.json({ message: "No products to sync from source branch.", copied: 0 });
  }

  const srcVariants   = (srcVariantsRes.data   || []) as DbVariant[];
  const srcComponents = (srcComponentsRes.data  || []) as DbProductComponent[];
  const srcCategories = (srcCategoriesRes.data  || []) as DbCategory[];

  const srcProductIds = new Set(srcProducts.map((p) => p.id));

  // ── Copy to each target ────────────────────────────────────────────
  let totalCopied = 0;

  for (const targetId of targetIds) {
    const [tgtProductsRes, tgtCategoriesRes] = await Promise.all([
      supabase.from("products").select("id, name, product_type").eq("tenant_id", targetId),
      supabase.from("categories").select("id, name, category_type").eq("tenant_id", targetId),
    ]);

    const tgtProducts   = (tgtProductsRes.data   || []) as Pick<DbProduct, "id" | "name" | "product_type">[];
    const tgtCategories = (tgtCategoriesRes.data  || []) as Pick<DbCategory, "id" | "name" | "category_type">[];

    const tgtProductNames  = new Set(tgtProducts.map((p) => p.name.toLowerCase().trim()));
    const tgtCategoryNames = new Set(tgtCategories.map((c) => `${c.category_type}::${c.name.toLowerCase().trim()}`));

    // Map: source category_id → target category_id (create if missing)
    const catIdMap = new Map<string, string>();
    const now = Date.now();

    for (const cat of srcCategories) {
      const key = `${cat.category_type}::${cat.name.toLowerCase().trim()}`;
      if (tgtCategoryNames.has(key)) {
        const existing = tgtCategories.find(
          (c) => c.category_type === cat.category_type && c.name.toLowerCase().trim() === cat.name.toLowerCase().trim()
        );
        if (existing) catIdMap.set(cat.id, existing.id);
      } else {
        const { data: newCat } = await supabase
          .from("categories")
          .insert({
            tenant_id: targetId,
            name: cat.name,
            category_type: cat.category_type,
            sort_order: cat.sort_order,
            sync_status: "SYNCED",
            updated_at: now,
          })
          .select("id")
          .single();
        if (newCat) {
          catIdMap.set(cat.id, newCat.id);
          tgtCategoryNames.add(key);
        }
      }
    }

    // Copy products (skip existing by name)
    const productIdMap = new Map<string, string>(); // source product id → target product id

    const productsToInsert = srcProducts.filter(
      (p) => !tgtProductNames.has(p.name.toLowerCase().trim())
    );

    if (productsToInsert.length > 0) {
      const rows = productsToInsert.map((p) => ({
        id: crypto.randomUUID(),
        tenant_id: targetId,
        name: p.name,
        description: p.description,
        price: p.price,
        image_path: p.image_path,
        is_active: p.is_active,
        product_type: p.product_type,
        category_id: p.category_id ? (catIdMap.get(p.category_id) ?? null) : null,
        sync_status: "SYNCED",
        updated_at: now,
      }));

      const { data: inserted, error: insertErr } = await supabase
        .from("products")
        .insert(rows)
        .select("id, name");

      if (insertErr) {
        return NextResponse.json({ error: `Product insert failed: ${insertErr.message}` }, { status: 500 });
      }

      if (inserted) {
        const insertedMap = new Map(
          (inserted as { id: string; name: string }[]).map((r) => [r.name.toLowerCase().trim(), r.id])
        );
        for (const p of productsToInsert) {
          const newId = insertedMap.get(p.name.toLowerCase().trim());
          if (newId) productIdMap.set(p.id, newId);
        }
        totalCopied += inserted.length;
      }
    }

    // Map products that already existed at target (for BOM component references)
    for (const p of srcProducts) {
      if (!productIdMap.has(p.id)) {
        const existing = tgtProducts.find((t) => t.name.toLowerCase().trim() === p.name.toLowerCase().trim());
        if (existing) productIdMap.set(p.id, existing.id);
      }
    }

    // Copy variants for newly inserted products only
    const variantsToInsert: (Omit<DbVariant, "sync_status"> & { sync_status: string })[] = [];
    const variantIdMap = new Map<string, string>();

    for (const v of srcVariants) {
      if (!srcProductIds.has(v.product_id)) continue;
      const targetProductId = productIdMap.get(v.product_id);
      if (!targetProductId) continue;

      // Only copy variants for newly created products
      if (!productsToInsert.find((p) => p.id === v.product_id)) {
        // Product already existed — map existing variant for BOM references
        const { data: existing } = await supabase
          .from("variants")
          .select("id, name")
          .eq("product_id", targetProductId)
          .eq("name", v.name)
          .limit(1);
        if (existing && existing.length > 0) {
          variantIdMap.set(v.id, existing[0].id);
        }
        continue;
      }

      variantsToInsert.push({
        id: crypto.randomUUID(),
        tenant_id: targetId,
        product_id: targetProductId,
        name: v.name,
        price_adjustment: v.price_adjustment,
        updated_at: now,
        sync_status: "SYNCED",
      });
    }

    if (variantsToInsert.length > 0) {
      const { data: insertedVars } = await supabase
        .from("variants")
        .insert(variantsToInsert)
        .select("id, name, product_id");

      if (insertedVars) {
        for (const sv of srcVariants) {
          const newTargetProductId = productIdMap.get(sv.product_id);
          const matched = (insertedVars as { id: string; name: string; product_id: string }[]).find(
            (iv) => iv.name === sv.name && iv.product_id === newTargetProductId
          );
          if (matched) variantIdMap.set(sv.id, matched.id);
        }
      }
    }

    // Copy product_components for newly inserted products only
    const componentsToInsert = srcComponents
      .filter((c) => productsToInsert.find((p) => p.id === c.parent_product_id))
      .map((c) => {
        const parentProductId = productIdMap.get(c.parent_product_id);
        const compProductId   = productIdMap.get(c.component_product_id);
        if (!parentProductId || !compProductId) return null;
        const parentVariantId  = c.parent_variant_id   ? (variantIdMap.get(c.parent_variant_id)   ?? "") : "";
        const compVariantId    = c.component_variant_id ? (variantIdMap.get(c.component_variant_id) ?? "") : "";
        return {
          id: crypto.randomUUID(),
          tenant_id: targetId,
          parent_product_id: parentProductId,
          parent_variant_id: parentVariantId,
          component_product_id: compProductId,
          component_variant_id: compVariantId,
          required_qty: c.required_qty,
          unit: c.unit,
          sort_order: c.sort_order,
          sync_status: "SYNCED",
          updated_at: now,
        };
      })
      .filter(Boolean);

    if (componentsToInsert.length > 0) {
      await supabase.from("product_components").insert(componentsToInsert);
    }
  }

  const skipped = srcProducts.length - totalCopied;
  const msg = totalCopied > 0
    ? `${totalCopied} product(s) copied${skipped > 0 ? `, ${skipped} skipped (already exist)` : ""}.`
    : `No new products to copy — all ${skipped} product(s) already exist in the target branch.`;

  return NextResponse.json({ message: msg, copied: totalCopied });
}
