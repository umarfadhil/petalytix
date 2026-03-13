import { SupabaseClient } from "@supabase/supabase-js";
import { DbCustomer } from "../types";

export async function getCustomers(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");
  if (error) throw error;
  return data as DbCustomer[];
}

export async function searchCustomers(
  supabase: SupabaseClient,
  tenantId: string,
  query: string
) {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("tenant_id", tenantId)
    .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
    .order("name")
    .limit(20);
  if (error) throw error;
  return data as DbCustomer[];
}

export async function createCustomer(
  supabase: SupabaseClient,
  customer: Omit<DbCustomer, "sync_status" | "created_at" | "updated_at">
) {
  const now = Date.now();
  const { data, error } = await supabase
    .from("customers")
    .insert({ ...customer, sync_status: "SYNCED", created_at: now, updated_at: now })
    .select()
    .single();
  if (error) throw error;
  return data as DbCustomer;
}

export async function updateCustomer(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Pick<DbCustomer, "name" | "phone" | "email" | "birthday" | "gender" | "category_id" | "notes">>
) {
  const { data, error } = await supabase
    .from("customers")
    .update({ ...patch, updated_at: Date.now(), sync_status: "SYNCED" })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as DbCustomer;
}

export async function deleteCustomer(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw error;
}
