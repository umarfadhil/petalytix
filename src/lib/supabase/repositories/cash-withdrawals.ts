import { SupabaseClient } from "@supabase/supabase-js";
import { DbCashWithdrawal } from "../types";

export async function getCashWithdrawals(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from("cash_withdrawals")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("date", { ascending: false });
  if (error) throw error;
  return data as DbCashWithdrawal[];
}

export async function createCashWithdrawal(
  supabase: SupabaseClient,
  withdrawal: Omit<DbCashWithdrawal, "sync_status">
) {
  const { data, error } = await supabase
    .from("cash_withdrawals")
    .insert({ ...withdrawal, sync_status: "SYNCED" })
    .select()
    .single();
  if (error) throw error;
  return data as DbCashWithdrawal;
}

export async function deleteCashWithdrawal(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("cash_withdrawals").delete().eq("id", id);
  if (error) throw error;
}
