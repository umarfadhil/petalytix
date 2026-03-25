import { useMemo } from "react";
import { useErp } from "./store";
import { getPlanLimits } from "@/lib/ayakasir-plan";
import type { TenantPlan } from "@/lib/ayakasir-plan";

export function usePlanLimits() {
  const { state } = useErp();

  return useMemo(() => {
    const raw = state.restaurant?.plan || "PERINTIS";
    const planExpired =
      state.restaurant?.plan_expires_at != null &&
      Date.now() > state.restaurant.plan_expires_at;
    const plan: TenantPlan = planExpired ? "PERINTIS" : (raw as TenantPlan);
    const limits = getPlanLimits(plan);

    const menuProducts = state.products.filter(
      (p) => p.product_type === "MENU_ITEM"
    );
    const rawMaterials = state.products.filter(
      (p) => p.product_type === "RAW_MATERIAL"
    );
    const staff = state.tenantUsers.filter((u) => u.role === "CASHIER");

    const now = new Date();
    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    ).getTime();
    const monthlyTxCount = state.transactions.filter(
      (t) => t.date >= monthStart && t.status === "COMPLETED"
    ).length;

    const daysUntilExpiry = state.restaurant?.plan_expires_at != null
      ? Math.max(0, Math.ceil((state.restaurant.plan_expires_at - Date.now()) / (1000 * 60 * 60 * 24)))
      : Infinity;

    const rawCategories = state.categories.filter((c) => c.category_type === "RAW_MATERIAL");

    return {
      plan,
      planExpired,
      daysUntilExpiry,
      limits,
      counts: {
        products: menuProducts.length,
        customers: state.customers.length,
        rawMaterials: rawMaterials.length,
        monthlyTransactions: monthlyTxCount,
        staff: staff.length,
        vendors: state.vendors.length,
        goodsReceivings: state.goodsReceivings.length,
        rawCategories: rawCategories.length,
        variantGroups: state.variantGroups.length,
      },
      canAddProduct: menuProducts.length < limits.maxProducts,
      canAddCustomer: state.customers.length < limits.maxCustomers,
      canAddRawMaterial: rawMaterials.length < limits.maxRawMaterials,
      canTransact: monthlyTxCount < limits.maxTransactionsPerMonth,
      canAddStaff: staff.length < limits.maxStaff,
      canUseUtang: limits.allowUtang,
      canAddVendor: state.vendors.length < limits.maxVendors,
      canAddReceiving: state.goodsReceivings.length < limits.maxGoodsReceivings,
      canAddRawCategory: rawCategories.length < limits.maxRawCategories,
      canAddVariantGroup: state.variantGroups.length < limits.maxVariantGroups,
    };
  }, [state.restaurant, state.products, state.customers, state.tenantUsers, state.transactions, state.vendors, state.goodsReceivings, state.categories, state.variantGroups]);
}
