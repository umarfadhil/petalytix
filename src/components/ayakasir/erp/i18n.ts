export interface ErpCopy {
  nav: {
    dashboard: string;
    pos: string;
    products: string;
    inventory: string;
    purchasing: string;
    customers: string;
    settings: string;
    logout: string;
  };
  dashboard: {
    title: string;
    cashBalance: string;
    todaySales: string;
    monthSales: string;
    yearSales: string;
    totalTransactions: string;
    recentTransactions: string;
    topProducts: string;
    unpaidDebts: string;
    markPaid: string;
    noTransactions: string;
    noDebts: string;
    period: string;
    today: string;
    thisMonth: string;
    thisYear: string;
    customDate: string;
    qrisSales: string;
    cashSales: string;
    transferSales: string;
    utangTotal: string;
    rowsPerPage: string;
    cogs: string;
    cashFlowDetails: string;
    cashFlowIn: string;
    cashFlowOut: string;
    cashFlowNet: string;
    cashFlowType: string;
    cashFlowDesc: string;
    cashFlowAmount: string;
    cashWithdrawal: string;
    withdrawalAmount: string;
    withdrawalReason: string;
    withdrawalSuccess: string;
    manageDebts: string;
    debtCustomer: string;
    debtDate: string;
    debtAmount: string;
    settleDebt: string;
    selectSettleMethod: string;
    debtSettled: string;
  };
  pos: {
    title: string;
    search: string;
    allCategories: string;
    cart: string;
    emptyCart: string;
    addItems: string;
    checkout: string;
    clearCart: string;
    total: string;
    paymentMethod: string;
    cash: string;
    qris: string;
    utang: string;
    customerName: string;
    customerNamePlaceholder: string;
    searchCustomer: string;
    newCustomer: string;
    addCustomer: string;
    customerPhone: string;
    utangNote: string;
    transfer: string;
    confirmPayment: string;
    paymentSuccess: string;
    printReceipt: string;
    newTransaction: string;
    selectVariant: string;
    discount: string;
    noDiscount: string;
    amountDiscount: string;
    percentDiscount: string;
  };
  products: {
    title: string;
    menuItems: string;
    rawMaterials: string;
    addProduct: string;
    editProduct: string;
    name: string;
    category: string;
    price: string;
    active: string;
    inactive: string;
    type: string;
    description: string;
    variants: string;
    addVariant: string;
    variantName: string;
    priceAdjustment: string;
    bom: string;
    addComponent: string;
    rawMaterial: string;
    qty: string;
    unit: string;
    clone: string;
    noProducts: string;
    noCategory: string;
    categories: string;
    addCategory: string;
    editCategory: string;
    categoryName: string;
    sortOrder: string;
  };
  inventory: {
    title: string;
    product: string;
    currentStock: string;
    minStock: string;
    unit: string;
    adjustStock: string;
    movementType: string;
    movementTypes: { value: string; label: string }[];
    newQty: string;
    notes: string;
    notesPlaceholder: string;
    lowStock: string;
    noInventory: string;
  };
  purchasing: {
    title: string;
    goodsReceiving: string;
    vendors: string;
    rawMaterials: string;
    addReceiving: string;
    editReceiving: string;
    vendor: string;
    date: string;
    time: string;
    notes: string;
    items: string;
    addItem: string;
    costPerUnit: string;
    totalAmount: string;
    totalCost: string;
    addVendor: string;
    editVendor: string;
    vendorName: string;
    phone: string;
    address: string;
    noReceivings: string;
    noVendors: string;
    addRawMaterial: string;
    editRawMaterial: string;
    addRawCategory: string;
    noRawMaterials: string;
    newVendorOption: string;
    newRawMaterialOption: string;
    newRawCategoryOption: string;
    categories: string;
    itemCount: string;
    noCategories: string;
    vendorRequired: string;
    duplicateVendor: string;
    duplicateRawMaterial: string;
    duplicateRawCategory: string;
  };
  settings: {
    title: string;
    businessSection: string;
    paymentMethods: string;
    enableCash: string;
    enableQris: string;
    enableTransfer: string;
    enableUtang: string;
    paymentMethodsHint: string;
    qrisSettings: string;
    qrisMerchantName: string;
    qrisImageUrl: string;
    qrisImageUrlHint: string;
    qrisSaved: string;
    uploadQris: string;
    merchantName: string;
    initialBalance: string;
    setBalance: string;
    amount: string;
    userManagement: string;
    addUser: string;
    editUser: string;
    userName: string;
    userEmail: string;
    userPhone: string;
    userRole: string;
    userPassword: string;
    userPasswordHint: string;
    userActive: string;
    noUsers: string;
    featureAccess: string;
    featureAccessHint: string;
    featurePOS: string;
    featureDashboard: string;
    featureMenu: string;
    featureInventory: string;
    featurePurchasing: string;
    featureCustomers: string;
    featureSettings: string;
    categoryManagement: string;
    vendorManagement: string;
    csvExport: string;
    downloadCsv: string;
    csvDateFrom: string;
    csvDateTo: string;
    profile: string;
    changePassword: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  customers: {
    title: string;
    allCategories: string;
    search: string;
    addCustomer: string;
    editCustomer: string;
    name: string;
    phone: string;
    email: string;
    birthday: string;
    gender: string;
    genderMale: string;
    genderFemale: string;
    genderOther: string;
    genderNone: string;
    category: string;
    noCategory: string;
    notes: string;
    categories: string;
    addCategory: string;
    editCategory: string;
    categoryName: string;
    noCustomers: string;
    noCategories: string;
    transactions: string;
    totalSpent: string;
    duplicateCategory: string;
    transactionHistory: string;
    customerStats: string;
  };
  auth: {
    registerTitle: string;
    fullNameLabel: string;
    businessNameLabel: string;
    emailLabel: string;
    emailPlaceholder: string;
    phoneLabel: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    passwordMask: string;
    pinLabel: string;
    pinPlaceholder: string;
    provinceLabel: string;
    provincePlaceholder: string;
    cityLabel: string;
    cityPlaceholder: string;
    loginSubtitle: string;
    loginButton: string;
    noAccount: string;
    registerLink: string;
    forgotPassword: string;
    forgotSubtitle: string;
    forgotButton: string;
    forgotSuccess: string;
    registerButton: string;
    loading: string;
    registerSuccess: string;
    confirmTitle: string;
    confirming: string;
    confirmSuccess: string;
    confirmRecoverySuccess: string;
    confirmError: string;
    confirmRecoveryError: string;
    resetSubtitle: string;
    newPasswordLabel: string;
    confirmPasswordLabel: string;
    resetButton: string;
    resetSuccess: string;
    resetError: string;
    resetInvalid: string;
    resetMismatch: string;
    goToResetPassword: string;
    backToLogin: string;
    haveAccount: string;
    signIn: string;
    genericError: string;
  };
  common: {
    save: string;
    cancel: string;
    delete: string;
    confirm: string;
    edit: string;
    add: string;
    search: string;
    loading: string;
    error: string;
    success: string;
    noData: string;
    confirmDelete: string;
    deleteWarning: string;
    yes: string;
    no: string;
    close: string;
    back: string;
    actions: string;
  };
}

const en: ErpCopy = {
  nav: {
    dashboard: "Dashboard",
    pos: "POS",
    products: "Products",
    inventory: "Inventory",
    purchasing: "Purchasing",
    customers: "Customers",
    settings: "Settings",
    logout: "Logout",
  },
  dashboard: {
    title: "Dashboard",
    cashBalance: "Cash Balance",
    todaySales: "Today's Sales",
    monthSales: "This Month",
    yearSales: "This Year",
    totalTransactions: "Total Transactions",
    recentTransactions: "Recent Transactions",
    topProducts: "Top Products",
    unpaidDebts: "Unpaid Debts",
    markPaid: "Mark Paid",
    noTransactions: "No transactions yet",
    noDebts: "No unpaid debts",
    period: "Period",
    today: "Today",
    thisMonth: "This Month",
    thisYear: "This Year",
    customDate: "Custom Date",
    qrisSales: "QRIS Sales",
    cashSales: "Cash Sales",
    transferSales: "Transfer Sales",
    utangTotal: "Unpaid Debt (UTANG)",
    rowsPerPage: "Rows",
    cogs: "Cost of Goods",
    cashFlowDetails: "Cash Flow Details",
    cashFlowIn: "Total In",
    cashFlowOut: "Total Out",
    cashFlowNet: "Net Cash",
    cashFlowType: "Type",
    cashFlowDesc: "Description",
    cashFlowAmount: "Amount",
    cashWithdrawal: "Cash Withdrawal",
    withdrawalAmount: "Withdrawal Amount",
    withdrawalReason: "Reason",
    withdrawalSuccess: "Withdrawal recorded successfully",
    manageDebts: "Manage Unpaid Debts",
    debtCustomer: "Customer",
    debtDate: "Date",
    debtAmount: "Amount",
    settleDebt: "Settle",
    selectSettleMethod: "Select payment method to settle this debt:",
    debtSettled: "Debt settled successfully",
  },
  pos: {
    title: "Point of Sale",
    search: "Search products...",
    allCategories: "All",
    cart: "Cart",
    emptyCart: "Cart is empty",
    addItems: "Add items to start a transaction",
    checkout: "Checkout",
    clearCart: "Clear",
    total: "Total",
    paymentMethod: "Payment Method",
    cash: "Cash",
    qris: "QRIS",
    utang: "Debt",
    customerName: "Customer Name",
    customerNamePlaceholder: "Search by name or phone...",
    searchCustomer: "Search Customer",
    newCustomer: "+ New Customer",
    addCustomer: "Add Customer",
    customerPhone: "Phone Number",
    utangNote: "Note (Optional)",
    transfer: "Transfer",
    confirmPayment: "Confirm Payment",
    paymentSuccess: "Payment Successful!",
    printReceipt: "Print Receipt",
    newTransaction: "New Transaction",
    selectVariant: "Select Variant",
    discount: "Discount",
    noDiscount: "None",
    amountDiscount: "Amount",
    percentDiscount: "Percent",
  },
  products: {
    title: "Products",
    menuItems: "Menu Items",
    rawMaterials: "Raw Materials",
    addProduct: "Add Product",
    editProduct: "Edit Product",
    name: "Name",
    category: "Category",
    price: "Price",
    active: "Active",
    inactive: "Inactive",
    type: "Type",
    description: "Description",
    variants: "Variants",
    addVariant: "Add Variant",
    variantName: "Variant Name",
    priceAdjustment: "Price Adjustment",
    bom: "Bill of Materials",
    addComponent: "Add Component",
    rawMaterial: "Raw Material",
    qty: "Qty",
    unit: "Unit",
    clone: "Clone",
    noProducts: "No products yet",
    noCategory: "Uncategorized",
    categories: "Categories",
    addCategory: "Add Category",
    editCategory: "Edit Category",
    categoryName: "Category Name",
    sortOrder: "Sort Order",
  },
  inventory: {
    title: "Inventory",
    product: "Product",
    currentStock: "Current Stock",
    minStock: "Min Stock",
    unit: "Unit",
    adjustStock: "Adjust Stock",
    movementType: "Adjustment Type",
    movementTypes: [
      { value: "adjustment_in", label: "Stock Surplus" },
      { value: "adjustment_out", label: "Stock Shortage" },
      { value: "waste", label: "Expired / Damaged" },
    ],
    newQty: "New Quantity",
    notes: "Notes (Optional)",
    notesPlaceholder: "e.g. found extra stock, damaged goods",
    lowStock: "Low Stock",
    noInventory: "No inventory items",
  },
  purchasing: {
    title: "Purchasing",
    goodsReceiving: "Goods Receiving",
    vendors: "Vendors",
    addReceiving: "Add Receiving",
    editReceiving: "Edit Receiving",
    vendor: "Vendor",
    date: "Date",
    time: "Time",
    notes: "Notes",
    items: "Items",
    addItem: "Add Item",
    costPerUnit: "Cost/Unit",
    totalAmount: "Total Amount",
    totalCost: "Total Cost",
    addVendor: "Add Vendor",
    editVendor: "Edit Vendor",
    vendorName: "Vendor Name",
    phone: "Phone",
    address: "Address",
    noReceivings: "No goods receiving records",
    noVendors: "No vendors yet",
    rawMaterials: "Raw Materials",
    addRawMaterial: "Add Raw Material",
    editRawMaterial: "Edit Raw Material",
    addRawCategory: "Add Category",
    noRawMaterials: "No raw materials yet",
    newVendorOption: "+ New Vendor",
    newRawMaterialOption: "+ New Raw Material",
    newRawCategoryOption: "+ New Category",
    categories: "Categories",
    itemCount: "Items",
    noCategories: "No categories yet",
    vendorRequired: "Please select a vendor before saving.",
    duplicateVendor: "A vendor with this name already exists.",
    duplicateRawMaterial: "A raw material with this name already exists.",
    duplicateRawCategory: "A category with this name already exists.",
  },
  settings: {
    title: "Settings",
    businessSection: "Business",
    paymentMethods: "Payment Methods",
    enableCash: "Cash",
    enableQris: "QRIS",
    enableTransfer: "Transfer",
    enableUtang: "Debt (UTANG)",
    paymentMethodsHint: "Enable or disable payment methods available at checkout.",
    qrisSettings: "QRIS Settings",
    qrisMerchantName: "QRIS Merchant Name",
    qrisImageUrl: "QRIS Image URL",
    qrisImageUrlHint: "Paste the public URL of your QRIS image.",
    qrisSaved: "QRIS settings saved.",
    uploadQris: "Upload QRIS Image",
    merchantName: "Merchant Name",
    initialBalance: "Initial Balance",
    setBalance: "Set Initial Balance",
    amount: "Amount",
    userManagement: "User Management",
    addUser: "Add User",
    editUser: "Edit User",
    userName: "Name",
    userEmail: "Email",
    userPhone: "Phone",
    userRole: "Role",
    userPassword: "Password",
    userPasswordHint: "Leave blank to keep current password.",
    userActive: "Active",
    noUsers: "No users yet",
    featureAccess: "Feature Access",
    featureAccessHint: "Select which pages this cashier can access.",
    featurePOS: "POS (Cashier)",
    featureDashboard: "Dashboard",
    featureMenu: "Products & Menu",
    featureInventory: "Inventory",
    featurePurchasing: "Purchasing",
    featureCustomers: "Customers",
    featureSettings: "Settings",
    categoryManagement: "Category Management",
    vendorManagement: "Vendor Management",
    csvExport: "Export Data",
    downloadCsv: "Download CSV",
    csvDateFrom: "From",
    csvDateTo: "To",
    profile: "Profile",
    changePassword: "Change Password",
    currentPassword: "Current Password",
    newPassword: "New Password",
    confirmPassword: "Confirm Password",
  },
  customers: {
    title: "Customers",
    allCategories: "All",
    search: "Search by name or phone...",
    addCustomer: "Add Customer",
    editCustomer: "Edit Customer",
    name: "Name",
    phone: "Phone",
    email: "Email",
    birthday: "Birthday",
    gender: "Gender",
    genderMale: "Male",
    genderFemale: "Female",
    genderOther: "Other",
    genderNone: "Not specified",
    category: "Category",
    noCategory: "Uncategorized",
    notes: "Notes",
    categories: "Categories",
    addCategory: "Add Category",
    editCategory: "Edit Category",
    categoryName: "Category Name",
    noCustomers: "No customers yet",
    noCategories: "No categories yet",
    transactions: "Transactions",
    totalSpent: "Total Spent",
    duplicateCategory: "A category with this name already exists.",
    transactionHistory: "Transaction History",
    customerStats: "Customer Stats",
  },
  auth: {
    registerTitle: "Create a new account",
    fullNameLabel: "Full Name",
    businessNameLabel: "Business Name",
    emailLabel: "Email",
    emailPlaceholder: "email@example.com",
    phoneLabel: "Phone",
    passwordLabel: "Password",
    passwordPlaceholder: "Min. 6 characters",
    passwordMask: "••••••••",
    pinLabel: "6-digit PIN",
    pinPlaceholder: "Enter your 6-digit PIN",
    provinceLabel: "Province",
    provincePlaceholder: "Select province",
    cityLabel: "City / Regency",
    cityPlaceholder: "Select city / regency",
    loginSubtitle: "Sign in to ERP dashboard",
    loginButton: "Sign In",
    noAccount: "Don't have an account?",
    registerLink: "Register",
    forgotPassword: "Forgot password?",
    forgotSubtitle: "Enter your email to receive a reset link.",
    forgotButton: "Send reset link",
    forgotSuccess: "If the email is registered, we've sent a reset link.",
    registerButton: "Register",
    loading: "Loading...",
    registerSuccess: "Registration successful! Please check your email to confirm your account.",
    confirmTitle: "Activate Account",
    confirming: "Verifying your account...",
    confirmSuccess: "Account activated. Redirecting to login...",
    confirmRecoverySuccess: "Recovery verified. Redirecting to reset password...",
    confirmError: "Activation failed. Please request a new activation email.",
    confirmRecoveryError: "Recovery failed. Please request a new reset link.",
    resetSubtitle: "Set a new password for your account.",
    newPasswordLabel: "New Password",
    confirmPasswordLabel: "Confirm Password",
    resetButton: "Update Password",
    resetSuccess: "Password updated. Redirecting to login...",
    resetError: "Failed to update password. Please try again.",
    resetInvalid: "Password must be at least 6 characters.",
    resetMismatch: "Passwords do not match.",
    goToResetPassword: "Set new password",
    backToLogin: "Back to login",
    haveAccount: "Already have an account?",
    signIn: "Sign In",
    genericError: "An error occurred",
  },
  common: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    confirm: "Confirm",
    edit: "Edit",
    add: "Add",
    search: "Search",
    loading: "Loading...",
    error: "An error occurred",
    success: "Success",
    noData: "No data",
    confirmDelete: "Confirm Delete",
    deleteWarning: "Are you sure? This cannot be undone.",
    yes: "Yes",
    no: "No",
    close: "Close",
    back: "Back",
    actions: "Actions",
  },
};

