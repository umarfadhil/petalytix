import { SupabaseClient } from "@supabase/supabase-js";
import { DbProduct } from "../types";

export async function getProducts(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");
  if (error) throw error;
  return data as DbProduct[];
}

export async function createProduct(supabase: SupabaseClient, product: Omit<DbProduct, "sync_status">) {
  const { data, error } = await supabase
    .from("products")
    .insert({ ...product, sync_status: "SYNCED" })
    .select()
    .single();
  if (error) throw error;
  return data as DbProduct;
}

export async function updateProduct(supabase: SupabaseClient, id: string, updates: Partial<DbProduct>) {
  const { data, error } = await supabase
    .from("products")
    .update({ ...updates, updated_at: Date.now(), sync_status: "SYNCED" })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as DbProduct;
}

export async function deleteProduct(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}
