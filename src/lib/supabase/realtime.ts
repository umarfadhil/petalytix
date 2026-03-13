"use client";

import { useEffect, useMemo } from "react";
import { createBrowserClient } from "./client";
import { TENANT_TABLES, TenantTable } from "./types";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type ChangeHandler = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;

export function useRealtimeSync(
  tenantId: string | null,
  handlers: Partial<Record<TenantTable | "tenants", ChangeHandler>>
) {
  const supabase = useMemo(() => createBrowserClient(), []);

  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase.channel(`erp:${tenantId}`);

    // Subscribe to all tenant tables filtered by tenant_id
    for (const table of TENANT_TABLES) {
      const handler = handlers[table];
      if (!handler) continue;
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `tenant_id=eq.${tenantId}`,
        },
        handler
      );
    }

    // Subscribe to the tenants table filtered by id
    if (handlers.tenants) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tenants",
          filter: `id=eq.${tenantId}`,
        },
        handlers.tenants
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);
}
