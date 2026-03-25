import type { TenantPlan } from "@/lib/supabase/types";

// Keep in sync with repos/ayakasir/app/build.gradle.kts → versionName
export const APP_VERSION = "1.3.4";

export type { TenantPlan };

export interface PlanLimits {
  maxProducts: number;
  maxCustomers: number;
  maxRawMaterials: number;
  maxTransactionsPerMonth: number;
  maxStaff: number; // excludes owner
  allowUtang: boolean;
  maxVendors: number;
  maxGoodsReceivings: number;
  maxRawCategories: number;
  maxVariantGroups: number;
}

export const PLAN_LIMITS: Record<TenantPlan, PlanLimits> = {
  PERINTIS: {
    maxProducts: 100,
    maxCustomers: 100,
    maxRawMaterials: 100,
    maxTransactionsPerMonth: 1000,
    maxStaff: 1,
    allowUtang: true,
    maxVendors: 100,
    maxGoodsReceivings: 100,
    maxRawCategories: 100,
    maxVariantGroups: 100,
  },
  TUMBUH: {
    maxProducts: 300,
    maxCustomers: 300,
    maxRawMaterials: 300,
    maxTransactionsPerMonth: 6000,
    maxStaff: 2,
    allowUtang: true,
    maxVendors: 300,
    maxGoodsReceivings: 300,
    maxRawCategories: 300,
    maxVariantGroups: 300,
  },
  MAPAN: {
    maxProducts: Infinity,
    maxCustomers: Infinity,
    maxRawMaterials: Infinity,
    maxTransactionsPerMonth: Infinity,
    maxStaff: Infinity,
    allowUtang: true,
    maxVendors: Infinity,
    maxGoodsReceivings: Infinity,
    maxRawCategories: Infinity,
    maxVariantGroups: Infinity,
  },
};

export function getPlanLimits(plan: TenantPlan): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.PERINTIS;
}
