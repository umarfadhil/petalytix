import type { ScenarioData } from "../types";

const now = Date.now();
const hour = 3600000;

// ─── Design ──────────────────────────────────────────────────────────────────
// Barbershop sells two kinds of things:
//   1. Services (Potong Biasa, Creambath, etc.) — no physical stock, no BOM
//   2. Retail products (Pomade, Shampoo, Hair Tonic) — sold as menu items,
//      each backed by a RAW_MATERIAL product (1 pcs BOM), tracked in inventory
//
// RAW_MATERIAL products are what get purchased from the vendor.
// MENU_ITEM products (same name) are what appear on the POS and get sold.
// When a Pomade (menu) is sold, BOM deducts 1 pcs from Pomade (raw material).
//
// Goods received: pomade-stok 10, shampoo-stok 5, hair-tonic-stok 6
// Sold today: pomade×1, shampoo×2
// Current stock: pomade-stok=9, shampoo-stok=3 (at min → low alert), hair-tonic-stok=6

export const servicesData: ScenarioData = {
  restaurantName: "Barbershop Keren",
  paymentMethods: { cash: true, qris: true, utang: false },

  categories: [
    { id: "cat-potong", name: "Potong Rambut", sortOrder: 0, categoryType: "MENU" },
    { id: "cat-perawatan", name: "Perawatan", sortOrder: 1, categoryType: "MENU" },
    { id: "cat-produk", name: "Produk", sortOrder: 2, categoryType: "MENU" },
    { id: "cat-stok-produk", name: "Produk Perawatan Rambut", sortOrder: 3, categoryType: "RAW_MATERIAL" },
  ],

  products: [
    // ── Menu: Services ──
    { id: "p-potong-biasa", categoryId: "cat-potong", name: "Potong Biasa", price: 35000, productType: "MENU_ITEM", isActive: true },
    { id: "p-potong-cuci", categoryId: "cat-potong", name: "Potong + Cuci", price: 50000, productType: "MENU_ITEM", isActive: true },
    { id: "p-cukur-jenggot", categoryId: "cat-potong", name: "Cukur Jenggot", price: 20000, productType: "MENU_ITEM", isActive: true },
    { id: "p-creambath", categoryId: "cat-perawatan", name: "Creambath", price: 75000, productType: "MENU_ITEM", isActive: true },
    { id: "p-hair-mask", categoryId: "cat-perawatan", name: "Hair Mask", price: 60000, productType: "MENU_ITEM", isActive: true },
    // ── Menu: Retail products (sellable, backed by raw material stock via BOM) ──
    { id: "p-pomade", categoryId: "cat-produk", name: "Pomade", price: 45000, productType: "MENU_ITEM", isActive: true },
    { id: "p-shampoo", categoryId: "cat-produk", name: "Shampoo", price: 35000, productType: "MENU_ITEM", isActive: true },
    { id: "p-hair-tonic", categoryId: "cat-produk", name: "Hair Tonic", price: 55000, productType: "MENU_ITEM", isActive: true },
    // ── Raw Materials: physical stock purchased from vendor ──
    { id: "p-pomade-stok", categoryId: "cat-stok-produk", name: "Pomade", price: 0, productType: "RAW_MATERIAL", isActive: true },
    { id: "p-shampoo-stok", categoryId: "cat-stok-produk", name: "Shampoo", price: 0, productType: "RAW_MATERIAL", isActive: true },
    { id: "p-hair-tonic-stok", categoryId: "cat-stok-produk", name: "Hair Tonic", price: 0, productType: "RAW_MATERIAL", isActive: true },
  ],

  // Selling a menu product consumes 1 pcs of its raw material counterpart
  productComponents: [
    { menuItemId: "p-pomade", rawMaterialId: "p-pomade-stok", qty: 1, unit: "pcs" },
    { menuItemId: "p-shampoo", rawMaterialId: "p-shampoo-stok", qty: 1, unit: "pcs" },
    { menuItemId: "p-hair-tonic", rawMaterialId: "p-hair-tonic-stok", qty: 1, unit: "pcs" },
  ],

  variants: [
    { id: "v-potong-dewasa", productId: "p-potong-biasa", name: "Dewasa", priceAdjustment: 0 },
    { id: "v-potong-anak", productId: "p-potong-biasa", name: "Anak", priceAdjustment: -10000 },
    { id: "v-cuci-dewasa", productId: "p-potong-cuci", name: "Dewasa", priceAdjustment: 0 },
    { id: "v-cuci-anak", productId: "p-potong-cuci", name: "Anak", priceAdjustment: -15000 },
  ],

  // Stock = purchased - sold via BOM
  // pomade-stok: 10-1=9, shampoo-stok: 5-2=3 (at min), hair-tonic-stok: 6-0=6
  inventory: [
    { productId: "p-pomade-stok", variantId: null, currentQty: 9, minQty: 3, unit: "pcs" },
    { productId: "p-shampoo-stok", variantId: null, currentQty: 3, minQty: 3, unit: "pcs" },
    { productId: "p-hair-tonic-stok", variantId: null, currentQty: 6, minQty: 3, unit: "pcs" },
  ],

  // tx-s1: Potong Biasa Dewasa(35000) + Shampoo(35000) = 70000 CASH
  // tx-s2: Potong + Cuci Dewasa(50000) = 50000 QRIS
  // tx-s3: Creambath(75000) + Pomade disc10%(40500) + Shampoo(35000) = 150500 CASH
  transactions: [
    { id: "tx-s1", date: now - 2 * hour, total: 70000, paymentMethod: "CASH", status: "COMPLETED" },
    { id: "tx-s2", date: now - hour, total: 50000, paymentMethod: "QRIS", status: "COMPLETED" },
    { id: "tx-s3", date: now - 0.3 * hour, total: 150500, paymentMethod: "CASH", status: "COMPLETED" },
  ],

  transactionItems: [
    { id: "ti-s1a", transactionId: "tx-s1", productId: "p-potong-biasa", variantId: "v-potong-dewasa", productName: "Potong Biasa", variantName: "Dewasa", qty: 1, unitPrice: 35000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 35000 },
    { id: "ti-s1b", transactionId: "tx-s1", productId: "p-shampoo", variantId: null, productName: "Shampoo", variantName: null, qty: 1, unitPrice: 35000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 35000 },
    { id: "ti-s2a", transactionId: "tx-s2", productId: "p-potong-cuci", variantId: "v-cuci-dewasa", productName: "Potong + Cuci", variantName: "Dewasa", qty: 1, unitPrice: 50000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 50000 },
    { id: "ti-s3a", transactionId: "tx-s3", productId: "p-creambath", variantId: null, productName: "Creambath", variantName: null, qty: 1, unitPrice: 75000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 75000 },
    { id: "ti-s3b", transactionId: "tx-s3", productId: "p-pomade", variantId: null, productName: "Pomade", variantName: null, qty: 1, unitPrice: 45000, discountType: "PERCENT", discountValue: 10, discountAmount: 4500, subtotal: 40500 },
    { id: "ti-s3c", transactionId: "tx-s3", productId: "p-shampoo", variantId: null, productName: "Shampoo", variantName: null, qty: 1, unitPrice: 35000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 35000 },
  ],

  ledger: [
    // 10×32k + 5×25k + 6×40k = 685k
    { id: "led-s0", type: "COGS", amount: -685000, referenceId: "gr-s1", description: "Goods receiving from Supplier Kosmetik & Grooming", date: now - 5 * 24 * hour },
    { id: "led-s1", type: "SALE", amount: 70000, referenceId: "tx-s1", description: "Sale #1", date: now - 2 * hour },
    { id: "led-s2", type: "SALE_QRIS", amount: 50000, referenceId: "tx-s2", description: "Sale #2", date: now - hour },
    { id: "led-s3", type: "SALE", amount: 150500, referenceId: "tx-s3", description: "Sale #3", date: now - 0.3 * hour },
  ],

  vendors: [
    { id: "vnd-s1", name: "Supplier Kosmetik & Grooming", phone: "08123344556", address: "Jl. Salon No. 3" },
  ],

  goodsReceivings: [
    {
      id: "gr-s1",
      vendorId: "vnd-s1",
      date: now - 5 * 24 * hour,
      // 10×32k + 5×25k + 6×40k = 685.000
      totalCost: 685000,
      items: [
        { productId: "p-pomade-stok", variantId: null, qty: 10, unit: "pcs" as const, unitCost: 32000 },
        { productId: "p-shampoo-stok", variantId: null, qty: 5, unit: "pcs" as const, unitCost: 25000 },
        { productId: "p-hair-tonic-stok", variantId: null, qty: 6, unit: "pcs" as const, unitCost: 40000 },
      ],
    },
  ],
};
