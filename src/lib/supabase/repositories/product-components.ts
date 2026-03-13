import { SupabaseClient } from "@supabase/supabase-js";
import { DbProductComponent } from "../types";

export async function getProductComponents(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from("product_components")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("sort_order");
  if (error) throw error;
  return data as DbProductComponent[];
}

export async function deleteComponentsByProductId(supabase: SupabaseClient, productId: string) {
  // Delete rows where the raw material is this product (component_product_id)
  await supabase.from("product_components").delete().eq("component_product_id", productId);
  // Also delete rows where this product is the parent
  await supabase.from("product_components").delete().eq("parent_product_id", productId);
}

export async function setProductComponents(
  supabase: SupabaseClient,
  parentProductId: string,
  components: Omit<DbProductComponent, "sync_status">[]
) {
  // Delete existing components for this parent
  await supabase
    .from("product_components")
    .delete()
    .eq("parent_product_id", parentProductId);

  if (components.length === 0) return [];

  // Insert new ones one by one (matching mobile push pattern)
  const results: DbProductComponent[] = [];
  for (const comp of components) {
    const { data, error } = await supabase
      .from("product_components")
      .insert({ ...comp, sync_status: "SYNCED" })
      .select()
      .single();
    if (error) throw error;
    results.push(data as DbProductComponent);
  }
  return results;
}
