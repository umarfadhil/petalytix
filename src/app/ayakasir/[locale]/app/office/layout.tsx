import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { getErpSession } from "@/lib/erp-auth";
import { OfficeProvider } from "@/components/ayakasir/erp/office/store";
import OfficeSidebar from "@/components/ayakasir/erp/office/OfficeSidebar";
import { getPlanLimits } from "@/lib/ayakasir-plan";
import type {
  DbOrganization, DbTenant, DbUser, DbCustomer, DbCustomerCategory, DbMasterDataLink,
} from "@/lib/supabase/types";
import type {
  BranchSummary, ConsolidatedTx, ConsolidatedTxItem,
  ConsolidatedInventoryRow, ConsolidatedMovement, ConsolidatedGoodsReceivingItem, ConsolidatedProduct,
  PrimaryDataCounts,
} from "@/components/ayakasir/erp/office/store";
import type { DbProductComponent, DbVendor, DbCategory } from "@/lib/supabase/types";

function getServerBasePath() {
  const host = headers().get("host") || "";
  if (host.startsWith("ayakasir.") || host.startsWith("ayakasir:")) return "";
  return "/ayakasir";
}

export default async function OfficeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const supabase = createAdminClient();
  const base = getServerBasePath();

  const session = await getErpSession();
  if (!session || session.role !== "OWNER" || !session.organizationId) {
    redirect(`${base}/${params.locale}/app/dashboard`);
  }

  const orgId = session.organizationId;

  // Load org + all its branches first (needed to derive branch IDs for user fallback)
  const [orgRes, branchesRes] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", orgId).single(),
    supabase.from("tenants").select("*").eq("organization_id", orgId).order("is_primary", { ascending: false }),
  ]);

  const organization = (orgRes.data as DbOrganization | null);
  if (!organization) {
    redirect(`${base}/${params.locale}/app/dashboard`);
  }

  const branches = (branchesRes.data || []) as DbTenant[];
  const branchIds = branches.map((b) => b.id);

  // Load users: primary query by organization_id; fallback union for legacy staff
  // (staff added before organization_id was backfilled have organization_id = null)
  const [usersRes, legacyUsersRes, customersRes, customerCatsRes] = await Promise.all([
    supabase.from("users").select("*").eq("organization_id", orgId).order("name"),
    branchIds.length > 0
      ? supabase.from("users").select("*").in("tenant_id", branchIds).is("organization_id", null).order("name")
      : Promise.resolve({ data: [] }),
    supabase.from("customers").select("*").eq("organization_id", orgId).order("name"),
    supabase.from("customer_categories").select("*").eq("organization_id", orgId).order("name"),
  ]);

  // Merge and dedupe by id
  const allUsersRaw = [
    ...((usersRes.data || []) as DbUser[]),
    ...((legacyUsersRes.data || []) as DbUser[]),
  ];
  const seen = new Set<string>();
  const orgUsers: DbUser[] = allUsersRaw.filter((u) => {
    if (seen.has(u.id)) return false;
    seen.add(u.id);
    return true;
  });
  const orgCustomers = (customersRes.data || []) as DbCustomer[];
  const orgCustomerCategories = (customerCatsRes.data || []) as DbCustomerCategory[];

  // Check plan allows Office access (maxBranches > 1 = Tumbuh+)
  const planExpired =
    organization.plan_expires_at != null && Date.now() > organization.plan_expires_at;
  const effectivePlan = planExpired ? "PERINTIS" : organization.plan;
  const limits = getPlanLimits(effectivePlan);
  if (limits.maxBranches <= 1) {
    redirect(`${base}/${params.locale}/app/dashboard`);
  }

  // Build lightweight branch summaries via parallel per-branch queries
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();

  const summaries = await Promise.all(
    branches.map(async (branch): Promise<BranchSummary> => {
      const [txRes, sessionRes, inventoryRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("total, status")
          .eq("tenant_id", branch.id)
          .gte("date", todayStartMs)
          .eq("status", "COMPLETED"),
        supabase
          .from("cashier_sessions")
          .select("id")
          .eq("tenant_id", branch.id)
          .is("closed_at", null)
          .limit(1),
        supabase
          .from("inventory")
          .select("current_qty, min_qty")
          .eq("tenant_id", branch.id),
      ]);

      const txList = txRes.data || [];
      const todayRevenue = txList.reduce((sum: number, t: { total: number }) => sum + t.total, 0);
      const todayTransactions = txList.length;
      const activeSession = (sessionRes.data?.length ?? 0) > 0;
      const invList = (inventoryRes.data || []) as { current_qty: number; min_qty: number }[];
      const lowStockCount = invList.filter((i) => i.current_qty <= i.min_qty).length;

      return {
        tenantId: branch.id,
        branchName: branch.branch_name || branch.name,
        todayRevenue,
        todayTransactions,
        activeSession,
        lowStockCount,
      };
    })
  );

  // Fetch consolidated transactions (current year) for reports
  const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
  const [consolidatedTxRes, consolidatedItemsRes, inventoryRes2, movementsRes, grRes, grItemsRes, productsRes, productComponentsRes, vendorsRes, categoriesRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, tenant_id, date, total, payment_method, debt_status, customer_id")
      .in("tenant_id", branchIds)
      .gte("date", yearStart)
      .eq("status", "COMPLETED")
      .order("date", { ascending: false }),
    supabase
      .from("transaction_items")
      .select("transaction_id, tenant_id, product_id, variant_id, product_name, variant_name, qty, subtotal, cogs_per_unit")
      .in("tenant_id", branchIds),
    // Inventory: current stock snapshot across all branches
    supabase
      .from("inventory")
      .select("tenant_id, product_id, variant_id, current_qty, min_qty, unit, avg_cogs")
      .in("tenant_id", branchIds),
    // Inventory movements (current year)
    supabase
      .from("inventory_movements")
      .select("id, tenant_id, product_id, variant_id, movement_type, qty_change, unit, date, reason, user_id")
      .in("tenant_id", branchIds)
      .gte("date", yearStart)
      .order("date", { ascending: false }),
    // Goods receiving headers (current year, for date)
    supabase
      .from("goods_receiving")
      .select("id, tenant_id, date, vendor_id")
      .in("tenant_id", branchIds)
      .gte("date", yearStart),
    // Goods receiving items (all for branches — filtered by year via parent join)
    supabase
      .from("goods_receiving_items")
      .select("tenant_id, receiving_id, product_id, variant_id, qty, cost_per_unit, unit")
      .in("tenant_id", branchIds),
    // Products (lightweight for name + category lookups)
    supabase
      .from("products")
      .select("id, tenant_id, name, product_type, category_id")
      .in("tenant_id", branchIds),
    // Product components (BOM) for COGS computation
    supabase
      .from("product_components")
      .select("id, tenant_id, parent_product_id, parent_variant_id, component_product_id, component_variant_id, required_qty, unit, sort_order, sync_status, updated_at")
      .in("tenant_id", branchIds),
    // Vendors (for purchasing detail export)
    supabase
      .from("vendors")
      .select("id, tenant_id, name, phone, address, sync_status, updated_at")
      .in("tenant_id", branchIds),
    // Categories (MENU type, for reports)
    supabase
      .from("categories")
      .select("id, tenant_id, name, sort_order, category_type, sync_status, updated_at")
      .in("tenant_id", branchIds)
      .eq("category_type", "MENU"),
  ]);

  const consolidatedTxs = (consolidatedTxRes.data || []) as ConsolidatedTx[];
  // Build a set of this-year transaction IDs for filtering items
  const txIdSet = new Set(consolidatedTxs.map((t) => t.id));
  const consolidatedTxItems = ((consolidatedItemsRes.data || []) as ConsolidatedTxItem[]).filter(
    (item) => txIdSet.has(item.transaction_id)
  );

  // Inventory data
  const consolidatedInventory = (inventoryRes2.data || []) as ConsolidatedInventoryRow[];
  const consolidatedMovements = (movementsRes.data || []) as ConsolidatedMovement[];
  const consolidatedProducts = ((productsRes.data || []) as ConsolidatedProduct[]);
  const consolidatedProductComponents = (productComponentsRes.data || []) as DbProductComponent[];
  const consolidatedVendors = (vendorsRes.data || []) as DbVendor[];
  const consolidatedCategories = (categoriesRes.data || []) as DbCategory[];

  // Join GR items with GR headers to get date + vendor_id
  const grHeaders = (grRes.data || []) as { id: string; tenant_id: string; date: number; vendor_id: string | null }[];
  const grHeaderMap = new Map(grHeaders.map((h) => [h.id, h]));
  const consolidatedGrItems = ((grItemsRes.data || []) as (ConsolidatedGoodsReceivingItem & { date?: number; vendor_id?: string | null })[])
    .filter((item) => grHeaderMap.has(item.receiving_id))
    .map((item) => {
      const hdr = grHeaderMap.get(item.receiving_id)!;
      return { ...item, date: hdr.date, vendor_id: hdr.vendor_id };
    });

  // ── Master data links + primary branch counts ──────────────────
  const primaryBranch = branches.find((b) => b.is_primary) || branches[0];
  const primaryId = primaryBranch?.id ?? "";

  const [
    masterDataLinksRes,
    menuItemCountRes, rawMaterialCountRes,
    categoryMenuCountRes, categoryRawCountRes,
    vendorCountRes, variantGroupCountRes,
  ] = await Promise.all([
    supabase.from("master_data_links").select("*").eq("organization_id", orgId),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("tenant_id", primaryId).eq("product_type", "MENU_ITEM"),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("tenant_id", primaryId).eq("product_type", "RAW_MATERIAL"),
    supabase.from("categories").select("id", { count: "exact", head: true }).eq("tenant_id", primaryId).eq("category_type", "MENU"),
    supabase.from("categories").select("id", { count: "exact", head: true }).eq("tenant_id", primaryId).eq("category_type", "RAW_MATERIAL"),
    supabase.from("vendors").select("id", { count: "exact", head: true }).eq("tenant_id", primaryId),
    supabase.from("variant_groups").select("id", { count: "exact", head: true }).eq("tenant_id", primaryId),
  ]);

  const masterDataLinks = (masterDataLinksRes.data || []) as DbMasterDataLink[];
  const primaryDataCounts: PrimaryDataCounts = {
    customers: orgCustomers.length,
    vendors: vendorCountRes.count ?? 0,
    rawMaterials: rawMaterialCountRes.count ?? 0,
    categoryRaw: categoryRawCountRes.count ?? 0,
    variantGroups: variantGroupCountRes.count ?? 0,
    menuItems: menuItemCountRes.count ?? 0,
    categoryMenu: categoryMenuCountRes.count ?? 0,
  };

  return (
    <OfficeProvider
      locale={params.locale}
      initialData={{
        organization,
        branches,
        orgUsers,
        orgCustomers,
        orgCustomerCategories,
        branchSummaries: summaries,
        consolidatedTxs,
        consolidatedTxItems,
        consolidatedInventory,
        consolidatedMovements,
        consolidatedGrItems,
        consolidatedProducts,
        consolidatedProductComponents,
        consolidatedVendors,
        consolidatedCategories,
        masterDataLinks,
        primaryDataCounts,
        activeTenantId: session.tenantId,
      }}
    >
      <div className="erp-shell">
        <OfficeSidebar />
        <main className="erp-main">
          {children}
        </main>
        <div className="erp-watermark">AyaKasir by Petalytix | 2026</div>
      </div>
    </OfficeProvider>
  );
}
