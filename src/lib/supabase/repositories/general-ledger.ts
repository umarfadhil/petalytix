import { SupabaseClient } from "@supabase/supabase-js";
import { DbGeneralLedger } from "../types";

export async function getGeneralLedger(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from("general_ledger")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("date", { ascending: false });
  if (error) throw error;
  return data as DbGeneralLedger[];
}

export async function createLedgerEntry(
  supabase: SupabaseClient,
  entry: Omit<DbGeneralLedger, "sync_status">
) {
  const { data, error } = await supabase
    .from("general_ledger")
    .insert({ ...entry, sync_status: "SYNCED" })
    .select()
    .single();
  if (error) throw error;
  return data as DbGeneralLedger;
}

export async function deleteLedgerByReferenceId(supabase: SupabaseClient, referenceId: string) {
  const { error } = await supabase
    .from("general_ledger")
    .delete()
    .eq("reference_id", referenceId);
  if (error) throw error;
}

export async function deleteInitialBalanceEntries(supabase: SupabaseClient, tenantId: string) {
  const { error } = await supabase
    .from("general_ledger")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("type", "INITIAL_BALANCE");
  if (error) throw error;
}

/**
 * Saldo Kas — mirrors GeneralLedgerDao.getBalance() in the mobile app exactly:
 *   INITIAL_BALANCE + SALE + WITHDRAWAL + ADJUSTMENT
 *
 * DEBT_SETTLED is intentionally excluded (mobile app does not include it).
 * Saldo Kas tracks physical cash from sales, not debt settlement receipts.
 */
export function calculateCashBalance(ledger: DbGeneralLedger[]): number {
  const CASH_TYPES = ["INITIAL_BALANCE", "SALE", "WITHDRAWAL", "ADJUSTMENT"];
  return ledger
    .filter((e) => CASH_TYPES.includes(e.type))
    .reduce((sum, e) => sum + e.amount, 0);
}
