import { SupabaseClient } from "@supabase/supabase-js";
import { DbVariant } from "../types";

export async function getVariants(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from("variants")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");
  if (error) throw error;
  return data as DbVariant[];
}

export async function getVariantsByProduct(supabase: SupabaseClient, productId: string) {
  const { data, error } = await supabase
    .from("variants")
    .select("*")
    .eq("product_id", productId)
    .order("name");
  if (error) throw error;
  return data as DbVariant[];
}

export async function createVariant(supabase: SupabaseClient, variant: Omit<DbVariant, "sync_status">) {
  const { data, error } = await supabase
    .from("variants")
    .insert({ ...variant, sync_status: "SYNCED" })
    .select()
    .single();
  if (error) throw error;
  return data as DbVariant;
}

export async function updateVariant(supabase: SupabaseClient, id: string, updates: Partial<DbVariant>) {
  const { data, error } = await supabase
    .from("variants")
    .update({ ...updates, updated_at: Date.now(), sync_status: "SYNCED" })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as DbVariant;
}

export async function deleteVariant(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("variants").delete().eq("id", id);
  if (error) throw error;
}
