"use client";

import { useEffect, useMemo } from "react";
import { createBrowserClient } from "./client";
import { TENANT_TABLES, TenantTable } from "./types";
import type { RealtimePostgresChangesPayload, REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";

type ChangeHandler = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
export type RealtimeStatus = "CONNECTING" | "SUBSCRIBED" | "DISCONNECTED";

export function useRealtimeSync(
  tenantId: string | null,
  handlers: Partial<Record<TenantTable | "tenants", ChangeHandler>>,
  onStatusChange?: (status: RealtimeStatus) => void
) {
  const supabase = useMemo(() => createBrowserClient(), []);

  useEffect(() => {
    if (!tenantId) return;

    onStatusChange?.("CONNECTING");
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

    channel.subscribe((status: `${REALTIME_SUBSCRIBE_STATES}`, err?: Error) => {
      if (status === "SUBSCRIBED") {
        onStatusChange?.("SUBSCRIBED");
      } else if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        onStatusChange?.("DISCONNECTED");
        if (err) console.warn("[realtime] channel error:", err.message);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);
}
