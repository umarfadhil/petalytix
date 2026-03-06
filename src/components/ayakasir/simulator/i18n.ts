export interface SimCopy {
  device: {
    smartphone: string;
    tab10: string;
    fullscreen: string;
    exitFullscreen: string;
  };
  login: {
    title: string;
    userLabel: string;
    passLabel: string;
    hint: string;
    submit: string;
    error: string;
  };
  scenario: {
    title: string;
    subtitle: string;
    restaurant: string;
    restaurantDesc: string;
    retail: string;
    retailDesc: string;
    multichannel: string;
    multichannelDesc: string;
    services: string;
    servicesDesc: string;
  };
  tabs: {
    pos: string;
    dashboard: string;
    products: string;
    inventory: string;
    purchasing: string;
    settings: string;
  };
  pos: {
    all: string;
    cart: string;
    empty: string;
    subtotal: string;
    total: string;
    payCash: string;
    payQris: string;
    payUtang: string;
    items: string;
    selectVariant: string;
    discount: string;
    discountNone: string;
    discountAmount: string;
    discountPercent: string;
    discountValue: string;
    applyDiscount: string;
    customerName: string;
    customerNamePlaceholder: string;
    saldoKas: string;
  };
  dashboard: {
    title: string;
    today: string;
    month: string;
    year: string;
    custom: string;
    totalSales: string;
    txCount: string;
    cashSales: string;
    qrisSales: string;
    utangSales: string;
    saldoKas: string;
    lowStock: string;
    noLowStock: string;
    noData: string;
    unpaidDebts: string;
    noDebts: string;
    settleDebt: string;
    settleMethod: string;
    settleWithCash: string;
    settleWithQris: string;
    productSummary: string;
    productName: string;
    qtySold: string;
    revenue: string;
    from: string;
    to: string;
    applyRange: string;
  };
  products: {
    title: string;
    add: string;
    edit: string;
    name: string;
    price: string;
    category: string;
    save: string;
    cancel: string;
    delete: string;
    clone: string;
    variants: string;
    addVariant: string;
    noProducts: string;
    noCategory: string;
    search: string;
    menuItems: string;
    rawMaterials: string;
    productType: string;
    components: string;
    addComponent: string;
    componentRawMaterial: string;
    componentQty: string;
    componentUnit: string;
    noComponents: string;
  };
  inventory: {
    title: string;
    stock: string;
    minStock: string;
    low: string;
    noItems: string;
    adjust: string;
    adjustTitle: string;
    adjustQty: string;
    adjustReason: string;
    stockValue: string;
    totalStockValue: string;
    cogPerUnit: string;
  };
  purchasing: {
    title: string;
    goodsReceiving: string;
    vendors: string;
    addVendor: string;
    editVendor: string;
    vendorName: string;
    vendorPhone: string;
    vendorAddress: string;
    addReceiving: string;
    selectVendor: string;
    date: string;
    totalCost: string;
    items: string;
    product: string;
    qty: string;
    unitCost: string;
    addItem: string;
    noVendors: string;
    noReceivings: string;
    deleteVendor: string;
  };
  settings: {
    title: string;
    shopName: string;
    paymentMethods: string;
    cash: string;
    qris: string;
    utang: string;
    qrisCode: string;
    printer: string;
    printerConnected: string;
    printerDisconnected: string;
    initialBalance: string;
    setInitialBalance: string;
    manageVendors: string;
    exportCsv: string;
    exportSuccess: string;
    categories: string;
    addCategory: string;
    manageBarang: string;
    manageBarangDesc: string;
    manageBahanBaku: string;
    manageBahanBakuDesc: string;
    rawMaterialCategories: string;
    addRawMaterialCategory: string;
    logout: string;
    logoutConfirm: string;
  };
  receipt: {
    title: string;
    date: string;
    method: string;
    total: string;
    discount: string;
    close: string;
    customer: string;
  };
  confirm: {
    yes: string;
    no: string;
    payConfirm: string;
  };
}

