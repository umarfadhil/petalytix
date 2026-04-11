import { NextRequest, NextResponse } from "next/server";
import { getErpSession } from "@/lib/erp-auth";
import { createAdminClient } from "@/lib/supabase/server-admin";
import type { DbProduct, DbVariant, DbProductComponent, DbCategory, DbVendor, DbVariantGroup, DbVariantGroupValue } from "@/lib/supabase/types";

const VALID_DATA_TYPES = [
  "CUSTOMERS", "VENDORS", "RAW_MATERIALS", "CATEGORY_RAW",
  "VARIANT_GROUPS", "MENU_ITEMS", "CATEGORY_MENU",
] as const;
type DataType = (typeof VALID_DATA_TYPES)[number];

// POST /api/office/master-data-links
// Body: { action: "LINK" | "UNLINK", targetTenantId: string, dataType: DataType }
export async function POST(req: NextRequest) {
  const session = await getErpSession();
  if (!session || session.role !== "OWNER" || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.targetTenantId || !body.dataType || !body.action) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { action, targetTenantId, dataType } = body as {
    action: "LINK" | "UNLINK";
    targetTenantId: string;
    dataType: DataType;
  };

  if (!VALID_DATA_TYPES.includes(dataType)) {
    return NextResponse.json({ error: "Invalid data type" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const orgId = session.organizationId;

  // Verify target branch belongs to this org
  const { data: targetBranch } = await supabase
    .from("tenants")
    .select("id, is_primary")
    .eq("id", targetTenantId)
    .eq("organization_id", orgId)
    .single();

  if (!targetBranch) {
    return NextResponse.json({ error: "Branch not in organization" }, { status: 403 });
  }
  if (targetBranch.is_primary) {
    return NextResponse.json({ error: "Cannot link/unlink the primary branch" }, { status: 400 });
  }

  // Find primary branch
  const { data: primaryBranch } = await supabase
    .from("tenants")
    .select("id")
    .eq("organization_id", orgId)
    .eq("is_primary", true)
    .single();

  if (!primaryBranch) {
    return NextResponse.json({ error: "No primary branch found" }, { status: 500 });
  }
  const primaryId = primaryBranch.id;

  if (action === "LINK") {
    return handleLink(supabase, orgId, primaryId, targetTenantId, dataType);
  } else if (action === "UNLINK") {
    return handleUnlink(supabase, orgId, primaryId, targetTenantId, dataType);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// ── LINK: copy data from primary → target ────────────────────────
async function handleLink(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string, primaryId: string, targetId: string, dataType: DataType,
) {
  const now = Date.now();
  let copied = 0;

  switch (dataType) {
    case "CUSTOMERS": {
      // Customers are org-scoped — link is config-only
      break;
    }

    case "VENDORS": {
      const { data: srcVendors } = await supabase.from("vendors").select("*").eq("tenant_id", primaryId);
      const { data: tgtVendors } = await supabase.from("vendors").select("name").eq("tenant_id", targetId);
      const tgtNames = new Set((tgtVendors || []).map((v: { name: string }) => v.name.toLowerCase().trim()));

      const toInsert = ((srcVendors || []) as DbVendor[])
        .filter((v) => !tgtNames.has(v.name.toLowerCase().trim()))
        .map((v) => ({
          id: crypto.randomUUID(),
          tenant_id: targetId,
          name: v.name,
          phone: v.phone,
          address: v.address,
          sync_status: "SYNCED",
          updated_at: now,
        }));

      if (toInsert.length > 0) {
        const { data } = await supabase.from("vendors").insert(toInsert).select("id");
        copied = data?.length ?? 0;
      }
      break;
    }

    case "RAW_MATERIALS":
    case "MENU_ITEMS": {
      const productType = dataType === "RAW_MATERIALS" ? "RAW_MATERIAL" : "MENU_ITEM";
      copied = await copyProducts(supabase, primaryId, targetId, productType, now);
      break;
    }

    case "CATEGORY_RAW":
    case "CATEGORY_MENU": {
      const categoryType = dataType === "CATEGORY_RAW" ? "RAW_MATERIAL" : "MENU";
      copied = await copyCategories(supabase, primaryId, targetId, categoryType, now);
      break;
    }

    case "VARIANT_GROUPS": {
      copied = await copyVariantGroups(supabase, primaryId, targetId, now);
      break;
    }
  }

  // Upsert the link record
  await supabase.from("master_data_links").upsert(
    { organization_id: orgId, target_tenant_id: targetId, data_type: dataType, linked_at: now },
    { onConflict: "organization_id,target_tenant_id,data_type" }
  );

  return NextResponse.json({ ok: true, copied });
}

// ── UNLINK: delete matched data from target ──────────────────────
async function handleUnlink(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string, primaryId: string, targetId: string, dataType: DataType,
) {
  let removed = 0;

  switch (dataType) {
    case "CUSTOMERS": {
      // Config-only — no data deletion
      break;
    }

    case "VENDORS": {
      const { data: srcVendors } = await supabase.from("vendors").select("name").eq("tenant_id", primaryId);
      const srcNames = (srcVendors || []).map((v: { name: string }) => v.name);
      if (srcNames.length > 0) {
        const { data } = await supabase
          .from("vendors")
          .delete()
          .eq("tenant_id", targetId)
          .in("name", srcNames)
          .select("id");
        removed = data?.length ?? 0;
      }
      break;
    }

    case "RAW_MATERIALS":
    case "MENU_ITEMS": {
      const productType = dataType === "RAW_MATERIALS" ? "RAW_MATERIAL" : "MENU_ITEM";
      removed = await deleteProducts(supabase, primaryId, targetId, productType);
      break;
    }

    case "CATEGORY_RAW":
    case "CATEGORY_MENU": {
      const categoryType = dataType === "CATEGORY_RAW" ? "RAW_MATERIAL" : "MENU";
      const { data: srcCats } = await supabase.from("categories").select("name").eq("tenant_id", primaryId).eq("category_type", categoryType);
      const srcNames = (srcCats || []).map((c: { name: string }) => c.name);
      if (srcNames.length > 0) {
        const { data } = await supabase
          .from("categories")
          .delete()
          .eq("tenant_id", targetId)
          .eq("category_type", categoryType)
          .in("name", srcNames)
          .select("id");
        removed = data?.length ?? 0;
      }
      break;
    }

    case "VARIANT_GROUPS": {
      removed = await deleteVariantGroups(supabase, primaryId, targetId);
      break;
    }
  }

  // Delete the link record
  await supabase
    .from("master_data_links")
    .delete()
    .eq("organization_id", orgId)
    .eq("target_tenant_id", targetId)
    .eq("data_type", dataType);

  return NextResponse.json({ ok: true, removed });
}

// ── Helpers ──────────────────────────────────────────────────────

async function copyProducts(
  supabase: ReturnType<typeof createAdminClient>,
  primaryId: string, targetId: string, productType: string, now: number,
): Promise<number> {
  const [srcProductsRes, srcVariantsRes, srcComponentsRes, srcCategoriesRes] = await Promise.all([
    supabase.from("products").select("*").eq("tenant_id", primaryId).eq("product_type", productType),
    supabase.from("variants").select("*").eq("tenant_id", primaryId),
    supabase.from("product_components").select("*").eq("tenant_id", primaryId),
    supabase.from("categories").select("*").eq("tenant_id", primaryId),
  ]);

  const srcProducts = (srcProductsRes.data || []) as DbProduct[];
  if (srcProducts.length === 0) return 0;

  const srcVariants = (srcVariantsRes.data || []) as DbVariant[];
  const srcComponents = (srcComponentsRes.data || []) as DbProductComponent[];
  const srcCategories = (srcCategoriesRes.data || []) as DbCategory[];
  const srcProductIds = new Set(srcProducts.map((p) => p.id));

  const [tgtProductsRes, tgtCategoriesRes] = await Promise.all([
    supabase.from("products").select("id, name, product_type").eq("tenant_id", targetId),
    supabase.from("categories").select("id, name, category_type").eq("tenant_id", targetId),
  ]);

  const tgtProducts = (tgtProductsRes.data || []) as Pick<DbProduct, "id" | "name" | "product_type">[];
  const tgtCategories = (tgtCategoriesRes.data || []) as Pick<DbCategory, "id" | "name" | "category_type">[];
  const tgtProductNames = new Set(tgtProducts.map((p) => p.name.toLowerCase().trim()));
  const tgtCategoryKeys = new Set(tgtCategories.map((c) => `${c.category_type}::${c.name.toLowerCase().trim()}`));

  // Map source category → target category (create if missing)
  const catIdMap = new Map<string, string>();
  for (const cat of srcCategories) {
    const key = `${cat.category_type}::${cat.name.toLowerCase().trim()}`;
    if (tgtCategoryKeys.has(key)) {
      const existing = tgtCategories.find(
        (c) => c.category_type === cat.category_type && c.name.toLowerCase().trim() === cat.name.toLowerCase().trim()
      );
      if (existing) catIdMap.set(cat.id, existing.id);
    } else {
      const { data: newCat } = await supabase
        .from("categories")
        .insert({ id: crypto.randomUUID(), tenant_id: targetId, name: cat.name, category_type: cat.category_type, sort_order: cat.sort_order, sync_status: "SYNCED", updated_at: now })
        .select("id")
        .single();
      if (newCat) {
        catIdMap.set(cat.id, newCat.id);
        tgtCategoryKeys.add(key);
      }
    }
  }

  // Insert products (skip existing by name)
  const productsToInsert = srcProducts.filter((p) => !tgtProductNames.has(p.name.toLowerCase().trim()));
  const productIdMap = new Map<string, string>();

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

    const { data: inserted } = await supabase.from("products").insert(rows).select("id, name");
    if (inserted) {
      const insertedMap = new Map(
        (inserted as { id: string; name: string }[]).map((r) => [r.name.toLowerCase().trim(), r.id])
      );
      for (const p of productsToInsert) {
        const newId = insertedMap.get(p.name.toLowerCase().trim());
        if (newId) productIdMap.set(p.id, newId);
      }
    }
  }

  // Map existing products for BOM references
  for (const p of srcProducts) {
    if (!productIdMap.has(p.id)) {
      const existing = tgtProducts.find((t) => t.name.toLowerCase().trim() === p.name.toLowerCase().trim());
      if (existing) productIdMap.set(p.id, existing.id);
    }
  }

  // Copy variants for newly inserted products
  const variantIdMap = new Map<string, string>();
  const variantsToInsert = srcVariants
    .filter((v) => srcProductIds.has(v.product_id) && productsToInsert.find((p) => p.id === v.product_id))
    .map((v) => {
      const targetProductId = productIdMap.get(v.product_id);
      if (!targetProductId) return null;
      const newId = crypto.randomUUID();
      variantIdMap.set(v.id, newId);
      return {
        id: newId,
        tenant_id: targetId,
        product_id: targetProductId,
        name: v.name,
        price_adjustment: v.price_adjustment,
        updated_at: now,
        sync_status: "SYNCED",
      };
    })
    .filter(Boolean);

  if (variantsToInsert.length > 0) {
    await supabase.from("variants").insert(variantsToInsert);
  }

  // Also map existing variants for BOM
  for (const v of srcVariants) {
    if (!variantIdMap.has(v.id)) {
      const targetProductId = productIdMap.get(v.product_id);
      if (targetProductId) {
        const { data: existing } = await supabase
          .from("variants").select("id, name").eq("product_id", targetProductId).eq("name", v.name).limit(1);
        if (existing && existing.length > 0) variantIdMap.set(v.id, existing[0].id);
      }
    }
  }

  // Copy product_components for newly inserted products
  const componentsToInsert = srcComponents
    .filter((c) => productsToInsert.find((p) => p.id === c.parent_product_id))
    .map((c) => {
      const parentProductId = productIdMap.get(c.parent_product_id);
      const compProductId = productIdMap.get(c.component_product_id);
      if (!parentProductId || !compProductId) return null;
      return {
        id: crypto.randomUUID(),
        tenant_id: targetId,
        parent_product_id: parentProductId,
        parent_variant_id: c.parent_variant_id ? (variantIdMap.get(c.parent_variant_id) ?? "") : "",
        component_product_id: compProductId,
        component_variant_id: c.component_variant_id ? (variantIdMap.get(c.component_variant_id) ?? "") : "",
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

  return productsToInsert.length;
}

async function deleteProducts(
  supabase: ReturnType<typeof createAdminClient>,
  primaryId: string, targetId: string, productType: string,
): Promise<number> {
  const { data: srcProducts } = await supabase
    .from("products").select("name").eq("tenant_id", primaryId).eq("product_type", productType);
  const srcNames = (srcProducts || []).map((p: { name: string }) => p.name);
  if (srcNames.length === 0) return 0;

  // Find target product IDs matching primary names
  const { data: tgtProducts } = await supabase
    .from("products")
    .select("id, name")
    .eq("tenant_id", targetId)
    .eq("product_type", productType)
    .in("name", srcNames);

  if (!tgtProducts || tgtProducts.length === 0) return 0;
  const tgtIds = tgtProducts.map((p: { id: string }) => p.id);

  // Cascade delete: variants, product_components, inventory
  await Promise.all([
    supabase.from("variants").delete().eq("tenant_id", targetId).in("product_id", tgtIds),
    supabase.from("product_components").delete().eq("tenant_id", targetId).in("parent_product_id", tgtIds),
    supabase.from("product_components").delete().eq("tenant_id", targetId).in("component_product_id", tgtIds),
    supabase.from("inventory").delete().eq("tenant_id", targetId).in("product_id", tgtIds),
  ]);

  // Delete the products themselves
  const { data: deleted } = await supabase
    .from("products").delete().eq("tenant_id", targetId).in("id", tgtIds).select("id");

  return deleted?.length ?? 0;
}

async function copyCategories(
  supabase: ReturnType<typeof createAdminClient>,
  primaryId: string, targetId: string, categoryType: string, now: number,
): Promise<number> {
  const { data: srcCats } = await supabase
    .from("categories").select("*").eq("tenant_id", primaryId).eq("category_type", categoryType);
  const { data: tgtCats } = await supabase
    .from("categories").select("name").eq("tenant_id", targetId).eq("category_type", categoryType);

  const tgtNames = new Set((tgtCats || []).map((c: { name: string }) => c.name.toLowerCase().trim()));
  const toInsert = ((srcCats || []) as DbCategory[])
    .filter((c) => !tgtNames.has(c.name.toLowerCase().trim()))
    .map((c) => ({
      id: crypto.randomUUID(),
      tenant_id: targetId,
      name: c.name,
      category_type: c.category_type,
      sort_order: c.sort_order,
      sync_status: "SYNCED",
      updated_at: now,
    }));

  if (toInsert.length > 0) {
    const { data } = await supabase.from("categories").insert(toInsert).select("id");
    return data?.length ?? 0;
  }
  return 0;
}

async function copyVariantGroups(
  supabase: ReturnType<typeof createAdminClient>,
  primaryId: string, targetId: string, now: number,
): Promise<number> {
  const { data: srcGroups } = await supabase.from("variant_groups").select("*").eq("tenant_id", primaryId);
  const { data: srcValues } = await supabase.from("variant_group_values").select("*").eq("tenant_id", primaryId);
  const { data: tgtGroups } = await supabase.from("variant_groups").select("name").eq("tenant_id", targetId);

  const tgtNames = new Set((tgtGroups || []).map((g: { name: string }) => g.name.toLowerCase().trim()));
  const groupsToInsert = ((srcGroups || []) as DbVariantGroup[]).filter((g) => !tgtNames.has(g.name.toLowerCase().trim()));

  if (groupsToInsert.length === 0) return 0;

  let totalCopied = 0;
  for (const group of groupsToInsert) {
    const { data: newGroup } = await supabase
      .from("variant_groups")
      .insert({ id: crypto.randomUUID(), tenant_id: targetId, name: group.name, sync_status: "SYNCED", updated_at: now })
      .select("id")
      .single();

    if (newGroup) {
      totalCopied++;
      const values = ((srcValues || []) as DbVariantGroupValue[]).filter((v) => v.group_id === group.id);
      if (values.length > 0) {
        await supabase.from("variant_group_values").insert(
          values.map((v) => ({
            id: crypto.randomUUID(),
            group_id: newGroup.id,
            tenant_id: targetId,
            name: v.name,
            sort_order: v.sort_order,
            sync_status: "SYNCED",
            updated_at: now,
          }))
        );
      }
    }
  }
  return totalCopied;
}

async function deleteVariantGroups(
  supabase: ReturnType<typeof createAdminClient>,
  primaryId: string, targetId: string,
): Promise<number> {
  const { data: srcGroups } = await supabase.from("variant_groups").select("name").eq("tenant_id", primaryId);
  const srcNames = (srcGroups || []).map((g: { name: string }) => g.name);
  if (srcNames.length === 0) return 0;

  // Cascade: variant_group_values deleted automatically via ON DELETE CASCADE
  const { data: deleted } = await supabase
    .from("variant_groups")
    .delete()
    .eq("tenant_id", targetId)
    .in("name", srcNames)
    .select("id");

  return deleted?.length ?? 0;
}
