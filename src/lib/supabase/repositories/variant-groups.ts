import { SupabaseClient } from "@supabase/supabase-js";
import { DbVariantGroup, DbVariantGroupValue } from "../types";

// ── Variant Groups ────────────────────────────────────────────────────────────

export async function getVariantGroups(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from("variant_groups")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");
  if (error) throw error;
  return data as DbVariantGroup[];
}

export async function createVariantGroup(
  supabase: SupabaseClient,
  group: Omit<DbVariantGroup, "sync_status">
) {
  const { data, error } = await supabase
    .from("variant_groups")
    .insert({ ...group, sync_status: "SYNCED" })
    .select()
    .single();
  if (error) throw error;
  return data as DbVariantGroup;
}

export async function updateVariantGroup(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Pick<DbVariantGroup, "name">>
) {
  const { data, error } = await supabase
    .from("variant_groups")
    .update({ ...updates, updated_at: Date.now(), sync_status: "SYNCED" })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as DbVariantGroup;
}

export async function deleteVariantGroup(supabase: SupabaseClient, id: string) {
  // variant_group_values cascade-delete via FK
  const { error } = await supabase.from("variant_groups").delete().eq("id", id);
  if (error) throw error;
}

// ── Variant Group Values ──────────────────────────────────────────────────────

export async function getVariantGroupValues(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from("variant_group_values")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("sort_order");
  if (error) throw error;
  return data as DbVariantGroupValue[];
}

export async function createVariantGroupValue(
  supabase: SupabaseClient,
  value: Omit<DbVariantGroupValue, "sync_status">
) {
  const { data, error } = await supabase
    .from("variant_group_values")
    .insert({ ...value, sync_status: "SYNCED" })
    .select()
    .single();
  if (error) throw error;
  return data as DbVariantGroupValue;
}

export async function updateVariantGroupValue(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Pick<DbVariantGroupValue, "name" | "sort_order">>
) {
  const { data, error } = await supabase
    .from("variant_group_values")
    .update({ ...updates, updated_at: Date.now(), sync_status: "SYNCED" })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as DbVariantGroupValue;
}

export async function deleteVariantGroupValue(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("variant_group_values").delete().eq("id", id);
  if (error) throw error;
}
