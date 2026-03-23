import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { ErpProvider } from "@/components/ayakasir/erp/store";
import ErpSidebar from "@/components/ayakasir/erp/ErpSidebar";
import { getErpSession } from "@/lib/erp-auth";
import type { DbTenant, DbUser } from "@/lib/supabase/types";

function getServerBasePath() {
  const host = headers().get("host") || "";
  // On the subdomain, middleware rewrites — browser paths have no /ayakasir prefix
  if (host.startsWith("ayakasir.") || host.startsWith("ayakasir:")) return "";
  // On localhost or non-subdomain hosts, the /ayakasir prefix is in the real URL
  return "/ayakasir";
}

async function fetchErpData(supabase: ReturnType<typeof createAdminClient>, tenantId: string) {
  const [
    categories,
    products,
    variants,
    inventory,
    productComponents,
    vendors,
    goodsReceivings,
    goodsReceivingItems,
    transactions,
    transactionItems,
    cashWithdrawals,
    generalLedger,
    customers,
    customerCategories,
    inventoryMovements,
    tenantUsers,
    cashierSessions,
    variantGroups,
    variantGroupValues,
  ] = await Promise.all([
    supabase.from("categories").select("*").eq("tenant_id", tenantId).order("sort_order"),
    supabase.from("products").select("*").eq("tenant_id", tenantId).order("name"),
    supabase.from("variants").select("*").eq("tenant_id", tenantId),
    supabase.from("inventory").select("*").eq("tenant_id", tenantId),
    supabase.from("product_components").select("*").eq("tenant_id", tenantId).order("sort_order"),
    supabase.from("vendors").select("*").eq("tenant_id", tenantId).order("name"),
    supabase.from("goods_receiving").select("*").eq("tenant_id", tenantId).order("date", { ascending: false }),
    supabase.from("goods_receiving_items").select("*").eq("tenant_id", tenantId),
    supabase.from("transactions").select("*").eq("tenant_id", tenantId).order("date", { ascending: false }),
    supabase.from("transaction_items").select("*").eq("tenant_id", tenantId),
    supabase.from("cash_withdrawals").select("*").eq("tenant_id", tenantId).order("date", { ascending: false }),
    supabase.from("general_ledger").select("*").eq("tenant_id", tenantId).order("date", { ascending: false }),
    supabase.from("customers").select("*").eq("tenant_id", tenantId).order("name"),
    supabase.from("customer_categories").select("*").eq("tenant_id", tenantId).order("name"),
    supabase.from("inventory_movements").select("*").eq("tenant_id", tenantId).order("date", { ascending: false }),
    supabase.from("users").select("*").eq("tenant_id", tenantId).order("name"),
    supabase.from("cashier_sessions").select("*").eq("tenant_id", tenantId).order("opened_at", { ascending: false }),
    supabase.from("variant_groups").select("*").eq("tenant_id", tenantId).order("name"),
    supabase.from("variant_group_values").select("*").eq("tenant_id", tenantId).order("sort_order"),
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

  // Fetch all ERP data
  const erpData = await fetchErpData(supabase, tenantId);

  return (
    <ErpProvider
      tenantId={tenantId}
      locale={params.locale}
      initialData={{
        restaurant: (restaurant as DbTenant) || null,
        user: typedUser,
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
