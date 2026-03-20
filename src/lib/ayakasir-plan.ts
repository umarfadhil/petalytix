import type { TenantPlan } from "@/lib/supabase/types";

// Keep in sync with repos/ayakasir/app/build.gradle.kts → versionName
export const APP_VERSION = "1.2.3";

export type { TenantPlan };

export interface PlanLimits {
  maxProducts: number;
  maxCustomers: number;
  maxRawMaterials: number;
  maxTransactionsPerMonth: number;
  maxStaff: number; // excludes owner
  allowUtang: boolean;
}

export const PLAN_LIMITS: Record<TenantPlan, PlanLimits> = {
  PERINTIS: {
    maxProducts: 100,
    maxCustomers: 100,
    maxRawMaterials: 100,
    maxTransactionsPerMonth: 1000,
    maxStaff: 1,
    allowUtang: true,
  },
  TUMBUH: {
    maxProducts: 300,
    maxCustomers: 300,
    maxRawMaterials: 300,
    maxTransactionsPerMonth: 6000,
    maxStaff: 2,
    allowUtang: true,
  },
  MAPAN: {
    maxProducts: Infinity,
    maxCustomers: Infinity,
    maxRawMaterials: Infinity,
    maxTransactionsPerMonth: Infinity,
    maxStaff: Infinity,
    allowUtang: true,
  },
};

export function getPlanLimits(plan: TenantPlan): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.PERINTIS;
}
