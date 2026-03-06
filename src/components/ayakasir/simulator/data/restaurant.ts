import type { ScenarioData } from "../types";

const now = Date.now();
const hour = 3600000;

// ─── Goods Receivings ────────────────────────────────────────────────────────
// gr-r1 (3 days ago): beras 10kg, ayam 3kg, telur 20pcs, minyak 2L, santan 1.5L
// gr-r2 (2 days ago): mie-kuning 2kg, bihun 1kg, kol 1.5kg, tauge 1kg, gula 1kg, daun-bawang 500g, bumbu-soto 500g
// gr-r3 (1 day ago):  bawang-merah 300g, kecap 250mL, teh-celup 20pcs, kopi-bubuk 100g, susu-kental 300mL, jeruk-nipis 10pcs
//
// ─── Sales (BOM deductions) ──────────────────────────────────────────────────
// tx-1: soto-besar×1, es-teh×2, kerupuk×1, nasi-putih×2
//   → beras 150+300=450g, ayam 100g, bihun 50g, tauge 30g, daun-bawang 10g, bumbu-soto 15g, santan 100mL, minyak 10mL, teh 2pcs, gula 20g
// tx-2: nasi-goreng×1, es-jeruk×1
//   → beras 200g, telur 1, kol 40g, daun-bawang 10g, bawang 15g, kecap 10mL, minyak 30mL, jeruk 2pcs, gula 15g
// tx-3: mie-goreng×1, kopi-dingin×1, gorengan×1
//   → mie 150g, telur 1, kol 30g, tauge 20g, bawang 10g, kecap 10mL, minyak 25mL, kopi 10g, susu-kental 20mL, gula 10g
// tx-4: soto×2, es-teh×2 (UTANG Pak Budi)
//   → beras 300g, ayam 200g, bihun 100g, tauge 60g, daun-bawang 20g, bumbu-soto 30g, santan 200mL, minyak 20mL, teh 2pcs, gula 20g
//
// ─── Current Stock = Purchased - Consumed ────────────────────────────────────
// beras:        10000 - (450+200+300)     = 10000-950  = 9050g
// mie-kuning:   2000  - 150               = 1850g
// bihun:        1000  - (50+100)          = 850g
// ayam:         3000  - (100+200)         = 2700g
// telur:        20    - (1+1)             = 18pcs
// kol:          1500  - (40+30)           = 1430g
// tauge:        1000  - (30+20+60)        = 890g
// daun-bawang:  500   - (10+10+20)        = 460g
// bumbu-soto:   500   - (15+30)           = 455g
// bawang-merah: 300   - (15+10)           = 275g
// kecap:        250   - (10+10)           = 230mL
// minyak-goreng:2000  - (10+30+25+20)     = 1915mL
// santan:       1500  - (100+200)         = 1200mL
// teh-celup:    20    - (2+2)             = 16pcs
// kopi-bubuk:   100   - 10               = 90g
// susu-kental:  300   - 20               = 280mL
// jeruk-nipis:  10    - 2                = 8pcs
// gula:         1000  - (20+15+10+20)    = 935g

