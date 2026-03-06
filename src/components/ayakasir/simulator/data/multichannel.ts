import type { ScenarioData } from "../types";

const now = Date.now();
const hour = 3600000;

// Goods received: Biji Kopi 2kg (=2000g), Susu Segar 4L (=4000mL)
// Sales consumed raw materials:
//   Americano (18g kopi) ×1 = 18g
//   Latte (18g kopi + 150mL susu) ×1 = 18g + 150mL
//   Cappuccino (18g kopi + 100mL susu) ×1 = 18g + 100mL
//   Espresso (14g kopi) ×1 = 14g
//   Matcha (200mL susu) ×1 = 200mL
// Total consumed: kopi 68g, susu 450mL
// Current stock: kopi = 2000-68 = 1932g, susu = 4000-450 = 3550mL
// Physical products: croissant purchased 10, sold 1 → 9; cheesecake purchased 8, sold 1 → 7
// Merch: tumbler purchased 5, sold 1 → 4; totebag purchased 10, sold 0 → 10

export const multichannelData: ScenarioData = {
  restaurantName: "Kopi Nusantara",
  paymentMethods: { cash: true, qris: true, utang: false },

  categories: [
    { id: "cat-coffee", name: "Coffee", sortOrder: 0, categoryType: "MENU" },
    { id: "cat-noncoffee", name: "Non-Coffee", sortOrder: 1, categoryType: "MENU" },
    { id: "cat-pastry", name: "Pastry", sortOrder: 2, categoryType: "MENU" },
    { id: "cat-merch", name: "Merchandise", sortOrder: 3, categoryType: "MENU" },
    { id: "cat-bahan-kopi", name: "Bahan Kopi & Susu", sortOrder: 4, categoryType: "RAW_MATERIAL" },
  ],

  products: [
    { id: "p-americano", categoryId: "cat-coffee", name: "Americano", price: 18000, productType: "MENU_ITEM", isActive: true },
    { id: "p-latte", categoryId: "cat-coffee", name: "Latte", price: 25000, productType: "MENU_ITEM", isActive: true },
    { id: "p-cappuccino", categoryId: "cat-coffee", name: "Cappuccino", price: 25000, productType: "MENU_ITEM", isActive: true },
    { id: "p-espresso", categoryId: "cat-coffee", name: "Espresso", price: 15000, productType: "MENU_ITEM", isActive: true },
    { id: "p-matcha", categoryId: "cat-noncoffee", name: "Matcha Latte", price: 28000, productType: "MENU_ITEM", isActive: true },
    { id: "p-chocolate", categoryId: "cat-noncoffee", name: "Hot Chocolate", price: 22000, productType: "MENU_ITEM", isActive: true },
    { id: "p-croissant", categoryId: "cat-pastry", name: "Croissant", price: 22000, productType: "MENU_ITEM", isActive: true },
    { id: "p-cheesecake", categoryId: "cat-pastry", name: "Cheesecake", price: 35000, productType: "MENU_ITEM", isActive: true },
    { id: "p-tumbler", categoryId: "cat-merch", name: "Tumbler", price: 85000, productType: "MENU_ITEM", isActive: true },
    { id: "p-totebag", categoryId: "cat-merch", name: "Tote Bag", price: 45000, productType: "MENU_ITEM", isActive: true },
    { id: "p-biji-kopi", categoryId: "cat-bahan-kopi", name: "Biji Kopi Arabica", price: 0, productType: "RAW_MATERIAL", isActive: true },
    { id: "p-susu", categoryId: "cat-bahan-kopi", name: "Susu Segar", price: 0, productType: "RAW_MATERIAL", isActive: true },
  ],

  productComponents: [
    // Americano: Biji Kopi 18g
    { menuItemId: "p-americano", rawMaterialId: "p-biji-kopi", qty: 18, unit: "g" },
    // Latte: Biji Kopi 18g, Susu Segar 150mL
    { menuItemId: "p-latte", rawMaterialId: "p-biji-kopi", qty: 18, unit: "g" },
    { menuItemId: "p-latte", rawMaterialId: "p-susu", qty: 150, unit: "mL" },
    // Cappuccino: Biji Kopi 18g, Susu Segar 100mL
    { menuItemId: "p-cappuccino", rawMaterialId: "p-biji-kopi", qty: 18, unit: "g" },
    { menuItemId: "p-cappuccino", rawMaterialId: "p-susu", qty: 100, unit: "mL" },
    // Espresso: Biji Kopi 14g
    { menuItemId: "p-espresso", rawMaterialId: "p-biji-kopi", qty: 14, unit: "g" },
    // Matcha Latte: Susu Segar 200mL
    { menuItemId: "p-matcha", rawMaterialId: "p-susu", qty: 200, unit: "mL" },
    // Hot Chocolate: Susu Segar 200mL
    { menuItemId: "p-chocolate", rawMaterialId: "p-susu", qty: 200, unit: "mL" },
  ],

  variants: [
    { id: "v-amer-s", productId: "p-americano", name: "Small", priceAdjustment: 0 },
    { id: "v-amer-m", productId: "p-americano", name: "Medium", priceAdjustment: 4000 },
    { id: "v-amer-l", productId: "p-americano", name: "Large", priceAdjustment: 8000 },
    { id: "v-latte-s", productId: "p-latte", name: "Small", priceAdjustment: 0 },
    { id: "v-latte-m", productId: "p-latte", name: "Medium", priceAdjustment: 5000 },
    { id: "v-latte-l", productId: "p-latte", name: "Large", priceAdjustment: 10000 },
    { id: "v-cap-s", productId: "p-cappuccino", name: "Small", priceAdjustment: 0 },
    { id: "v-cap-m", productId: "p-cappuccino", name: "Medium", priceAdjustment: 5000 },
    { id: "v-cap-l", productId: "p-cappuccino", name: "Large", priceAdjustment: 10000 },
    { id: "v-matcha-s", productId: "p-matcha", name: "Small", priceAdjustment: 0 },
    { id: "v-matcha-m", productId: "p-matcha", name: "Medium", priceAdjustment: 5000 },
    { id: "v-matcha-l", productId: "p-matcha", name: "Large", priceAdjustment: 10000 },
  ],

  // Raw material stock = purchased - consumed by sales
  // Physical product stock = purchased - sold
  inventory: [
    // Raw materials
    { productId: "p-biji-kopi", variantId: null, currentQty: 1932, minQty: 500, unit: "g" },
    { productId: "p-susu", variantId: null, currentQty: 3550, minQty: 1000, unit: "mL" },
    // Physical products (no BOM — tracked directly)
    { productId: "p-croissant", variantId: null, currentQty: 9, minQty: 3, unit: "pcs" },
    { productId: "p-cheesecake", variantId: null, currentQty: 7, minQty: 2, unit: "pcs" },
    { productId: "p-tumbler", variantId: null, currentQty: 4, minQty: 2, unit: "pcs" },
    { productId: "p-totebag", variantId: null, currentQty: 10, minQty: 5, unit: "pcs" },
  ],

  // tx-m1: Americano Medium (22000) + Latte Small (25000) = 47000 QRIS
  // tx-m2: Cappuccino Small (25000, disc 20% = -5000 → 20000) + Croissant (22000) + Cheesecake (35000) = 77000... let's use simpler: no discount
  //   Cappuccino Small 25000 + Croissant 22000 + Cheesecake 35000 = 82000 CASH
  // tx-m3: Tumbler (85000) QRIS
  // tx-m4: Matcha Small (28000) + Espresso (15000) = 43000 CASH
  transactions: [
    { id: "tx-m1", date: now - 3 * hour, total: 47000, paymentMethod: "QRIS", status: "COMPLETED" },
    { id: "tx-m2", date: now - 2 * hour, total: 82000, paymentMethod: "CASH", status: "COMPLETED" },
    { id: "tx-m3", date: now - hour, total: 85000, paymentMethod: "QRIS", status: "COMPLETED" },
    { id: "tx-m4", date: now - 0.5 * hour, total: 43000, paymentMethod: "CASH", status: "COMPLETED" },
  ],

  transactionItems: [
    { id: "ti-m1a", transactionId: "tx-m1", productId: "p-americano", variantId: "v-amer-m", productName: "Americano", variantName: "Medium", qty: 1, unitPrice: 22000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 22000 },
    { id: "ti-m1b", transactionId: "tx-m1", productId: "p-latte", variantId: "v-latte-s", productName: "Latte", variantName: "Small", qty: 1, unitPrice: 25000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 25000 },
    { id: "ti-m2a", transactionId: "tx-m2", productId: "p-cappuccino", variantId: "v-cap-s", productName: "Cappuccino", variantName: "Small", qty: 1, unitPrice: 25000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 25000 },
    { id: "ti-m2b", transactionId: "tx-m2", productId: "p-croissant", variantId: null, productName: "Croissant", variantName: null, qty: 1, unitPrice: 22000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 22000 },
    { id: "ti-m2c", transactionId: "tx-m2", productId: "p-cheesecake", variantId: null, productName: "Cheesecake", variantName: null, qty: 1, unitPrice: 35000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 35000 },
    { id: "ti-m3a", transactionId: "tx-m3", productId: "p-tumbler", variantId: null, productName: "Tumbler", variantName: null, qty: 1, unitPrice: 85000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 85000 },
    { id: "ti-m4a", transactionId: "tx-m4", productId: "p-matcha", variantId: "v-matcha-s", productName: "Matcha Latte", variantName: "Small", qty: 1, unitPrice: 28000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 28000 },
    { id: "ti-m4b", transactionId: "tx-m4", productId: "p-espresso", variantId: null, productName: "Espresso", variantName: null, qty: 1, unitPrice: 15000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 15000 },
  ],

  ledger: [
    // Purchasing COGS: 2kg biji kopi @250k = 500k; 4L susu @40k = 160k
    { id: "led-m0a", type: "COGS", amount: -500000, referenceId: "gr-m1", description: "Goods receiving from Roaster Nusantara", date: now - 72 * hour },
    { id: "led-m0b", type: "COGS", amount: -160000, referenceId: "gr-m2", description: "Goods receiving from Supplier Dairy Fresh", date: now - 24 * hour },
    { id: "led-m1", type: "SALE_QRIS", amount: 47000, referenceId: "tx-m1", description: "Sale #1", date: now - 3 * hour },
    { id: "led-m2", type: "SALE", amount: 82000, referenceId: "tx-m2", description: "Sale #2", date: now - 2 * hour },
    { id: "led-m3", type: "SALE_QRIS", amount: 85000, referenceId: "tx-m3", description: "Sale #3", date: now - hour },
    { id: "led-m4", type: "SALE", amount: 43000, referenceId: "tx-m4", description: "Sale #4", date: now - 0.5 * hour },
  ],

  vendors: [
    { id: "vnd-m1", name: "Roaster Nusantara", phone: "08811223344", address: "Jl. Kopi No. 7" },
    { id: "vnd-m2", name: "Supplier Dairy Fresh", phone: "08755667788" },
  ],

  goodsReceivings: [
    {
      id: "gr-m1",
      vendorId: "vnd-m1",
      date: now - 72 * hour,
      totalCost: 500000,
      items: [
        // 2 kg biji kopi arabica @ Rp250.000/kg
        { productId: "p-biji-kopi", variantId: null, qty: 2, unit: "kg" as const, unitCost: 250000 },
      ],
    },
    {
      id: "gr-m2",
      vendorId: "vnd-m2",
      date: now - 24 * hour,
      totalCost: 160000,
      items: [
        // 4 L susu segar @ Rp40.000/L
        { productId: "p-susu", variantId: null, qty: 4, unit: "L" as const, unitCost: 40000 },
      ],
    },
  ],
};
