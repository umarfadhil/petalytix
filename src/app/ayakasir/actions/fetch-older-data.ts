"use server";

import { createAdminClient } from "@/lib/supabase/server-admin";
import { getErpSession } from "@/lib/erp-auth";

// Fetches time-based rows for dates in [fromMs, toMs).
// transaction_items and goods_receiving_items have no date — they are fetched
// by joining on the IDs of their parent records (transactions / goods_receiving)
// that fall within the window.
export async function fetchOlderErpData(tenantId: string, fromMs: number, toMs: number) {
  const session = await getErpSession();
  if (!session || session.tenantId !== tenantId) {
    throw new Error("Unauthorized");
  }

  const supabase = createAdminClient();

  // Fetch date-indexed tables first
  const [
    transactions,
    generalLedger,
    cashWithdrawals,
    goodsReceivings,
    inventoryMovements,
    cashierSessions,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("tenant_id", tenantId)
      .gte("date", fromMs)
      .lt("date", toMs)
      .order("date", { ascending: false }),
    supabase
      .from("general_ledger")
      .select("*")
      .eq("tenant_id", tenantId)
      .gte("date", fromMs)
      .lt("date", toMs)
      .order("date", { ascending: false }),
    supabase
      .from("cash_withdrawals")
      .select("*")
      .eq("tenant_id", tenantId)
      .gte("date", fromMs)
      .lt("date", toMs)
      .order("date", { ascending: false }),
    supabase
      .from("goods_receiving")
      .select("*")
      .eq("tenant_id", tenantId)
      .gte("date", fromMs)
      .lt("date", toMs)
      .order("date", { ascending: false }),
    supabase
      .from("inventory_movements")
      .select("*")
      .eq("tenant_id", tenantId)
      .gte("date", fromMs)
      .lt("date", toMs)
      .order("date", { ascending: false }),
    supabase
      .from("cashier_sessions")
      .select("*")
      .eq("tenant_id", tenantId)
      .gte("opened_at", fromMs)
      .lt("opened_at", toMs)
      .order("opened_at", { ascending: false }),
  ]);

  const txIds = (transactions.data || []).map((t) => t.id);
  const grIds = (goodsReceivings.data || []).map((r) => r.id);

  // Fetch child records by parent IDs (no date column on these tables)
  const [transactionItems, goodsReceivingItems] = await Promise.all([
    txIds.length > 0
      ? supabase.from("transaction_items").select("*").in("transaction_id", txIds)
      : Promise.resolve({ data: [] }),
    grIds.length > 0
      ? supabase.from("goods_receiving_items").select("*").in("receiving_id", grIds)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    transactions: transactions.data || [],
    transactionItems: transactionItems.data || [],
    generalLedger: generalLedger.data || [],
    cashWithdrawals: cashWithdrawals.data || [],
    goodsReceivings: goodsReceivings.data || [],
    goodsReceivingItems: goodsReceivingItems.data || [],
    inventoryMovements: inventoryMovements.data || [],
    cashierSessions: cashierSessions.data || [],
  };
}