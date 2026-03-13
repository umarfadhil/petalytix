import { SupabaseClient } from "@supabase/supabase-js";
import { DbCategory } from "../types";

export async function getCategories(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("sort_order");
  if (error) throw error;
  return data as DbCategory[];
}

export async function createCategory(supabase: SupabaseClient, category: Omit<DbCategory, "sync_status">) {
  const { data, error } = await supabase
    .from("categories")
    .insert({ ...category, sync_status: "SYNCED" })
    .select()
    .single();
  if (error) throw error;
  return data as DbCategory;
}

export async function updateCategory(supabase: SupabaseClient, id: string, updates: Partial<DbCategory>) {
  const { data, error } = await supabase
    .from("categories")
    .update({ ...updates, updated_at: Date.now(), sync_status: "SYNCED" })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as DbCategory;
}

export async function deleteCategory(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}