const en: SimCopy = {
  device: {
    smartphone: "Mobile Phone",
    tab10: "Tab",
    fullscreen: "Fullscreen",
    exitFullscreen: "Exit Fullscreen",
  },
  login: {
    title: "Login to AyaKasir",
    userLabel: "Username",
    passLabel: "Password",
    hint: "username: ayakasir | password: cobaduluaja",
    submit: "Login",
    error: "Invalid username or password",
  },
  scenario: {
    title: "Choose a Business Type",
    subtitle: "Each scenario comes with sample data you can explore and modify.",
    restaurant: "Restaurant",
    restaurantDesc: "Warung Soto Pak Joko — food & beverages with ingredients",
    retail: "Retail",
    retailDesc: "Toko Makmur Jaya — groceries & daily goods",
    multichannel: "Multi-channel",
    multichannelDesc: "Kopi Nusantara — coffee shop with size variants",
    services: "Services",
    servicesDesc: "Barbershop Keren — haircut services & products",
  },
  tabs: {
    pos: "Cashier",
    dashboard: "Dashboard",
    products: "Menu",
    inventory: "Stock",
    purchasing: "Purchasing",
    settings: "Settings",
  },
  pos: {
    all: "All",
    cart: "Cart",
    empty: "Cart is empty",
    subtotal: "Subtotal",
    total: "Total",
    payCash: "Cash",
    payQris: "QRIS",
    payUtang: "Credit",
    items: "items",
    selectVariant: "Select variant",
    discount: "Discount",
    discountNone: "No discount",
    discountAmount: "Fixed amount",
    discountPercent: "Percentage",
    discountValue: "Discount value",
    applyDiscount: "Apply",
    customerName: "Customer name",
    customerNamePlaceholder: "Enter customer name",
    saldoKas: "Cash Balance",
  },
  dashboard: {
    title: "Dashboard",
    today: "Today",
    month: "This Month",
    year: "This Year",
    custom: "Custom",
    totalSales: "Total Sales",
    txCount: "Transactions",
    cashSales: "Cash",
    qrisSales: "QRIS",
    utangSales: "Credit",
    saldoKas: "Cash Balance",
    lowStock: "Low Stock",
    noLowStock: "All stock levels are healthy",
    noData: "No transactions for this period",
    unpaidDebts: "Unpaid Credits",
    noDebts: "No unpaid credits",
    settleDebt: "Paid",
    settleMethod: "Payment method",
    settleWithCash: "Cash",
    settleWithQris: "QRIS",
    productSummary: "Product Sales",
    productName: "Product",
    qtySold: "Qty",
    revenue: "Revenue",
    from: "From",
    to: "To",
    applyRange: "Apply",
  },
  products: {
    title: "Products",
    add: "Add Product",
    edit: "Edit Product",
    name: "Product name",
    price: "Price (Rp)",
    category: "Category",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    clone: "Duplicate",
    variants: "Variants",
    addVariant: "Add Variant",
    noProducts: "No products yet",
    noCategory: "Uncategorized",
    search: "Search products...",
    menuItems: "Menu Items",
    rawMaterials: "Raw Materials",
    productType: "Product type",
    components: "Raw Material Components (BOM)",
    addComponent: "Add component",
    componentRawMaterial: "Raw material",
    componentQty: "Qty used",
    componentUnit: "Unit",
    noComponents: "No components — stock deducted directly",
  },
  inventory: {
    title: "Inventory",
    stock: "Stock",
    minStock: "Min",
    low: "Low",
    noItems: "No inventory items",
    adjust: "Adjust",
    adjustTitle: "Adjust Stock",
    adjustQty: "New quantity",
    adjustReason: "Reason",
    stockValue: "Value",
    totalStockValue: "Total Stock Value",
    cogPerUnit: "COGS",
  },
  purchasing: {
    title: "Purchasing",
    goodsReceiving: "Goods Received",
    vendors: "Vendors",
    addVendor: "Add Vendor",
    editVendor: "Edit Vendor",
    vendorName: "Vendor name",
    vendorPhone: "Phone",
    vendorAddress: "Address",
    addReceiving: "Record Receiving",
    selectVendor: "Select vendor",
    date: "Date",
    totalCost: "Total Cost",
    items: "Items",
    product: "Product",
    qty: "Qty",
    unitCost: "Subtotal",
    addItem: "Add item",
    noVendors: "No vendors yet",
    noReceivings: "No goods received yet",
    deleteVendor: "Delete Vendor",
  },
  settings: {
    title: "Settings",
    shopName: "Shop Name",
    paymentMethods: "Payment Methods",
    cash: "Cash",
    qris: "QRIS",
    utang: "Credit (UTANG)",
    qrisCode: "QRIS Code",
    printer: "Bluetooth Printer",
    printerConnected: "Connected",
    printerDisconnected: "Not connected",
    initialBalance: "Initial Cash Balance",
    setInitialBalance: "Set Balance",
    manageVendors: "Manage Vendors",
    exportCsv: "Export Data (CSV)",
    exportSuccess: "Export successful!",
    categories: "Menu Categories",
    addCategory: "Add Category",
    manageBarang: "Manage Menu Items",
    manageBarangDesc: "Go to Menu tab to add/edit menu items and their raw material components.",
    manageBahanBaku: "Manage Raw Materials",
    manageBahanBakuDesc: "Go to Menu tab → Raw Materials to manage ingredient categories and items.",
    rawMaterialCategories: "Raw Material Categories",
    addRawMaterialCategory: "Add Raw Material Category",
    logout: "Logout",
    logoutConfirm: "Are you sure you want to logout? All data will be reset.",
  },
  receipt: {
    title: "Transaction Complete",
    date: "Date",
    method: "Payment",
    total: "TOTAL",
    discount: "Discount",
    close: "Done",
    customer: "Customer",
  },
  confirm: {
    yes: "Yes",
    no: "Cancel",
    payConfirm: "Confirm payment?",
  },
};

