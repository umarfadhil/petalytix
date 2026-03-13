import { SupabaseClient } from "@supabase/supabase-js";
import { DbTransaction, DbTransactionItem } from "../types";

export async function getTransactions(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("date", { ascending: false });
  if (error) throw error;
  return data as DbTransaction[];
}

export async function getTransactionItems(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from("transaction_items")
    .select("*")
    .eq("tenant_id", tenantId);
  if (error) throw error;
  return data as DbTransactionItem[];
}

export async function createTransaction(
  supabase: SupabaseClient,
  transaction: Omit<DbTransaction, "sync_status">,
  items: Omit<DbTransactionItem, "sync_status">[]
) {
  const { data: txData, error: txError } = await supabase
    .from("transactions")
    .insert({ ...transaction, sync_status: "SYNCED" })
    .select()
    .single();
  if (txError) throw txError;

  const insertedItems: DbTransactionItem[] = [];
  for (const item of items) {
    const { data, error } = await supabase
      .from("transaction_items")
      .insert({ ...item, sync_status: "SYNCED" })
      .select()
      .single();
    if (error) throw error;
    insertedItems.push(data as DbTransactionItem);
  }

  return { transaction: txData as DbTransaction, items: insertedItems };
}

export async function voidTransaction(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("transactions")
    .update({ status: "VOIDED", updated_at: Date.now(), sync_status: "SYNCED" })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as DbTransaction;
}

export async function settleDebt(
  supabase: SupabaseClient,
  id: string,
  paymentMethod: "CASH" | "QRIS" | "TRANSFER"
) {
  const { data, error } = await supabase
    .from("transactions")
    .update({
      payment_method: paymentMethod,
      debt_status: "SETTLED",
      updated_at: Date.now(),
      sync_status: "SYNCED",
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as DbTransaction;
}
