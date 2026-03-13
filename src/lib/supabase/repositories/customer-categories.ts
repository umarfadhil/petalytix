import { SupabaseClient } from "@supabase/supabase-js";
import { DbCustomerCategory } from "../types";

export async function getCustomerCategories(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from("customer_categories")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");
  if (error) throw error;
  return data as DbCustomerCategory[];
}

export async function createCustomerCategory(
  supabase: SupabaseClient,
  tenantId: string,
  name: string,
  id: string
) {
  const now = Date.now();
  const { data, error } = await supabase
    .from("customer_categories")
    .insert({ id, tenant_id: tenantId, name, sync_status: "SYNCED", updated_at: now })
    .select()
    .single();
  if (error) throw error;
  return data as DbCustomerCategory;
}

export async function updateCustomerCategory(
  supabase: SupabaseClient,
  id: string,
  name: string
) {
  const { data, error } = await supabase
    .from("customer_categories")
    .update({ name, updated_at: Date.now(), sync_status: "SYNCED" })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as DbCustomerCategory;
}

export async function deleteCustomerCategory(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("customer_categories").delete().eq("id", id);
  if (error) throw error;
}