const id: ErpCopy = {
  nav: {
    dashboard: "Dashboard",
    pos: "Kasir",
    products: "Produk",
    inventory: "Inventori",
    purchasing: "Pembelian",
    customers: "Pelanggan",
    settings: "Pengaturan",
    logout: "Keluar",
  },
  dashboard: {
    title: "Dashboard",
    cashBalance: "Saldo Kas",
    todaySales: "Penjualan Hari Ini",
    monthSales: "Bulan Ini",
    yearSales: "Tahun Ini",
    totalTransactions: "Total Transaksi",
    recentTransactions: "Transaksi Terbaru",
    topProducts: "Produk Terlaris",
    unpaidDebts: "Utang Belum Lunas",
    markPaid: "Lunasi",
    noTransactions: "Belum ada transaksi",
    noDebts: "Tidak ada utang",
    period: "Periode",
    today: "Hari Ini",
    thisMonth: "Bulan Ini",
    thisYear: "Tahun Ini",
    customDate: "Pilih Tanggal",
    qrisSales: "Penjualan QRIS",
    cashSales: "Penjualan Tunai",
    transferSales: "Penjualan Transfer",
    utangTotal: "Utang Belum Lunas",
    rowsPerPage: "Baris",
    cogs: "Harga Pokok",
    cashFlowDetails: "Detail Arus Kas",
    cashFlowIn: "Total Masuk",
    cashFlowOut: "Total Keluar",
    cashFlowNet: "Kas Bersih",
    cashFlowType: "Tipe",
    cashFlowDesc: "Keterangan",
    cashFlowAmount: "Jumlah",
    cashWithdrawal: "Tarik Tunai",
    withdrawalAmount: "Jumlah Penarikan",
    withdrawalReason: "Keterangan",
    withdrawalSuccess: "Penarikan berhasil dicatat",
    manageDebts: "Kelola Utang Belum Lunas",
    debtCustomer: "Pelanggan",
    debtDate: "Tanggal",
    debtAmount: "Jumlah",
    settleDebt: "Lunasi",
    selectSettleMethod: "Pilih metode pembayaran untuk melunasi utang ini:",
    debtSettled: "Utang berhasil dilunasi",
  },
  pos: {
    title: "Kasir",
    search: "Cari produk...",
    allCategories: "Semua",
    cart: "Keranjang",
    emptyCart: "Keranjang kosong",
    addItems: "Tambahkan item untuk memulai transaksi",
    checkout: "Bayar",
    clearCart: "Hapus",
    total: "Total",
    paymentMethod: "Metode Pembayaran",
    cash: "Tunai",
    qris: "QRIS",
    utang: "Utang",
    customerName: "Nama Pelanggan",
    customerNamePlaceholder: "Cari nama atau nomor HP...",
    searchCustomer: "Cari Pelanggan",
    newCustomer: "+ Pelanggan Baru",
    addCustomer: "Tambah Pelanggan",
    customerPhone: "Nomor HP",
    utangNote: "Catatan (Opsional)",
    transfer: "Transfer",
    confirmPayment: "Konfirmasi Pembayaran",
    paymentSuccess: "Pembayaran Berhasil!",
    printReceipt: "Cetak Struk",
    newTransaction: "Transaksi Baru",
    selectVariant: "Pilih Varian",
    discount: "Diskon",
    noDiscount: "Tanpa",
    amountDiscount: "Nominal",
    percentDiscount: "Persen",
  },
  products: {
    title: "Produk",
    menuItems: "Menu",
    rawMaterials: "Bahan Baku",
    addProduct: "Tambah Produk",
    editProduct: "Edit Produk",
    name: "Nama",
    category: "Kategori",
    price: "Harga",
    active: "Aktif",
    inactive: "Nonaktif",
    type: "Tipe",
    description: "Deskripsi",
    variants: "Varian",
    addVariant: "Tambah Varian",
    variantName: "Nama Varian",
    priceAdjustment: "Selisih Harga",
    bom: "Bahan Baku (BOM)",
    addComponent: "Tambah Komponen",
    rawMaterial: "Bahan Baku",
    qty: "Jumlah",
    unit: "Satuan",
    clone: "Duplikat",
    noProducts: "Belum ada produk",
    noCategory: "Tanpa Kategori",
    categories: "Kategori",
    addCategory: "Tambah Kategori",
    editCategory: "Edit Kategori",
    categoryName: "Nama Kategori",
    sortOrder: "Urutan",
  },
  inventory: {
    title: "Inventori",
    product: "Produk",
    currentStock: "Stok Saat Ini",
    minStock: "Stok Minimum",
    unit: "Satuan",
    adjustStock: "Sesuaikan Stok",
    movementType: "Jenis Penyesuaian",
    movementTypes: [
      { value: "adjustment_in", label: "Stok Berlebih" },
      { value: "adjustment_out", label: "Stok Berkurang" },
      { value: "waste", label: "Kadaluwarsa / Rusak" },
    ],
    newQty: "Jumlah Baru",
    notes: "Catatan (Opsional)",
    notesPlaceholder: "cth. stok lebih ditemukan, barang rusak",
    lowStock: "Stok Rendah",
    noInventory: "Tidak ada item inventori",
  },
  purchasing: {
    title: "Pembelian",
    goodsReceiving: "Penerimaan Barang",
    vendors: "Vendor",
    addReceiving: "Tambah Penerimaan",
    editReceiving: "Edit Penerimaan",
    vendor: "Vendor",
    date: "Tanggal",
    time: "Waktu",
    notes: "Catatan",
    items: "Item",
    addItem: "Tambah Item",
    costPerUnit: "Harga/Satuan",
    totalAmount: "Total Harga",
    totalCost: "Total Biaya",
    addVendor: "Tambah Vendor",
    editVendor: "Edit Vendor",
    vendorName: "Nama Vendor",
    phone: "Telepon",
    address: "Alamat",
    noReceivings: "Belum ada penerimaan barang",
    noVendors: "Belum ada vendor",
    rawMaterials: "Bahan Baku",
    addRawMaterial: "Tambah Bahan Baku",
    editRawMaterial: "Edit Bahan Baku",
    addRawCategory: "Tambah Kategori",
    noRawMaterials: "Belum ada bahan baku",
    newVendorOption: "+ Vendor Baru",
    newRawMaterialOption: "+ Bahan Baku Baru",
    newRawCategoryOption: "+ Kategori Baru",
    categories: "Kategori",
    itemCount: "Item",
    noCategories: "Belum ada kategori",
    vendorRequired: "Pilih vendor sebelum menyimpan.",
    duplicateVendor: "Vendor dengan nama ini sudah ada.",
    duplicateRawMaterial: "Bahan baku dengan nama ini sudah ada.",
    duplicateRawCategory: "Kategori dengan nama ini sudah ada.",
  },
  settings: {
    title: "Pengaturan",
    businessSection: "Usaha",
    paymentMethods: "Metode Pembayaran",
    enableCash: "Tunai",
    enableQris: "QRIS",
    enableTransfer: "Transfer",
    enableUtang: "Utang (UTANG)",
    paymentMethodsHint: "Aktifkan atau nonaktifkan metode pembayaran yang tersedia saat kasir.",
    qrisSettings: "Pengaturan QRIS",
    qrisMerchantName: "Nama Merchant QRIS",
    qrisImageUrl: "URL Gambar QRIS",
    qrisImageUrlHint: "Tempel URL publik dari gambar QRIS Anda.",
    qrisSaved: "Pengaturan QRIS berhasil disimpan.",
    uploadQris: "Unggah Gambar QRIS",
    merchantName: "Nama Merchant",
    initialBalance: "Saldo Awal",
    setBalance: "Atur Saldo Awal",
    amount: "Jumlah",
    userManagement: "Manajemen User",
    addUser: "Tambah User",
    editUser: "Edit User",
    userName: "Nama",
    userEmail: "Email",
    userPhone: "Telepon",
    userRole: "Role",
    userPassword: "Password",
    userPasswordHint: "Kosongkan untuk mempertahankan password saat ini.",
    userActive: "Aktif",
    noUsers: "Belum ada user",
    featureAccess: "Akses Fitur",
    featureAccessHint: "Pilih halaman yang dapat diakses kasir ini.",
    featurePOS: "Kasir (POS)",
    featureDashboard: "Dashboard",
    featureMenu: "Produk & Menu",
    featureInventory: "Inventori",
    featurePurchasing: "Pembelian",
    featureCustomers: "Pelanggan",
    featureSettings: "Pengaturan",
    categoryManagement: "Manajemen Kategori",
    vendorManagement: "Manajemen Vendor",
    csvExport: "Unduh Data",
    downloadCsv: "Unduh CSV",
    csvDateFrom: "Dari",
    csvDateTo: "Sampai",
    profile: "Profil",
    changePassword: "Ganti Password",
    currentPassword: "Password Lama",
    newPassword: "Password Baru",
    confirmPassword: "Konfirmasi Password",
  },
  customers: {
    title: "Pelanggan",
    allCategories: "Semua",
    search: "Cari nama atau nomor HP...",
    addCustomer: "Tambah Pelanggan",
    editCustomer: "Edit Pelanggan",
    name: "Nama",
    phone: "Nomor HP",
    email: "Email",
    birthday: "Tanggal Lahir",
    gender: "Jenis Kelamin",
    genderMale: "Laki-laki",
    genderFemale: "Perempuan",
    genderOther: "Lainnya",
    genderNone: "Tidak dipilih",
    category: "Kategori",
    noCategory: "Tanpa Kategori",
    notes: "Catatan",
    categories: "Kategori",
    addCategory: "Tambah Kategori",
    editCategory: "Edit Kategori",
    categoryName: "Nama Kategori",
    noCustomers: "Belum ada pelanggan",
    noCategories: "Belum ada kategori",
    transactions: "Transaksi",
    totalSpent: "Total Belanja",
    duplicateCategory: "Kategori dengan nama ini sudah ada.",
    transactionHistory: "Riwayat Transaksi",
    customerStats: "Statistik Pelanggan",
  },
  auth: {
    registerTitle: "Daftar akun baru",
    fullNameLabel: "Nama Lengkap",
    businessNameLabel: "Nama Usaha",
    emailLabel: "Email",
    emailPlaceholder: "email@contoh.com",
    phoneLabel: "Telepon",
    passwordLabel: "Password",
    passwordPlaceholder: "Min. 6 karakter",
    passwordMask: "••••••••",
    pinLabel: "PIN 6 digit",
    pinPlaceholder: "Masukkan PIN 6 digit",
    provinceLabel: "Provinsi",
    provincePlaceholder: "Pilih provinsi",
    cityLabel: "Kota / Kabupaten",
    cityPlaceholder: "Pilih kota / kabupaten",
    loginSubtitle: "Masuk ke dashboard ERP",
    loginButton: "Masuk",
    noAccount: "Belum punya akun?",
    registerLink: "Daftar",
    forgotPassword: "Lupa password?",
    forgotSubtitle: "Masukkan email Anda untuk menerima tautan reset.",
    forgotButton: "Kirim tautan reset",
    forgotSuccess: "Jika email terdaftar, kami sudah mengirim tautan reset.",
    registerButton: "Daftar",
    loading: "Memuat...",
    registerSuccess: "Pendaftaran berhasil! Silakan cek email Anda untuk konfirmasi akun.",
    confirmTitle: "Aktivasi Akun",
    confirming: "Memverifikasi akun...",
    confirmSuccess: "Akun berhasil diaktifkan. Mengalihkan ke halaman masuk...",
    confirmRecoverySuccess: "Verifikasi berhasil. Mengalihkan ke reset password...",
    confirmError: "Aktivasi gagal. Silakan minta email aktivasi ulang.",
    confirmRecoveryError: "Reset gagal. Silakan minta tautan reset ulang.",
    resetSubtitle: "Atur password baru untuk akun Anda.",
    newPasswordLabel: "Password Baru",
    confirmPasswordLabel: "Konfirmasi Password",
    resetButton: "Perbarui Password",
    resetSuccess: "Password berhasil diperbarui. Mengalihkan ke halaman masuk...",
    resetError: "Gagal memperbarui password. Silakan coba lagi.",
    resetInvalid: "Password minimal 6 karakter.",
    resetMismatch: "Konfirmasi password tidak cocok.",
    goToResetPassword: "Atur password baru",
    backToLogin: "Kembali ke halaman masuk",
    haveAccount: "Sudah punya akun?",
    signIn: "Masuk",
    genericError: "Terjadi kesalahan",
  },
  common: {
    save: "Simpan",
    cancel: "Batal",
    delete: "Hapus",
    confirm: "Konfirmasi",
    edit: "Edit",
    add: "Tambah",
    search: "Cari",
    loading: "Memuat...",
    error: "Terjadi kesalahan",
    success: "Berhasil",
    noData: "Tidak ada data",
    confirmDelete: "Konfirmasi Hapus",
    deleteWarning: "Yakin hapus? Tidak bisa dibatalkan.",
    yes: "Ya",
    no: "Tidak",
    close: "Tutup",
    back: "Kembali",
    actions: "Aksi",
  },
};

const copies: Record<string, ErpCopy> = { en, id };

export function getErpCopy(locale: string): ErpCopy {
  return copies[locale] || copies.id;
}
