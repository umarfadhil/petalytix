import { SupabaseClient } from "@supabase/supabase-js";
import { DbInventoryMovement } from "../types";

export async function getInventoryMovements(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from("inventory_movements")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("date", { ascending: false });
  if (error) throw error;
  return data as DbInventoryMovement[];
}

export async function createInventoryMovement(
  supabase: SupabaseClient,
  entry: Omit<DbInventoryMovement, "sync_status">
) {
  const { data, error } = await supabase
    .from("inventory_movements")
    .insert({ ...entry, sync_status: "SYNCED" })
    .select()
    .single();
  if (error) throw error;
  return data as DbInventoryMovement;
}
