import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { ErpProvider } from "@/components/ayakasir/erp/store";
import ErpSidebar from "@/components/ayakasir/erp/ErpSidebar";
import { getErpSession } from "@/lib/erp-auth";
import type { DbTenant, DbUser } from "@/lib/supabase/types";
import { getPlanLimits } from "@/lib/ayakasir-plan";
import type { TenantPlan } from "@/lib/supabase/types";

function getServerBasePath() {
  const host = headers().get("host") || "";
  // On the subdomain, middleware rewrites — browser paths have no /ayakasir prefix
  if (host.startsWith("ayakasir.") || host.startsWith("ayakasir:")) return "";
  // On localhost or non-subdomain hosts, the /ayakasir prefix is in the real URL
  return "/ayakasir";
}

// Initial load fetches only the last DATA_WINDOW_DAYS of time-based tables.
// Screens that need older data call fetchOlderErpData() server action and dispatch MERGE_OLDER.
const DATA_WINDOW_DAYS = 90;

async function fetchErpData(supabase: ReturnType<typeof createAdminClient>, tenantId: string) {
  const windowStart = Date.now() - DATA_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  // Static tables (load all) and time-based tables (load last 90 days) in parallel.
  // goods_receiving_items and transaction_items have no date column — fetched by parent IDs below.
  const [
    categories,
    products,
    variants,
    inventory,
    productComponents,
    vendors,
    customers,
    customerCategories,
    tenantUsers,
    variantGroups,
    variantGroupValues,
    // Time-based
    goodsReceivings,
    transactions,
    cashWithdrawals,
    generalLedger,
    inventoryMovements,
    cashierSessions,
  ] = await Promise.all([
    // Static
    supabase.from("categories").select("*").eq("tenant_id", tenantId).order("sort_order"),
    supabase.from("products").select("*").eq("tenant_id", tenantId).order("name"),
    supabase.from("variants").select("*").eq("tenant_id", tenantId),
    supabase.from("inventory").select("*").eq("tenant_id", tenantId),
    supabase.from("product_components").select("*").eq("tenant_id", tenantId).order("sort_order"),
    supabase.from("vendors").select("*").eq("tenant_id", tenantId).order("name"),
    supabase.from("customers").select("*").eq("tenant_id", tenantId).order("name"),
    supabase.from("customer_categories").select("*").eq("tenant_id", tenantId).order("name"),
    supabase.from("users").select("*").eq("tenant_id", tenantId).order("name"),
    supabase.from("variant_groups").select("*").eq("tenant_id", tenantId).order("name"),
    supabase.from("variant_group_values").select("*").eq("tenant_id", tenantId).order("sort_order"),
    // Time-based (windowed)
    supabase.from("goods_receiving").select("*").eq("tenant_id", tenantId).gte("date", windowStart).order("date", { ascending: false }),
    supabase.from("transactions").select("*").eq("tenant_id", tenantId).gte("date", windowStart).order("date", { ascending: false }),
    supabase.from("cash_withdrawals").select("*").eq("tenant_id", tenantId).gte("date", windowStart).order("date", { ascending: false }),
    supabase.from("general_ledger").select("*").eq("tenant_id", tenantId).gte("date", windowStart).order("date", { ascending: false }),
    supabase.from("inventory_movements").select("*").eq("tenant_id", tenantId).gte("date", windowStart).order("date", { ascending: false }),
    supabase.from("cashier_sessions").select("*").eq("tenant_id", tenantId).gte("opened_at", windowStart).order("opened_at", { ascending: false }),
  ]);

  // Fetch child records by parent IDs (no date column — no independent windowing)
  const txIds = (transactions.data || []).map((t: { id: string }) => t.id);
  const grIds = (goodsReceivings.data || []).map((r: { id: string }) => r.id);

  const [transactionItems, goodsReceivingItems] = await Promise.all([
    txIds.length > 0
      ? supabase.from("transaction_items").select("*").in("transaction_id", txIds)
      : Promise.resolve({ data: [] }),
    grIds.length > 0
      ? supabase.from("goods_receiving_items").select("*").in("receiving_id", grIds)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    categories: categories.data || [],
    products: products.data || [],
    variants: variants.data || [],
    inventory: inventory.data || [],
    productComponents: productComponents.data || [],
    vendors: vendors.data || [],
    goodsReceivings: goodsReceivings.data || [],
    goodsReceivingItems: goodsReceivingItems.data || [],
    transactions: transactions.data || [],
    transactionItems: transactionItems.data || [],
    cashWithdrawals: cashWithdrawals.data || [],
    generalLedger: generalLedger.data || [],
    customers: customers.data || [],
    customerCategories: customerCategories.data || [],
    inventoryMovements: inventoryMovements.data || [],
    tenantUsers: tenantUsers.data || [],
    cashierSessions: cashierSessions.data || [],
    variantGroups: variantGroups.data || [],
    variantGroupValues: variantGroupValues.data || [],
    dataWindowStart: windowStart,
  };
}

export default async function ErpLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const supabase = createAdminClient();
  const base = getServerBasePath();

  const session = await getErpSession();

  if (!session) {
    redirect(`${base}/${params.locale}/app/login`);
  }

  // Get the user record from public.users
  const { data: dbUser } = await supabase
    .from("users")
    .select("*")
    .eq("id", session.userId)
    .single();

  if (!dbUser || !dbUser.is_active) {
    redirect(`${base}/${params.locale}/app/login`);
  }

  const typedUser = dbUser as DbUser;
  const tenantId = typedUser.tenant_id || session.tenantId;

  if (!tenantId) {
    redirect(`${base}/${params.locale}/app/login`);
  }

  // Get restaurant info
  const { data: restaurant } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single();

  // For OWNER with an org + plan that allows Office: fetch all org branches
  let orgBranches: DbTenant[] = [];
  const orgId = session.organizationId;
  if (typedUser.role === "OWNER" && orgId) {
    const restaurantData = restaurant as DbTenant | null;
    const planExpired =
      restaurantData?.plan_expires_at != null && Date.now() > restaurantData.plan_expires_at;
    const effectivePlan = planExpired ? "PERINTIS" : (restaurantData?.plan ?? "PERINTIS") as TenantPlan;
    const limits = getPlanLimits(effectivePlan);
    // Fetch branches whenever Office is accessible (maxBranches > 1),
    // even if only 1 branch exists — owner needs to reach Office to add more.
    if (limits.maxBranches > 1) {
      const { data: branches } = await supabase
        .from("tenants")
        .select("*")
        .eq("organization_id", orgId)
        .order("is_primary", { ascending: false });
      orgBranches = (branches || []) as DbTenant[];
    }
  }

  // Fetch all ERP data
  const erpData = await fetchErpData(supabase, tenantId);

  // If a CUSTOMERS master data link exists for this branch, also load org-scoped customers
  const orgIdForCustomers = orgId ?? (restaurant as DbTenant | null)?.organization_id ?? null;
  if (orgIdForCustomers) {
    const { data: customersLink } = await supabase
      .from("master_data_links")
      .select("id")
      .eq("target_tenant_id", tenantId)
      .eq("data_type", "CUSTOMERS")
      .limit(1);

    if (customersLink && customersLink.length > 0) {
      const [orgCustomersRes, orgCustCatsRes] = await Promise.all([
        supabase.from("customers").select("*").eq("organization_id", orgIdForCustomers).order("name"),
        supabase.from("customer_categories").select("*").eq("organization_id", orgIdForCustomers).order("name"),
      ]);
      // Merge: org-scoped + tenant-scoped, deduplicated by id
      const merged = new Map<string, unknown>();
      for (const c of [...(erpData.customers), ...(orgCustomersRes.data || [])]) {
        merged.set((c as { id: string }).id, c);
      }
      const mergedCats = new Map<string, unknown>();
      for (const c of [...(erpData.customerCategories), ...(orgCustCatsRes.data || [])]) {
        mergedCats.set((c as { id: string }).id, c);
      }
      erpData.customers = Array.from(merged.values()) as typeof erpData.customers;
      erpData.customerCategories = Array.from(mergedCats.values()) as typeof erpData.customerCategories;
    }
  }

  return (
    <ErpProvider
      tenantId={tenantId}
      organizationId={orgIdForCustomers ?? undefined}
      locale={params.locale}
      initialData={{
        restaurant: (restaurant as DbTenant) || null,
        user: typedUser,
        orgBranches,
        ...erpData,
      }}
    >
      <div className="erp-shell">
        <ErpSidebar />
        <main className="erp-main">
          {children}
        </main>
        <div className="erp-watermark">AyaKasir by Petalytix | 2026</div>
      </div>
    </ErpProvider>
  );
}
