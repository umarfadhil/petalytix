import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbCashierSession } from "../types";

export async function getCashierSessions(
  supabase: SupabaseClient,
  tenantId: string
): Promise<DbCashierSession[]> {
  const { data, error } = await supabase
    .from("cashier_sessions")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("opened_at", { ascending: false });
  if (error) throw error;
  return data as DbCashierSession[];
}

export async function openCashierSession(
  supabase: SupabaseClient,
  session: Omit<DbCashierSession, "closed_at" | "closing_balance" | "withdrawal_amount" | "match_status" | "mismatch_note">
): Promise<DbCashierSession> {
  const { data, error } = await supabase
    .from("cashier_sessions")
    .insert({ ...session, closed_at: null, closing_balance: null, withdrawal_amount: null, match_status: null, mismatch_note: null })
    .select()
    .single();
  if (error) throw error;
  return data as DbCashierSession;
}

export async function closeCashierSession(
  supabase: SupabaseClient,
  id: string,
  updates: {
    closed_at: number;
    closing_balance: number;
    withdrawal_amount: number | null;
    match_status: "MATCH" | "MISMATCH";
    mismatch_note: string | null;
    updated_at: number;
  }
): Promise<DbCashierSession> {
  const { data, error } = await supabase
    .from("cashier_sessions")
    .update({ ...updates, sync_status: "SYNCED" })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as DbCashierSession;
}
