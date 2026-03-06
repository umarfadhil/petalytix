import type { ScenarioData } from "../types";

const now = Date.now();
const hour = 3600000;

// ─── Design ──────────────────────────────────────────────────────────────────
// Retail store sells packaged goods. Each sellable item (MENU_ITEM) is backed
// by a raw material stock entry (RAW_MATERIAL) via 1-pcs BOM.
// Goods receiving populates raw material stock → Stock screen shows it.
// Selling deducts from raw material via BOM.
//
// Raw material categories mirror real shelf categories in a warung/toko:
//   "Sembako"        → beras5, minyak, gula, indomie, telur
//   "Minuman"        → aqua, tehpucuk, pocari
//   "Snack"          → chitato, oreo
//   "Rokok"          → gudang, sampoerna
//
// Goods received (gr-rt1, 3 days ago): all sembako + minuman + snack
// Goods received (gr-rt2, 2 days ago): rokok
//
// Sales: beras5×3, minyak×2, gula×1, indomie×2, telur×2,
//        aqua×1, oreo×1, gudang×2
// Stock = purchased - sold

export const retailData: ScenarioData = {
  restaurantName: "Toko Makmur Jaya",
  paymentMethods: { cash: true, qris: true, utang: true },

  categories: [
    // Menu categories (POS display)
    { id: "cat-sembako", name: "Sembako", sortOrder: 0, categoryType: "MENU" },
    { id: "cat-minuman", name: "Minuman", sortOrder: 1, categoryType: "MENU" },
    { id: "cat-snack", name: "Snack", sortOrder: 2, categoryType: "MENU" },
    { id: "cat-rokok", name: "Rokok", sortOrder: 3, categoryType: "MENU" },
    // Raw material categories (Stock & Purchasing)
    { id: "cat-stok-sembako", name: "Sembako", sortOrder: 4, categoryType: "RAW_MATERIAL" },
    { id: "cat-stok-minuman", name: "Minuman", sortOrder: 5, categoryType: "RAW_MATERIAL" },
    { id: "cat-stok-snack", name: "Snack", sortOrder: 6, categoryType: "RAW_MATERIAL" },
    { id: "cat-stok-rokok", name: "Rokok", sortOrder: 7, categoryType: "RAW_MATERIAL" },
  ],

  products: [
    // ── Menu Items (POS) ──
    { id: "p-beras5", categoryId: "cat-sembako", name: "Beras 5kg", price: 65000, productType: "MENU_ITEM", isActive: true },
    { id: "p-minyak", categoryId: "cat-sembako", name: "Minyak Goreng 1L", price: 18000, productType: "MENU_ITEM", isActive: true },
    { id: "p-gula", categoryId: "cat-sembako", name: "Gula Pasir 1kg", price: 15000, productType: "MENU_ITEM", isActive: true },
    { id: "p-indomie", categoryId: "cat-sembako", name: "Indomie Goreng", price: 3500, productType: "MENU_ITEM", isActive: true },
    { id: "p-telur", categoryId: "cat-sembako", name: "Telur 1kg", price: 28000, productType: "MENU_ITEM", isActive: true },
    { id: "p-aqua", categoryId: "cat-minuman", name: "Aqua 600mL", price: 4000, productType: "MENU_ITEM", isActive: true },
    { id: "p-tehpucuk", categoryId: "cat-minuman", name: "Teh Pucuk", price: 4000, productType: "MENU_ITEM", isActive: true },
    { id: "p-pocari", categoryId: "cat-minuman", name: "Pocari Sweat", price: 7500, productType: "MENU_ITEM", isActive: true },
    { id: "p-chitato", categoryId: "cat-snack", name: "Chitato", price: 10000, productType: "MENU_ITEM", isActive: true },
    { id: "p-oreo", categoryId: "cat-snack", name: "Oreo", price: 8500, productType: "MENU_ITEM", isActive: true },
    { id: "p-gudang", categoryId: "cat-rokok", name: "Gudang Garam", price: 28000, productType: "MENU_ITEM", isActive: true },
    { id: "p-sampoerna", categoryId: "cat-rokok", name: "Sampoerna Mild", price: 30000, productType: "MENU_ITEM", isActive: true },
    // ── Raw Materials (Stock & Purchasing) ──
    { id: "p-beras5-stok", categoryId: "cat-stok-sembako", name: "Beras 5kg", price: 0, productType: "RAW_MATERIAL", isActive: true },
    { id: "p-minyak-stok", categoryId: "cat-stok-sembako", name: "Minyak Goreng 1L", price: 0, productType: "RAW_MATERIAL", isActive: true },
    { id: "p-gula-stok", categoryId: "cat-stok-sembako", name: "Gula Pasir 1kg", price: 0, productType: "RAW_MATERIAL", isActive: true },
    { id: "p-indomie-stok", categoryId: "cat-stok-sembako", name: "Indomie Goreng", price: 0, productType: "RAW_MATERIAL", isActive: true },
    { id: "p-telur-stok", categoryId: "cat-stok-sembako", name: "Telur 1kg", price: 0, productType: "RAW_MATERIAL", isActive: true },
    { id: "p-aqua-stok", categoryId: "cat-stok-minuman", name: "Aqua 600mL", price: 0, productType: "RAW_MATERIAL", isActive: true },
    { id: "p-tehpucuk-stok", categoryId: "cat-stok-minuman", name: "Teh Pucuk", price: 0, productType: "RAW_MATERIAL", isActive: true },
    { id: "p-pocari-stok", categoryId: "cat-stok-minuman", name: "Pocari Sweat", price: 0, productType: "RAW_MATERIAL", isActive: true },
    { id: "p-chitato-stok", categoryId: "cat-stok-snack", name: "Chitato", price: 0, productType: "RAW_MATERIAL", isActive: true },
    { id: "p-oreo-stok", categoryId: "cat-stok-snack", name: "Oreo", price: 0, productType: "RAW_MATERIAL", isActive: true },
    { id: "p-gudang-stok", categoryId: "cat-stok-rokok", name: "Gudang Garam", price: 0, productType: "RAW_MATERIAL", isActive: true },
    { id: "p-sampoerna-stok", categoryId: "cat-stok-rokok", name: "Sampoerna Mild", price: 0, productType: "RAW_MATERIAL", isActive: true },
  ],

  // Selling 1 unit deducts 1 pcs from the matching raw material
  productComponents: [
    { menuItemId: "p-beras5", rawMaterialId: "p-beras5-stok", qty: 1, unit: "pcs" },
    { menuItemId: "p-minyak", rawMaterialId: "p-minyak-stok", qty: 1, unit: "pcs" },
    { menuItemId: "p-gula", rawMaterialId: "p-gula-stok", qty: 1, unit: "pcs" },
    { menuItemId: "p-indomie", rawMaterialId: "p-indomie-stok", qty: 1, unit: "pcs" },
    { menuItemId: "p-telur", rawMaterialId: "p-telur-stok", qty: 1, unit: "pcs" },
    { menuItemId: "p-aqua", rawMaterialId: "p-aqua-stok", qty: 1, unit: "pcs" },
    { menuItemId: "p-tehpucuk", rawMaterialId: "p-tehpucuk-stok", qty: 1, unit: "pcs" },
    { menuItemId: "p-pocari", rawMaterialId: "p-pocari-stok", qty: 1, unit: "pcs" },
    { menuItemId: "p-chitato", rawMaterialId: "p-chitato-stok", qty: 1, unit: "pcs" },
    { menuItemId: "p-oreo", rawMaterialId: "p-oreo-stok", qty: 1, unit: "pcs" },
    { menuItemId: "p-gudang", rawMaterialId: "p-gudang-stok", qty: 1, unit: "pcs" },
    { menuItemId: "p-sampoerna", rawMaterialId: "p-sampoerna-stok", qty: 1, unit: "pcs" },
  ],

  variants: [],

  // Stock = purchased - sold
  // beras5:  10-3=7   minyak: 12-2=10  gula: 8-1=7    indomie: 48-2=46
  // telur:   12-2=10  aqua:  36-1=35   tehpucuk: 24    pocari:  12
  // chitato: 18-1=17  oreo:   6-1=5    gudang: 10-2=8  sampoerna: 8
  inventory: [
    { productId: "p-beras5-stok", variantId: null, currentQty: 7, minQty: 3, unit: "pcs" },
    { productId: "p-minyak-stok", variantId: null, currentQty: 10, minQty: 6, unit: "pcs" },
    { productId: "p-gula-stok", variantId: null, currentQty: 7, minQty: 3, unit: "pcs" },
    { productId: "p-indomie-stok", variantId: null, currentQty: 46, minQty: 12, unit: "pcs" },
    { productId: "p-telur-stok", variantId: null, currentQty: 10, minQty: 3, unit: "pcs" },
    { productId: "p-aqua-stok", variantId: null, currentQty: 35, minQty: 12, unit: "pcs" },
    { productId: "p-tehpucuk-stok", variantId: null, currentQty: 24, minQty: 6, unit: "pcs" },
    { productId: "p-pocari-stok", variantId: null, currentQty: 12, minQty: 6, unit: "pcs" },
    { productId: "p-chitato-stok", variantId: null, currentQty: 17, minQty: 6, unit: "pcs" },
    { productId: "p-oreo-stok", variantId: null, currentQty: 5, minQty: 6, unit: "pcs" },
    { productId: "p-gudang-stok", variantId: null, currentQty: 8, minQty: 5, unit: "pcs" },
    { productId: "p-sampoerna-stok", variantId: null, currentQty: 8, minQty: 5, unit: "pcs" },
  ],

  transactions: [
    { id: "tx-r1", date: now - 3 * hour, total: 90000, paymentMethod: "CASH", status: "COMPLETED" },
    { id: "tx-r2", date: now - 2.5 * hour, total: 32000, paymentMethod: "QRIS", status: "COMPLETED" },
    { id: "tx-r3", date: now - 2 * hour, total: 15500, paymentMethod: "CASH", status: "COMPLETED" },
    { id: "tx-r4", date: now - hour, total: 46000, paymentMethod: "CASH", status: "COMPLETED" },
    { id: "tx-r5", date: now - 0.3 * hour, total: 28000, paymentMethod: "QRIS", status: "COMPLETED" },
    { id: "tx-r6", date: now - 0.1 * hour, total: 93000, paymentMethod: "UTANG", status: "COMPLETED", debtStatus: "UNPAID", customerName: "Bu Sari" },
  ],

  transactionItems: [
    { id: "ti-r1a", transactionId: "tx-r1", productId: "p-beras5", variantId: null, productName: "Beras 5kg", variantName: null, qty: 1, unitPrice: 65000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 65000 },
    { id: "ti-r1b", transactionId: "tx-r1", productId: "p-gula", variantId: null, productName: "Gula Pasir 1kg", variantName: null, qty: 1, unitPrice: 15000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 15000 },
    { id: "ti-r1c", transactionId: "tx-r1", productId: "p-chitato", variantId: null, productName: "Chitato", variantName: null, qty: 1, unitPrice: 10000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 10000 },
    { id: "ti-r2a", transactionId: "tx-r2", productId: "p-gudang", variantId: null, productName: "Gudang Garam", variantName: null, qty: 1, unitPrice: 28000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 28000 },
    { id: "ti-r2b", transactionId: "tx-r2", productId: "p-aqua", variantId: null, productName: "Aqua 600mL", variantName: null, qty: 1, unitPrice: 4000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 4000 },
    { id: "ti-r3a", transactionId: "tx-r3", productId: "p-indomie", variantId: null, productName: "Indomie Goreng", variantName: null, qty: 2, unitPrice: 3500, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 7000 },
    { id: "ti-r3b", transactionId: "tx-r3", productId: "p-oreo", variantId: null, productName: "Oreo", variantName: null, qty: 1, unitPrice: 8500, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 8500 },
    { id: "ti-r4a", transactionId: "tx-r4", productId: "p-minyak", variantId: null, productName: "Minyak Goreng 1L", variantName: null, qty: 1, unitPrice: 18000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 18000 },
    { id: "ti-r4b", transactionId: "tx-r4", productId: "p-telur", variantId: null, productName: "Telur 1kg", variantName: null, qty: 1, unitPrice: 28000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 28000 },
    { id: "ti-r5a", transactionId: "tx-r5", productId: "p-gudang", variantId: null, productName: "Gudang Garam", variantName: null, qty: 1, unitPrice: 28000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 28000 },
    { id: "ti-r6a", transactionId: "tx-r6", productId: "p-beras5", variantId: null, productName: "Beras 5kg", variantName: null, qty: 1, unitPrice: 65000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 65000 },
    { id: "ti-r6b", transactionId: "tx-r6", productId: "p-minyak", variantId: null, productName: "Minyak Goreng 1L", variantName: null, qty: 1, unitPrice: 18000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 18000 },
    { id: "ti-r6c", transactionId: "tx-r6", productId: "p-telur", variantId: null, productName: "Telur 1kg", variantName: null, qty: 1, unitPrice: 28000, discountType: "AMOUNT", discountValue: 18000, discountAmount: 18000, subtotal: 10000 },
  ],

  ledger: [
    // 10×58k+12×15k+8×12.5k+48×2.5k+12×25k+36×3k+24×3k+12×6k+18×8k+6×7k = 1.718.000
    { id: "led-rt1cogs", type: "COGS", amount: -1718000, referenceId: "gr-rt1", description: "Goods receiving from PT Distributor Sembako", date: now - 72 * hour },
    // 10×25k+8×27k = 466.000
    { id: "led-rt2cogs", type: "COGS", amount: -466000, referenceId: "gr-rt2", description: "Goods receiving from UD Rokok Makmur", date: now - 48 * hour },
    { id: "led-r1", type: "SALE", amount: 90000, referenceId: "tx-r1", description: "Sale #1", date: now - 3 * hour },
    { id: "led-r2", type: "SALE_QRIS", amount: 32000, referenceId: "tx-r2", description: "Sale #2", date: now - 2.5 * hour },
    { id: "led-r3", type: "SALE", amount: 15500, referenceId: "tx-r3", description: "Sale #3", date: now - 2 * hour },
    { id: "led-r4", type: "SALE", amount: 46000, referenceId: "tx-r4", description: "Sale #4", date: now - hour },
    { id: "led-r5", type: "SALE_QRIS", amount: 28000, referenceId: "tx-r5", description: "Sale #5", date: now - 0.3 * hour },
    { id: "led-r6", type: "SALE_DEBT", amount: 93000, referenceId: "tx-r6", description: "Sale #6 (UTANG)", date: now - 0.1 * hour },
  ],

  vendors: [
    { id: "vnd-rt1", name: "PT Distributor Sembako", phone: "02112345678", address: "Jl. Industri No. 5" },
    { id: "vnd-rt2", name: "UD Rokok Makmur", phone: "08234567890" },
  ],

  goodsReceivings: [
    {
      id: "gr-rt1",
      vendorId: "vnd-rt1",
      date: now - 72 * hour,
      totalCost: 1718000,
      items: [
        { productId: "p-beras5-stok", variantId: null, qty: 10, unitCost: 58000 },
        { productId: "p-minyak-stok", variantId: null, qty: 12, unitCost: 15000 },
        { productId: "p-gula-stok", variantId: null, qty: 8, unitCost: 12500 },
        { productId: "p-indomie-stok", variantId: null, qty: 48, unitCost: 2500 },
        { productId: "p-telur-stok", variantId: null, qty: 12, unitCost: 25000 },
        { productId: "p-aqua-stok", variantId: null, qty: 36, unitCost: 3000 },
        { productId: "p-tehpucuk-stok", variantId: null, qty: 24, unitCost: 3000 },
        { productId: "p-pocari-stok", variantId: null, qty: 12, unitCost: 6000 },
        { productId: "p-chitato-stok", variantId: null, qty: 18, unitCost: 8000 },
        { productId: "p-oreo-stok", variantId: null, qty: 6, unitCost: 7000 },
      ],
    },
    {
      id: "gr-rt2",
      vendorId: "vnd-rt2",
      date: now - 48 * hour,
      totalCost: 466000,
      items: [
        { productId: "p-gudang-stok", variantId: null, qty: 10, unitCost: 25000 },
        { productId: "p-sampoerna-stok", variantId: null, qty: 8, unitCost: 27000 },
      ],
    },
  ],
};