const id: SimCopy = {
  device: {
    smartphone: "Mobile Phone",
    tab10: "Tab",
    fullscreen: "Layar Penuh",
    exitFullscreen: "Keluar Layar Penuh",
  },
  login: {
    title: "Masuk ke AyaKasir",
    userLabel: "Username",
    passLabel: "Password",
    hint: "username: ayakasir | password: cobaduluaja",
    submit: "Masuk",
    error: "Username atau password salah",
  },
  scenario: {
    title: "Pilih Jenis Usaha",
    subtitle: "Setiap skenario dilengkapi data contoh yang bisa kamu jelajahi dan ubah.",
    restaurant: "Restoran",
    restaurantDesc: "Warung Soto Pak Joko — makanan & minuman dengan bahan baku",
    retail: "Retail",
    retailDesc: "Toko Makmur Jaya — sembako & kebutuhan harian",
    multichannel: "Multi-channel",
    multichannelDesc: "Kopi Nusantara — kedai kopi dengan varian ukuran",
    services: "Jasa",
    servicesDesc: "Barbershop Keren — jasa potong rambut & produk",
  },
  tabs: {
    pos: "Kasir",
    dashboard: "Dashboard",
    products: "Menu",
    inventory: "Stok",
    purchasing: "Pembelian",
    settings: "Pengaturan",
  },
  pos: {
    all: "Semua",
    cart: "Keranjang",
    empty: "Keranjang kosong",
    subtotal: "Subtotal",
    total: "Total",
    payCash: "Tunai",
    payQris: "QRIS",
    payUtang: "UTANG",
    items: "item",
    selectVariant: "Pilih varian",
    discount: "Diskon",
    discountNone: "Tanpa diskon",
    discountAmount: "Nominal tetap",
    discountPercent: "Persentase",
    discountValue: "Nilai diskon",
    applyDiscount: "Terapkan",
    customerName: "Nama pelanggan",
    customerNamePlaceholder: "Masukkan nama pelanggan",
    saldoKas: "Saldo Kas",
  },
  dashboard: {
    title: "Dashboard",
    today: "Hari ini",
    month: "Bulan ini",
    year: "Tahun ini",
    custom: "Kustom",
    totalSales: "Total Penjualan",
    txCount: "Transaksi",
    cashSales: "Tunai",
    qrisSales: "QRIS",
    utangSales: "UTANG",
    saldoKas: "Saldo Kas",
    lowStock: "Stok Rendah",
    noLowStock: "Semua stok dalam kondisi aman",
    noData: "Belum ada transaksi untuk periode ini",
    unpaidDebts: "UTANG Belum Lunas",
    noDebts: "Tidak ada utang",
    settleDebt: "Lunas",
    settleMethod: "Metode pembayaran",
    settleWithCash: "Tunai",
    settleWithQris: "QRIS",
    productSummary: "Ringkasan Produk",
    productName: "Produk",
    qtySold: "Terjual",
    revenue: "Pendapatan",
    from: "Dari",
    to: "Sampai",
    applyRange: "Terapkan",
  },
  products: {
    title: "Produk",
    add: "Tambah Produk",
    edit: "Edit Produk",
    name: "Nama produk",
    price: "Harga (Rp)",
    category: "Kategori",
    save: "Simpan",
    cancel: "Batal",
    delete: "Hapus",
    clone: "Duplikat",
    variants: "Varian",
    addVariant: "Tambah Varian",
    noProducts: "Belum ada produk",
    noCategory: "Tanpa Kategori",
    search: "Cari produk...",
    menuItems: "Item Menu",
    rawMaterials: "Bahan Baku",
    productType: "Jenis produk",
    components: "Komponen Bahan Baku (BOM)",
    addComponent: "Tambah komponen",
    componentRawMaterial: "Bahan baku",
    componentQty: "Qty terpakai",
    componentUnit: "Satuan",
    noComponents: "Tidak ada komponen — stok langsung dikurangi",
  },
  inventory: {
    title: "Inventaris",
    stock: "Stok",
    minStock: "Min",
    low: "Rendah",
    noItems: "Belum ada item inventaris",
    adjust: "Sesuaikan",
    adjustTitle: "Sesuaikan Stok",
    adjustQty: "Jumlah baru",
    adjustReason: "Alasan",
    stockValue: "Nilai",
    totalStockValue: "Total Nilai Stok",
    cogPerUnit: "HPP",
  },
  purchasing: {
    title: "Pembelian",
    goodsReceiving: "Penerimaan Barang",
    vendors: "Vendor",
    addVendor: "Tambah Vendor",
    editVendor: "Edit Vendor",
    vendorName: "Nama vendor",
    vendorPhone: "Telepon",
    vendorAddress: "Alamat",
    addReceiving: "Catat Penerimaan",
    selectVendor: "Pilih vendor",
    date: "Tanggal",
    totalCost: "Total Biaya",
    items: "Item",
    product: "Produk",
    qty: "Qty",
    unitCost: "Subtotal",
    addItem: "Tambah item",
    noVendors: "Belum ada vendor",
    noReceivings: "Belum ada penerimaan barang",
    deleteVendor: "Hapus Vendor",
  },
  settings: {
    title: "Pengaturan",
    shopName: "Nama Toko",
    paymentMethods: "Metode Pembayaran",
    cash: "Tunai",
    qris: "QRIS",
    utang: "UTANG (Kredit)",
    qrisCode: "Kode QRIS",
    printer: "Printer Bluetooth",
    printerConnected: "Terhubung",
    printerDisconnected: "Belum terhubung",
    initialBalance: "Saldo Awal Kas",
    setInitialBalance: "Atur Saldo",
    manageVendors: "Kelola Vendor",
    exportCsv: "Ekspor Data (CSV)",
    exportSuccess: "Ekspor berhasil!",
    categories: "Kategori Menu",
    addCategory: "Tambah Kategori",
    manageBarang: "Manajemen Barang",
    manageBarangDesc: "Buka tab Menu untuk tambah/edit item menu dan komponen bahan bakunya.",
    manageBahanBaku: "Manajemen Bahan Baku",
    manageBahanBakuDesc: "Buka tab Menu → Bahan Baku untuk kelola kategori dan item bahan baku.",
    rawMaterialCategories: "Kategori Bahan Baku",
    addRawMaterialCategory: "Tambah Kategori Bahan Baku",
    logout: "Keluar",
    logoutConfirm: "Yakin ingin keluar? Semua data akan direset.",
  },
  receipt: {
    title: "Transaksi Berhasil",
    date: "Tanggal",
    method: "Pembayaran",
    total: "TOTAL",
    discount: "Diskon",
    close: "Selesai",
    customer: "Pelanggan",
  },
  confirm: {
    yes: "Ya",
    no: "Batal",
    payConfirm: "Konfirmasi pembayaran?",
  },
};

export function getSimCopy(locale: string): SimCopy {
  return locale === "id" ? id : en;
}