export const restaurantData: ScenarioData = {
  restaurantName: "Warung Soto Pak Joko",
  paymentMethods: { cash: true, qris: true, utang: true },

  categories: [
    { id: "cat-makan", name: "Makanan", sortOrder: 0, categoryType: "MENU" },
    { id: "cat-minum", name: "Minuman", sortOrder: 1, categoryType: "MENU" },
    { id: "cat-camil", name: "Camilan", sortOrder: 2, categoryType: "MENU" },
    { id: "cat-bahan-karbohidrat", name: "Karbohidrat & Mie", sortOrder: 3, categoryType: "RAW_MATERIAL" },
    { id: "cat-bahan-protein", name: "Protein", sortOrder: 4, categoryType: "RAW_MATERIAL" },
    { id: "cat-bahan-sayur", name: "Sayur & Bumbu", sortOrder: 5, categoryType: "RAW_MATERIAL" },
    { id: "cat-bahan-minyak", name: "Minyak & Santan", sortOrder: 6, categoryType: "RAW_MATERIAL" },
    { id: "cat-bahan-minuman", name: "Bahan Minuman", sortOrder: 7, categoryType: "RAW_MATERIAL" },
  ],

  products: [
    // Menu — Makanan
    { id: "p-soto", categoryId: "cat-makan", name: "Soto Ayam", price: 25000, productType: "MENU_ITEM", isActive: true },
    { id: "p-nasi-goreng", categoryId: "cat-makan", name: "Nasi Goreng", price: 20000, productType: "MENU_ITEM", isActive: true },
    { id: "p-mie-goreng", categoryId: "cat-makan", name: "Mie Goreng", price: 18000, productType: "MENU_ITEM", isActive: true },
    { id: "p-nasi-putih", categoryId: "cat-makan", name: "Nasi Putih", price: 5000, productType: "MENU_ITEM", isActive: true },
    // Menu — Minuman
    { id: "p-es-teh", categoryId: "cat-minum", name: "Es Teh", price: 5000, productType: "MENU_ITEM", isActive: true },
    { id: "p-kopi", categoryId: "cat-minum", name: "Kopi Susu", price: 12000, productType: "MENU_ITEM", isActive: true },
    { id: "p-jeruk", categoryId: "cat-minum", name: "Es Jeruk", price: 8000, productType: "MENU_ITEM", isActive: true },
    // Menu — Camilan
    { id: "p-kerupuk", categoryId: "cat-camil", name: "Kerupuk", price: 3000, productType: "MENU_ITEM", isActive: true },
    { id: "p-gorengan", categoryId: "cat-camil", name: "Gorengan", price: 5000, productType: "MENU_ITEM", isActive: true },

    // Bahan Baku — Karbohidrat & Mie
    { id: "p-beras", categoryId: "cat-bahan-karbohidrat", name: "Beras", price: 0, productType: "RAW_MATERIAL", isActive: true },
    { id: "p-mie-kuning", categoryId: "cat-bahan-karbohidrat", name: "Mie Kuning", price: 0, productType: "RAW_MATERIAL", isActive: true },
    { id: "p-bihun", categoryId: "cat-bahan-karbohidrat", name: "Bihun", price: 0, productType: "RAW_MATERIAL", isActive: true },
    // Bahan Baku — Protein
    { id: "p-ayam", categoryId: "cat-bahan-protein", name: "Ayam", price: 0, productType: "RAW_MATERIAL", isActive: true },
    { id: "p-telur", categoryId: "cat-bahan-protein", name: "Telur Ayam", price: 0, productType: "RAW_MATERIAL", isActive: true },
    // Bahan Baku — Sayur & Bumbu
    { id: "p-kol", categoryId: "cat-bahan-sayur", name: "Kol", price: 0, productType: "RAW_MATERIAL", isActive: true },
    { id: "p-tauge", categoryId: "cat-bahan-sayur", name: "Tauge", price: 0, productType: "RAW_MATERIAL", isActive: true },
    { id: "p-daun-bawang", categoryId: "cat-bahan-sayur", name: "Daun Bawang", price: 0, productType: "RAW_MATERIAL", isActive: true },
    { id: "p-bumbu-soto", categoryId: "cat-bahan-sayur", name: "Bumbu Soto (Kunyit, Jahe, dll)", price: 0, productType: "RAW_MATERIAL", isActive: true },
    { id: "p-bawang-merah", categoryId: "cat-bahan-sayur", name: "Bawang Merah & Putih", price: 0, productType: "RAW_MATERIAL", isActive: true },
    { id: "p-kecap", categoryId: "cat-bahan-sayur", name: "Kecap Manis", price: 0, productType: "RAW_MATERIAL", isActive: true },
    // Bahan Baku — Minyak & Santan
    { id: "p-minyak-goreng", categoryId: "cat-bahan-minyak", name: "Minyak Goreng", price: 0, productType: "RAW_MATERIAL", isActive: true },
    { id: "p-santan", categoryId: "cat-bahan-minyak", name: "Santan", price: 0, productType: "RAW_MATERIAL", isActive: true },
    // Bahan Baku — Minuman
    { id: "p-teh-celup", categoryId: "cat-bahan-minuman", name: "Teh Celup", price: 0, productType: "RAW_MATERIAL", isActive: true },
    { id: "p-kopi-bubuk", categoryId: "cat-bahan-minuman", name: "Kopi Bubuk", price: 0, productType: "RAW_MATERIAL", isActive: true },
    { id: "p-susu-kental", categoryId: "cat-bahan-minuman", name: "Susu Kental Manis", price: 0, productType: "RAW_MATERIAL", isActive: true },
    { id: "p-jeruk-nipis", categoryId: "cat-bahan-minuman", name: "Jeruk Nipis", price: 0, productType: "RAW_MATERIAL", isActive: true },
    { id: "p-gula", categoryId: "cat-bahan-minuman", name: "Gula Pasir", price: 0, productType: "RAW_MATERIAL", isActive: true },
  ],

  productComponents: [
    // Soto Ayam: Beras 150g, Ayam 100g, Bihun 50g, Tauge 30g, Daun Bawang 10g, Bumbu Soto 15g, Santan 100mL, Minyak 10mL
    { menuItemId: "p-soto", rawMaterialId: "p-beras", qty: 150, unit: "g" },
    { menuItemId: "p-soto", rawMaterialId: "p-ayam", qty: 100, unit: "g" },
    { menuItemId: "p-soto", rawMaterialId: "p-bihun", qty: 50, unit: "g" },
    { menuItemId: "p-soto", rawMaterialId: "p-tauge", qty: 30, unit: "g" },
    { menuItemId: "p-soto", rawMaterialId: "p-daun-bawang", qty: 10, unit: "g" },
    { menuItemId: "p-soto", rawMaterialId: "p-bumbu-soto", qty: 15, unit: "g" },
    { menuItemId: "p-soto", rawMaterialId: "p-santan", qty: 100, unit: "mL" },
    { menuItemId: "p-soto", rawMaterialId: "p-minyak-goreng", qty: 10, unit: "mL" },

    // Nasi Goreng: Beras 200g, Telur 1pcs, Kol 40g, Daun Bawang 10g, Bawang 15g, Kecap 10mL, Minyak 30mL
    { menuItemId: "p-nasi-goreng", rawMaterialId: "p-beras", qty: 200, unit: "g" },
    { menuItemId: "p-nasi-goreng", rawMaterialId: "p-telur", qty: 1, unit: "pcs" },
    { menuItemId: "p-nasi-goreng", rawMaterialId: "p-kol", qty: 40, unit: "g" },
    { menuItemId: "p-nasi-goreng", rawMaterialId: "p-daun-bawang", qty: 10, unit: "g" },
    { menuItemId: "p-nasi-goreng", rawMaterialId: "p-bawang-merah", qty: 15, unit: "g" },
    { menuItemId: "p-nasi-goreng", rawMaterialId: "p-kecap", qty: 10, unit: "mL" },
    { menuItemId: "p-nasi-goreng", rawMaterialId: "p-minyak-goreng", qty: 30, unit: "mL" },

    // Mie Goreng: Mie Kuning 150g, Telur 1pcs, Kol 30g, Tauge 20g, Bawang 10g, Kecap 10mL, Minyak 25mL
    { menuItemId: "p-mie-goreng", rawMaterialId: "p-mie-kuning", qty: 150, unit: "g" },
    { menuItemId: "p-mie-goreng", rawMaterialId: "p-telur", qty: 1, unit: "pcs" },
    { menuItemId: "p-mie-goreng", rawMaterialId: "p-kol", qty: 30, unit: "g" },
    { menuItemId: "p-mie-goreng", rawMaterialId: "p-tauge", qty: 20, unit: "g" },
    { menuItemId: "p-mie-goreng", rawMaterialId: "p-bawang-merah", qty: 10, unit: "g" },
    { menuItemId: "p-mie-goreng", rawMaterialId: "p-kecap", qty: 10, unit: "mL" },
    { menuItemId: "p-mie-goreng", rawMaterialId: "p-minyak-goreng", qty: 25, unit: "mL" },

    // Nasi Putih: Beras 150g
    { menuItemId: "p-nasi-putih", rawMaterialId: "p-beras", qty: 150, unit: "g" },

    // Es Teh: Teh Celup 1pcs, Gula 10g
    { menuItemId: "p-es-teh", rawMaterialId: "p-teh-celup", qty: 1, unit: "pcs" },
    { menuItemId: "p-es-teh", rawMaterialId: "p-gula", qty: 10, unit: "g" },

    // Kopi Susu: Kopi Bubuk 10g, Susu Kental Manis 20mL, Gula 10g
    { menuItemId: "p-kopi", rawMaterialId: "p-kopi-bubuk", qty: 10, unit: "g" },
    { menuItemId: "p-kopi", rawMaterialId: "p-susu-kental", qty: 20, unit: "mL" },
    { menuItemId: "p-kopi", rawMaterialId: "p-gula", qty: 10, unit: "g" },

    // Es Jeruk: Jeruk Nipis 2pcs, Gula 15g
    { menuItemId: "p-jeruk", rawMaterialId: "p-jeruk-nipis", qty: 2, unit: "pcs" },
    { menuItemId: "p-jeruk", rawMaterialId: "p-gula", qty: 15, unit: "g" },
  ],

  variants: [
    { id: "v-soto-besar", productId: "p-soto", name: "Porsi Besar", priceAdjustment: 5000 },
    { id: "v-kopi-panas", productId: "p-kopi", name: "Panas", priceAdjustment: 0 },
    { id: "v-kopi-dingin", productId: "p-kopi", name: "Dingin", priceAdjustment: 2000 },
  ],

  // Only raw material stock — menu items use BOM so no inventory entries for them
  inventory: [
    { productId: "p-beras", variantId: null, currentQty: 9050, minQty: 3000, unit: "g" },
    { productId: "p-mie-kuning", variantId: null, currentQty: 1850, minQty: 500, unit: "g" },
    { productId: "p-bihun", variantId: null, currentQty: 850, minQty: 300, unit: "g" },
    { productId: "p-ayam", variantId: null, currentQty: 2700, minQty: 1000, unit: "g" },
    { productId: "p-telur", variantId: null, currentQty: 18, minQty: 10, unit: "pcs" },
    { productId: "p-kol", variantId: null, currentQty: 1430, minQty: 500, unit: "g" },
    { productId: "p-tauge", variantId: null, currentQty: 890, minQty: 300, unit: "g" },
    { productId: "p-daun-bawang", variantId: null, currentQty: 460, minQty: 100, unit: "g" },
    { productId: "p-bumbu-soto", variantId: null, currentQty: 455, minQty: 100, unit: "g" },
    { productId: "p-bawang-merah", variantId: null, currentQty: 275, minQty: 100, unit: "g" },
    { productId: "p-kecap", variantId: null, currentQty: 230, minQty: 100, unit: "mL" },
    { productId: "p-minyak-goreng", variantId: null, currentQty: 1915, minQty: 500, unit: "mL" },
    { productId: "p-santan", variantId: null, currentQty: 1200, minQty: 300, unit: "mL" },
    { productId: "p-teh-celup", variantId: null, currentQty: 16, minQty: 5, unit: "pcs" },
    { productId: "p-kopi-bubuk", variantId: null, currentQty: 90, minQty: 30, unit: "g" },
    { productId: "p-susu-kental", variantId: null, currentQty: 280, minQty: 100, unit: "mL" },
    { productId: "p-jeruk-nipis", variantId: null, currentQty: 8, minQty: 3, unit: "pcs" },
    { productId: "p-gula", variantId: null, currentQty: 935, minQty: 200, unit: "g" },
  ],

  // tx-1: soto-besar(30000) + es-teh×2(10000) + kerupuk(3000) + nasi-putih×2(10000) = 53000 CASH
  // tx-2: nasi-goreng disc 10%(18000) + es-jeruk(8000) = 26000 QRIS
  // tx-3: mie-goreng(18000) + kopi-dingin(14000) + gorengan(5000) = 37000 CASH
  // tx-4: soto×2(50000) + es-teh×2 disc 7000 → disc per item=(7000/2)=3500→each subtotal=1500 → (5000-3500)×2=3000 total 3000 → total=53000 UTANG
  //   simpler: soto×2 = 50000, es-teh×2 discount amount 7000 on the 10000 → subtotal 3000 → total = 53000
  transactions: [
    { id: "tx-1", date: now - 2 * hour, total: 53000, paymentMethod: "CASH", status: "COMPLETED" },
    { id: "tx-2", date: now - hour, total: 26000, paymentMethod: "QRIS", status: "COMPLETED" },
    { id: "tx-3", date: now - 0.5 * hour, total: 37000, paymentMethod: "CASH", status: "COMPLETED" },
    { id: "tx-4", date: now - 0.25 * hour, total: 53000, paymentMethod: "UTANG", status: "COMPLETED", debtStatus: "UNPAID", customerName: "Pak Budi" },
  ],

  transactionItems: [
    { id: "ti-1a", transactionId: "tx-1", productId: "p-soto", variantId: "v-soto-besar", productName: "Soto Ayam", variantName: "Porsi Besar", qty: 1, unitPrice: 30000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 30000 },
    { id: "ti-1b", transactionId: "tx-1", productId: "p-es-teh", variantId: null, productName: "Es Teh", variantName: null, qty: 2, unitPrice: 5000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 10000 },
    { id: "ti-1c", transactionId: "tx-1", productId: "p-kerupuk", variantId: null, productName: "Kerupuk", variantName: null, qty: 1, unitPrice: 3000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 3000 },
    { id: "ti-1d", transactionId: "tx-1", productId: "p-nasi-putih", variantId: null, productName: "Nasi Putih", variantName: null, qty: 2, unitPrice: 5000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 10000 },
    { id: "ti-2a", transactionId: "tx-2", productId: "p-nasi-goreng", variantId: null, productName: "Nasi Goreng", variantName: null, qty: 1, unitPrice: 20000, discountType: "PERCENT", discountValue: 10, discountAmount: 2000, subtotal: 18000 },
    { id: "ti-2b", transactionId: "tx-2", productId: "p-jeruk", variantId: null, productName: "Es Jeruk", variantName: null, qty: 1, unitPrice: 8000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 8000 },
    { id: "ti-3a", transactionId: "tx-3", productId: "p-mie-goreng", variantId: null, productName: "Mie Goreng", variantName: null, qty: 1, unitPrice: 18000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 18000 },
    { id: "ti-3b", transactionId: "tx-3", productId: "p-kopi", variantId: "v-kopi-dingin", productName: "Kopi Susu", variantName: "Dingin", qty: 1, unitPrice: 14000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 14000 },
    { id: "ti-3c", transactionId: "tx-3", productId: "p-gorengan", variantId: null, productName: "Gorengan", variantName: null, qty: 1, unitPrice: 5000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 5000 },
    { id: "ti-4a", transactionId: "tx-4", productId: "p-soto", variantId: null, productName: "Soto Ayam", variantName: null, qty: 2, unitPrice: 25000, discountType: "NONE", discountValue: 0, discountAmount: 0, subtotal: 50000 },
    { id: "ti-4b", transactionId: "tx-4", productId: "p-es-teh", variantId: null, productName: "Es Teh", variantName: null, qty: 2, unitPrice: 5000, discountType: "AMOUNT", discountValue: 7000, discountAmount: 7000, subtotal: 3000 },
  ],

  ledger: [
    // Purchasing COGS
    { id: "led-r1cogs", type: "COGS", amount: -357000, referenceId: "gr-r1", description: "Goods receiving from UD Sumber Pangan", date: now - 72 * hour },
    { id: "led-r2cogs", type: "COGS", amount: -102500, referenceId: "gr-r2", description: "Goods receiving from CV Sembako Jaya", date: now - 48 * hour },
    { id: "led-r3cogs", type: "COGS", amount: -65000, referenceId: "gr-r3", description: "Goods receiving from CV Sembako Jaya", date: now - 24 * hour },
    // Sales
    { id: "led-1", type: "SALE", amount: 53000, referenceId: "tx-1", description: "Sale #1", date: now - 2 * hour },
    { id: "led-2", type: "SALE_QRIS", amount: 26000, referenceId: "tx-2", description: "Sale #2", date: now - hour },
    { id: "led-3", type: "SALE", amount: 37000, referenceId: "tx-3", description: "Sale #3", date: now - 0.5 * hour },
    { id: "led-4", type: "SALE_DEBT", amount: 53000, referenceId: "tx-4", description: "Sale #4 (UTANG)", date: now - 0.25 * hour },
  ],

  vendors: [
    { id: "vnd-r1", name: "UD Sumber Pangan", phone: "08123456789", address: "Jl. Pasar Baru No. 10" },
    { id: "vnd-r2", name: "CV Sembako Jaya", phone: "08567890123" },
  ],

  goodsReceivings: [
    {
      id: "gr-r1",
      vendorId: "vnd-r1",
      date: now - 72 * hour,
      // 10kg beras@15k=150k + 3kg ayam@36k=108k + 20pcs telur@2.5k=50k + 2L minyak@17k=34k + 1.5L santan@10k=15k = 357.000
      totalCost: 357000,
      items: [
        { productId: "p-beras", variantId: null, qty: 10, unit: "kg" as const, unitCost: 15000 },
        { productId: "p-ayam", variantId: null, qty: 3, unit: "kg" as const, unitCost: 36000 },
        { productId: "p-telur", variantId: null, qty: 20, unit: "pcs" as const, unitCost: 2500 },
        { productId: "p-minyak-goreng", variantId: null, qty: 2, unit: "L" as const, unitCost: 17000 },
        { productId: "p-santan", variantId: null, qty: 1.5, unit: "L" as const, unitCost: 10000 },
      ],
    },
    {
      id: "gr-r2",
      vendorId: "vnd-r2",
      date: now - 48 * hour,
      totalCost: 102500,
      items: [
        // 2 kg mie kuning @ Rp14.000/kg → 28.000
        { productId: "p-mie-kuning", variantId: null, qty: 2, unit: "kg" as const, unitCost: 14000 },
        // 1 kg bihun @ Rp13.000/kg → 13.000
        { productId: "p-bihun", variantId: null, qty: 1, unit: "kg" as const, unitCost: 13000 },
        // 1.5 kg kol @ Rp7.000/kg → 10.500
        { productId: "p-kol", variantId: null, qty: 1.5, unit: "kg" as const, unitCost: 7000 },
        // 1 kg tauge @ Rp8.000/kg → 8.000
        { productId: "p-tauge", variantId: null, qty: 1, unit: "kg" as const, unitCost: 8000 },
        // 1 kg gula pasir @ Rp15.000/kg → 15.000
        { productId: "p-gula", variantId: null, qty: 1, unit: "kg" as const, unitCost: 15000 },
        // 500 g daun bawang @ Rp20/g (=Rp20.000/kg) → 10.000
        { productId: "p-daun-bawang", variantId: null, qty: 500, unit: "g" as const, unitCost: 20 },
        // 500 g bumbu soto @ Rp30/g (=Rp30.000/kg) → 15.000
        { productId: "p-bumbu-soto", variantId: null, qty: 500, unit: "g" as const, unitCost: 30 },
      ],
    },
    {
      id: "gr-r3",
      vendorId: "vnd-r2",
      date: now - 24 * hour,
      // 300g bawang @ Rp25/g=7500 + 250mL kecap @ Rp20/mL=5000 + 20pcs teh @Rp500=10000 + 100g kopi @Rp250/g=25000 + 300mL susu-kental @Rp50/mL=15000 + 10 jeruk @Rp250=2500
      // Total: 7500+5000+10000+25000+15000+2500 = 65000
      totalCost: 65000,
      items: [
        // 300 g bawang merah & putih @ Rp25/g → 7.500
        { productId: "p-bawang-merah", variantId: null, qty: 300, unit: "g" as const, unitCost: 25 },
        // 250 mL kecap manis @ Rp20/mL → 5.000
        { productId: "p-kecap", variantId: null, qty: 250, unit: "mL" as const, unitCost: 20 },
        // 20 pcs teh celup @ Rp500/pcs → 10.000
        { productId: "p-teh-celup", variantId: null, qty: 20, unit: "pcs" as const, unitCost: 500 },
        // 100 g kopi bubuk @ Rp250/g (=Rp250.000/kg) → 25.000
        { productId: "p-kopi-bubuk", variantId: null, qty: 100, unit: "g" as const, unitCost: 250 },
        // 300 mL susu kental manis @ Rp50/mL → 15.000
        { productId: "p-susu-kental", variantId: null, qty: 300, unit: "mL" as const, unitCost: 50 },
        // 10 pcs jeruk nipis @ Rp250/pcs → 2.500
        { productId: "p-jeruk-nipis", variantId: null, qty: 10, unit: "pcs" as const, unitCost: 250 },
      ],
    },
  ],
};
