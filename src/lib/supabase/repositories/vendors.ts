import { SupabaseClient } from "@supabase/supabase-js";
import { DbVendor } from "../types";

export async function getVendors(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");
  if (error) throw error;
  return data as DbVendor[];
}

export async function createVendor(supabase: SupabaseClient, vendor: Omit<DbVendor, "sync_status">) {
  const { data, error } = await supabase
    .from("vendors")
    .insert({ ...vendor, sync_status: "SYNCED" })
    .select()
    .single();
  if (error) throw error;
  return data as DbVendor;
}

export async function updateVendor(supabase: SupabaseClient, id: string, updates: Partial<DbVendor>) {
  const { data, error } = await supabase
    .from("vendors")
    .update({ ...updates, updated_at: Date.now(), sync_status: "SYNCED" })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as DbVendor;
}

export async function deleteVendor(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("vendors").delete().eq("id", id);
  if (error) throw error;
}
