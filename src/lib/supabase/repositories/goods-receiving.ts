import { SupabaseClient } from "@supabase/supabase-js";
import { DbGoodsReceiving, DbGoodsReceivingItem } from "../types";

export async function getGoodsReceivings(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from("goods_receiving")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("date", { ascending: false });
  if (error) throw error;
  return data as DbGoodsReceiving[];
}

export async function getGoodsReceivingItems(supabase: SupabaseClient, tenantId: string) {
  const { data, error } = await supabase
    .from("goods_receiving_items")
    .select("*")
    .eq("tenant_id", tenantId);
  if (error) throw error;
  return data as DbGoodsReceivingItem[];
}

export async function getGoodsReceivingItemsByReceivingId(supabase: SupabaseClient, receivingId: string) {
  const { data, error } = await supabase
    .from("goods_receiving_items")
    .select("*")
    .eq("receiving_id", receivingId);
  if (error) throw error;
  return data as DbGoodsReceivingItem[];
}

export async function createGoodsReceiving(
  supabase: SupabaseClient,
  header: Omit<DbGoodsReceiving, "sync_status">,
  items: Omit<DbGoodsReceivingItem, "sync_status">[]
) {
  // Insert header
  const { data: headerData, error: headerError } = await supabase
    .from("goods_receiving")
    .insert({ ...header, sync_status: "SYNCED" })
    .select()
    .single();
  if (headerError) throw headerError;

  // Insert items one by one
  const insertedItems: DbGoodsReceivingItem[] = [];
  for (const item of items) {
    const { data, error } = await supabase
      .from("goods_receiving_items")
      .insert({ ...item, sync_status: "SYNCED" })
      .select()
      .single();
    if (error) throw error;
    insertedItems.push(data as DbGoodsReceivingItem);
  }

  return { header: headerData as DbGoodsReceiving, items: insertedItems };
}

export async function updateGoodsReceiving(
  supabase: SupabaseClient,
  header: Omit<DbGoodsReceiving, "sync_status">,
  items: Omit<DbGoodsReceivingItem, "sync_status">[]
) {
  const { data: headerData, error: headerError } = await supabase
    .from("goods_receiving")
    .update({ vendor_id: header.vendor_id, notes: header.notes, updated_at: header.updated_at })
    .eq("id", header.id)
    .select()
    .single();
  if (headerError) throw headerError;

  // Delete old items then re-insert new ones
  const { error: delError } = await supabase
    .from("goods_receiving_items")
    .delete()
    .eq("receiving_id", header.id);
  if (delError) throw delError;

  const insertedItems: DbGoodsReceivingItem[] = [];
  for (const item of items) {
    const { data, error } = await supabase
      .from("goods_receiving_items")
      .insert({ ...item, sync_status: "SYNCED" })
      .select()
      .single();
    if (error) throw error;
    insertedItems.push(data as DbGoodsReceivingItem);
  }

  return { header: headerData as DbGoodsReceiving, items: insertedItems };
}

export async function deleteGoodsReceiving(supabase: SupabaseClient, id: string) {
  // Items cascade-delete via FK
  const { error } = await supabase.from("goods_receiving").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteGoodsReceivingItemsByProductId(supabase: SupabaseClient, productId: string) {
  const { error } = await supabase.from("goods_receiving_items").delete().eq("product_id", productId);
  if (error) throw error;
}
