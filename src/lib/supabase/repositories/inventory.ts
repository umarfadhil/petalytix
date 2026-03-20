import { SupabaseClient } from "@supabase/supabase-js";
import { DbInventory } from "../types";

export async function getInventory(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .eq("tenant_id", tenantId);
  if (error) throw error;
  return data as DbInventory[];
}

export async function upsertInventory(supabase: SupabaseClient, item: Omit<DbInventory, "sync_status">) {
  const { data, error } = await supabase
    .from("inventory")
    .upsert({ ...item, sync_status: "SYNCED" }, { onConflict: "product_id,variant_id" })
    .select()
    .single();
  if (error) throw error;
  return data as DbInventory;
}

export async function updateMinQty(
  supabase: SupabaseClient,
  productId: string,
  variantId: string,
  minQty: number
) {
  let query = supabase
    .from("inventory")
    .update({ min_qty: minQty, updated_at: Date.now(), sync_status: "SYNCED" })
    .eq("product_id", productId);
  if (variantId === "" || variantId == null) {
    query = query.or("variant_id.is.null,variant_id.eq.");
  } else {
    query = query.eq("variant_id", variantId);
  }
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data as DbInventory;
}

export async function deleteInventoryByProductId(supabase: SupabaseClient, productId: string) {
  const { error } = await supabase.from("inventory").delete().eq("product_id", productId);
  if (error) throw error;
}

export async function deleteInventoryByProductVariant(
  supabase: SupabaseClient,
  productId: string,
  variantId: string
) {
  let query = supabase.from("inventory").delete().eq("product_id", productId);
  if (variantId === "" || variantId == null) {
    query = query.or("variant_id.is.null,variant_id.eq.");
  } else {
    query = query.eq("variant_id", variantId);
  }
  const { error } = await query;
  if (error) throw error;
}

export async function adjustInventory(
  supabase: SupabaseClient,
  productId: string,
  variantId: string,
  newQty: number,
  avgCogs?: number
) {
  // variant_id may be stored as NULL or "" in the DB — handle both
  const updates: Record<string, unknown> = {
    current_qty: newQty,
    updated_at: Date.now(),
    sync_status: "SYNCED",
  };
  if (avgCogs !== undefined) updates.avg_cogs = avgCogs;

  let query = supabase
    .from("inventory")
    .update(updates)
    .eq("product_id", productId);
  if (variantId === "" || variantId == null) {
    query = query.or("variant_id.is.null,variant_id.eq.");
  } else {
    query = query.eq("variant_id", variantId);
  }
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data as DbInventory;
}
