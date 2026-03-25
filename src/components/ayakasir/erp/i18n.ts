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
    stockWarning: string;
    stockConfirmProceed: string;
    cashPaid: string;
    cashChange: string;
    cashPaidInsufficient: string;
    openCashier: string;
    openCashierTitle: string;
    openCashierHint: string;
    initialCashBalance: string;
    enterPin: string;
    openCashierBtn: string;
    sessionLocked: string;
    prevCashBalanceInfo: string;
    initialBalanceTooLow: string;
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
    warnProductTitle: string;
    warnNoCategory: string;
    warnNoBom: string;
    importCsv: string;
    downloadTemplate: string;
    importPreviewTitle: string;
    importPreviewHint: string;
    importConfirm: string;
    importDuplicate: string;
    importSuccess: string;
    importSkipped: string;
    importPlanLimit: string;
    importError: string;
    bulkDelete: string;
    bulkDeleteConfirm: string;
    rowsPerPage: string;
    importNewCategory: string;
    duplicateProduct: string;
    duplicateVariantName: string;
    newVariantOption: string;
    importBomMissingWarning: string;
    importBomUnitMismatchWarning: string;
    variantsTab: string;
    variantUsedIn: string;
    noVariants: string;
    addVariantName: string;
    editVariantName: string;
    duplicateVariantNameGlobal: string;
    applyPreset: string;
    selectPreset: string;
    noPresets: string;
    presetValues: string;
    presetAppliedTo: string;
    selectComponentVariant: string;
    bomPerVariant: string;
    bomCopyToAll: string;
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
    setMinStock: string;
    lowStockAlert: string;
    lowStockCount: (n: number) => string;
    deleteInventory: string;
    confirmDeleteInventory: string;
    hideZeroStock: string;
    showZeroStock: string;
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
    warnRawTitle: string;
    warnRawNoCategory: string;
    importCsv: string;
    downloadTemplate: string;
    importPreviewTitle: string;
    importPreviewHint: string;
    importConfirm: string;
    importDuplicate: string;
    importSuccess: string;
    importSkipped: string;
    importPlanLimit: string;
    importError: string;
    bulkDelete: string;
    bulkDeleteConfirm: string;
    rowsPerPage: string;
    catImportSuccess: string;
    catImportPlanLimit: string;
    catImportPreviewHint: string;
    catBulkDeleteConfirm: string;
    deleteCategoryTitle: string;
    deleteCategoryWithRaws: string;
    deleteCategoryKeepRaws: string;
    deleteCategoryRawCount: string;
    rawImportCsv: string;
    rawDownloadTemplate: string;
    rawImportPreviewTitle: string;
    rawImportPreviewHint: string;
    rawImportConfirm: string;
    rawImportDuplicate: string;
    rawImportSuccess: string;
    rawImportSkipped: string;
    rawImportPlanLimit: string;
    rawImportError: string;
    rawBulkDelete: string;
    rawBulkDeleteConfirm: string;
    rawRowsPerPage: string;
    rawImportNewCategory: string;
    variants: string;
    addVariantGroup: string;
    editVariantGroup: string;
    variantGroupName: string;
    groupValues: string;
    addValue: string;
    noGroups: string;
    deleteGroupConfirm: string;
    groupBulkDelete: string;
    groupBulkDeleteConfirm: string;
    duplicateGroup: string;
    duplicateGroupValue: string;
    duplicateGroupValueCrossGroup: (value: string, groupName: string) => string;
    groupDownloadTemplate: string;
    groupImportCsv: string;
    groupImportPreviewTitle: string;
    groupImportPreviewHint: string;
    groupImportConfirm: string;
    groupImportSuccess: string;
    groupImportError: string;
    groupImportClash: string;
    applyToProduct: string;
    applyPreset: string;
    appliedTo: string;
    variantGroupRowsPerPage: string;
    selectVariant: string;
    useVariants: string;
    noGroupValues: string;
    filterByCategory: string;
    searchRawMaterial: string;
    applyPresetInline: string;
    removeFromProduct: string;
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
    qrisImageTooLarge: string;
    qrisUploadError: string;
    qrisUploading: string;
    qrisImageHint: string;
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
    language: string;
    languageHint: string;
    closeCashier: string;
    closeCashierTitle: string;
    closeCashierConfirmHint: string;
    closeCashierReport: string;
    closeTime: string;
    cashierInCharge: string;
    openingBalance: string;
    closingBalance: string;
    totalTransactions: string;
    paymentBreakdown: string;
    totalSales: string;
    matchQuestion: string;
    matchYes: string;
    matchNo: string;
    mismatchNote: string;
    mismatchPlaceholder: string;
    closeCashierConfirmBtn: string;
    downloadReport: string;
    printReport: string;
    cashResetTitle: string;
    cashResetHint: string;
    cashResetEmpty: string;
    cashResetKeep: string;
    activeShift: string;
    shiftFrom: string;
    cashBalanceSection: string;
    debtSettlement: string;
    cashEmptiedNote: string;
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
    duplicatePhone: string;
    importDuplicatePhone: string;
    transactionHistory: string;
    customerStats: string;
    importCsv: string;
    downloadTemplate: string;
    importSuccess: string;
    importPlanLimit: string;
    importError: string;
    importInvalidRow: string;
    importPreviewTitle: string;
    importPreviewHint: string;
    importConfirm: string;
    importNewCategory: string;
    bulkDelete: string;
    bulkDeleteConfirm: string;
    rowsPerPage: string;
    deleteCategoryTitle: string;
    deleteCategoryWithCustomers: string;
    deleteCategoryKeepCustomers: string;
    deleteCategoryCustomerCount: string;
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
    confirmActivated: string;
    confirmActivatedHint: string;
    confirmGoToLogin: string;
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
    selected: string;
  };
  plan: {
    planSection: string;
    currentPlan: string;
    usage: string;
    startedAt: string;
    validUntil: string;
    daysRemaining: string;
    daysRemainingValue: (days: number) => string;
    planExpired: string;
    expiryTooltip: string;
    planPerintis: string;
    planTumbuh: string;
    planMapan: string;
    limitProducts: string;
    limitCustomers: string;
    limitRawMaterials: string;
    limitTransactions: string;
    limitStaff: string;
    limitReached: string;
    unlimited: string;
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
    stockWarning: "Some items have insufficient raw material stock:",
    stockConfirmProceed: "Stock is insufficient for some items. Proceed with payment anyway?",
    cashPaid: "Cash Paid",
    cashChange: "Change",
    cashPaidInsufficient: "Amount paid is less than total",
    openCashier: "Open Cashier",
    openCashierTitle: "Open Cashier Session",
    openCashierHint: "Enter the opening cash balance and your PIN to start the shift.",
    initialCashBalance: "Opening Cash Balance",
    enterPin: "PIN",
    openCashierBtn: "Open Cashier",
    sessionLocked: "Cashier session is not active. Please open the cashier to start.",
    prevCashBalanceInfo: "There is remaining cash from the previous session: {amount}. Opening balance cannot be lower than this amount.",
    initialBalanceTooLow: "Opening balance cannot be lower than the remaining cash: {amount}.",
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
    warnProductTitle: "Incomplete Product",
    warnNoCategory: "Category is not selected (product will be Uncategorized).",
    warnNoBom: "Bill of Materials (BOM) is not filled. Inventory won't be deducted automatically on sale.",
    importCsv: "Import CSV",
    downloadTemplate: "Download Template",
    importPreviewTitle: "Preview Import",
    importPreviewHint: "Review data before importing. Duplicate product names will be skipped. New categories will be created automatically.",
    importConfirm: "Import",
    importDuplicate: "duplicate",
    importSuccess: "Products imported successfully",
    importSkipped: "skipped (duplicate)",
    importPlanLimit: "Plan limit reached — remaining rows were not imported.",
    importError: "Failed to import CSV",
    bulkDelete: "Delete Selected",
    bulkDeleteConfirm: "Delete selected products? This cannot be undone.",
    rowsPerPage: "Rows",
    importNewCategory: "New",
    duplicateProduct: "A product with this name already exists.",
    duplicateVariantName: "Variant names within a product must be unique.",
    newVariantOption: "New variant name",
    importBomMissingWarning: "Some raw materials (✗) do not exist in the system and will be skipped on import.",
    importBomUnitMismatchWarning: "Some raw materials (⚠) have incompatible units with inventory and will be skipped on import.",
    variantsTab: "Preset Variants",
    variantUsedIn: "Used in",
    noVariants: "No variants yet",
    addVariantName: "Add Variant",
    editVariantName: "Edit Variant",
    duplicateVariantNameGlobal: "A variant with this name already exists.",
    applyPreset: "Apply Preset",
    selectPreset: "Select Preset",
    noPresets: "No variant presets available. Create presets in Purchasing > Variant Presets.",
    presetValues: "Values",
    presetAppliedTo: "Applied To",
    selectComponentVariant: "Variant",
    bomPerVariant: "BOM per Variant",
    bomCopyToAll: "Copy to all variants",
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
    setMinStock: "Min Stock",
    lowStockAlert: "Some items are running low on stock",
    lowStockCount: (n: number) => `${n} item${n === 1 ? "" : "s"} below minimum stock`,
    deleteInventory: "Delete",
    confirmDeleteInventory: "Delete this inventory row? This cannot be undone.",
    hideZeroStock: "Hide Zero Stock",
    showZeroStock: "Show Zero Stock",
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
    warnRawTitle: "Incomplete Raw Material",
    warnRawNoCategory: "Category is not selected (raw material will be Uncategorized).",
    importCsv: "Import CSV",
    downloadTemplate: "Download Template",
    importPreviewTitle: "Preview Import",
    importPreviewHint: "Review the data below before importing. Duplicate vendors will be skipped.",
    importConfirm: "Import",
    importDuplicate: "duplicate",
    importSuccess: "Vendors imported successfully",
    importSkipped: "skipped (duplicate)",
    importPlanLimit: "Plan limit reached — remaining rows were not imported.",
    importError: "Failed to import CSV",
    bulkDelete: "Delete Selected",
    bulkDeleteConfirm: "Delete selected vendors? This cannot be undone.",
    rowsPerPage: "Rows",
    catImportSuccess: "Categories imported successfully",
    catImportPlanLimit: "Plan limit reached — remaining rows were not imported.",
    catImportPreviewHint: "Review the data below before importing. Duplicate categories will be skipped.",
    catBulkDeleteConfirm: "Delete selected categories? This cannot be undone.",
    deleteCategoryTitle: "Delete Category",
    deleteCategoryWithRaws: "Delete category and all its raw materials",
    deleteCategoryKeepRaws: "Delete category only, keep raw materials",
    deleteCategoryRawCount: "raw materials in this category",
    rawImportCsv: "Import CSV",
    rawDownloadTemplate: "Download Template",
    rawImportPreviewTitle: "Preview Import",
    rawImportPreviewHint: "Review the data below before importing. Duplicates will be skipped. New categories and preset variants will be created automatically.",
    rawImportConfirm: "Import",
    rawImportDuplicate: "duplicate",
    rawImportSuccess: "Raw materials imported successfully",
    rawImportSkipped: "skipped (duplicate)",
    rawImportPlanLimit: "Plan limit reached — remaining rows were not imported.",
    rawImportError: "Failed to import CSV",
    rawBulkDelete: "Delete Selected",
    rawBulkDeleteConfirm: "Delete selected raw materials? This cannot be undone.",
    rawRowsPerPage: "Rows",
    rawImportNewCategory: "New",
    variants: "Variant Presets",
    addVariantGroup: "Add Preset",
    editVariantGroup: "Edit Preset",
    variantGroupName: "Preset Name",
    groupValues: "Values",
    addValue: "Add Value",
    noGroups: "No variant presets yet",
    deleteGroupConfirm: "Delete this variant preset? All applied variants on products will also be removed.",
    groupBulkDelete: "Delete Selected",
    groupBulkDeleteConfirm: "Delete selected presets? All applied variants on products will also be removed. This cannot be undone.",
    duplicateGroup: "A preset with this name already exists.",
    duplicateGroupValue: "A value with this name already exists in this preset.",
    duplicateGroupValueCrossGroup: (v: string, g: string) => `Value "${v}" already exists in another preset "${g}". Each value must be unique across all presets.`,
    groupDownloadTemplate: "Download Template",
    groupImportCsv: "Import CSV",
    groupImportPreviewTitle: "Preview Import",
    groupImportPreviewHint: "Review the data below before importing. Duplicate preset names will be skipped. Values that clash with existing presets will be skipped.",
    groupImportConfirm: "Import",
    groupImportSuccess: "Preset variants imported successfully",
    groupImportError: "Failed to import CSV",
    groupImportClash: "value clash",
    applyToProduct: "Apply to Raw Material",
    applyPreset: "Apply",
    appliedTo: "Applied To",
    variantGroupRowsPerPage: "Rows",
    selectVariant: "Select Variant",
    useVariants: "Use Variants",
    noGroupValues: "Add at least one value",
    filterByCategory: "Category",
    searchRawMaterial: "Search item...",
    applyPresetInline: "Apply Preset",
    removeFromProduct: "Remove",
  },
  settings: {
    title: "Settings",
    businessSection: "Business",
    paymentMethods: "Payment Methods",
    enableCash: "Cash",
    enableQris: "QRIS",
    enableTransfer: "Transfer",
    enableUtang: "Debt (UTANG)",
    paymentMethodsHint: "Enable or disable payment methods. At least 1 non-debt method must remain active.",
    qrisSettings: "QRIS Settings",
    qrisMerchantName: "QRIS Merchant Name",
    qrisImageUrl: "QRIS Image URL",
    qrisImageUrlHint: "Paste the public URL of your QRIS image.",
    qrisSaved: "QRIS settings saved.",
    uploadQris: "Upload QRIS Image",
    qrisImageTooLarge: "Image must be under 1 MB.",
    qrisUploadError: "Upload failed. Please try again.",
    qrisUploading: "Uploading…",
    qrisImageHint: "Upload a QRIS image (max 1 MB). JPG, PNG, or WebP.",
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
    language: "Language",
    languageHint: "Switch display language",
    closeCashier: "Close Cashier",
    closeCashierTitle: "End of Day Report",
    closeCashierConfirmHint: "Review the summary below before closing the cashier session.",
    closeCashierReport: "Cashier Report",
    closeTime: "Close Time",
    cashierInCharge: "Cashier",
    openingBalance: "Opening Balance",
    closingBalance: "Closing Balance",
    totalTransactions: "Total Transactions",
    paymentBreakdown: "Payment Breakdown",
    totalSales: "Total Sales",
    matchQuestion: "Does the cash balance match?",
    matchYes: "Match",
    matchNo: "Doesn't Match",
    mismatchNote: "Mismatch Note",
    mismatchPlaceholder: "Describe the discrepancy...",
    closeCashierConfirmBtn: "Close Cashier",
    downloadReport: "Download",
    printReport: "Print",
    cashResetTitle: "Cash Balance After Close",
    cashResetHint: "Have you collected all the cash? Choose what to do with the closing balance.",
    cashResetEmpty: "Empty cash balance (reset to Rp0)",
    cashResetKeep: "Keep cash balance as opening balance",
    activeShift: "Active Shift",
    shiftFrom: "Shift from",
    cashBalanceSection: "Cash Balance Summary",
    debtSettlement: "Debt Settlement",
    cashEmptiedNote: "Cash emptied at session close",
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
    duplicatePhone: "A customer with this phone number already exists.",
    importDuplicatePhone: "skipped (duplicate phone)",
    transactionHistory: "Transaction History",
    customerStats: "Customer Stats",
    importCsv: "Import CSV",
    downloadTemplate: "Download Template",
    importSuccess: "Customers imported successfully",
    importPlanLimit: "Plan limit reached — remaining rows were not imported.",
    importError: "Failed to import CSV",
    importInvalidRow: "Invalid row skipped",
    importPreviewTitle: "Preview Import",
    importPreviewHint: "Review the data below before importing. New categories will be created automatically.",
    importConfirm: "Import",
    importNewCategory: "New",
    bulkDelete: "Delete Selected",
    bulkDeleteConfirm: "Delete selected customers? This cannot be undone.",
    rowsPerPage: "Rows",
    deleteCategoryTitle: "Delete Category",
    deleteCategoryWithCustomers: "Delete category and all its customers",
    deleteCategoryKeepCustomers: "Delete category only, keep customers",
    deleteCategoryCustomerCount: "customers in this category",
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
    confirmActivated: "Your account has been successfully activated!",
    confirmActivatedHint: "Your account is now active. You can sign in and start using AyaKasir.",
    confirmGoToLogin: "Sign in now",
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
    selected: "selected",
  },
  plan: {
    planSection: "Subscription Plan",
    currentPlan: "Current Plan",
    usage: "Usage",
    startedAt: "Started",
    validUntil: "Valid until",
    daysRemaining: "Days remaining",
    daysRemainingValue: (days: number) => days <= 0 ? "Expired" : `${days} day${days === 1 ? "" : "s"}`,
    planExpired: "Plan expired — limits reverted to Perintis",
    expiryTooltip: "If your plan is not renewed before the expiry date, your account will automatically revert to the Perintis (Free) plan. Your existing data will be preserved, but you will not be able to add new items beyond the Perintis limits.",
    planPerintis: "Perintis",
    planTumbuh: "Tumbuh",
    planMapan: "Mapan",
    limitProducts: "Products",
    limitCustomers: "Customers",
    limitRawMaterials: "Raw Materials",
    limitTransactions: "Transactions this month",
    limitStaff: "Staff",
    limitReached: "Limit reached for your current plan.",
    unlimited: "Unlimited",
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
    stockWarning: "Beberapa item memiliki stok bahan baku tidak mencukupi:",
    stockConfirmProceed: "Stok tidak mencukupi untuk beberapa item. Tetap lanjutkan pembayaran?",
    cashPaid: "Uang Diterima",
    cashChange: "Kembalian",
    cashPaidInsufficient: "Jumlah yang dibayar kurang dari total",
    openCashier: "Buka Kasir",
    openCashierTitle: "Buka Sesi Kasir",
    openCashierHint: "Masukkan saldo kas awal dan PIN Anda untuk memulai shift.",
    initialCashBalance: "Saldo Kas Awal",
    enterPin: "PIN",
    openCashierBtn: "Buka Kasir",
    sessionLocked: "Sesi kasir belum aktif. Silakan buka kasir untuk memulai.",
    prevCashBalanceInfo: "Terdapat sisa kas dari sesi sebelumnya: {amount}. Saldo awal tidak boleh kurang dari jumlah ini.",
    initialBalanceTooLow: "Saldo awal tidak boleh kurang dari sisa kas: {amount}.",
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
    warnProductTitle: "Produk Belum Lengkap",
    warnNoCategory: "Kategori belum dipilih (produk akan masuk ke Tanpa Kategori).",
    warnNoBom: "Bahan Baku (BOM) belum diisi. Stok tidak akan terpotong otomatis saat produk terjual.",
    importCsv: "Impor CSV",
    downloadTemplate: "Unduh Template",
    importPreviewTitle: "Pratinjau Impor",
    importPreviewHint: "Periksa data sebelum mengimpor. Produk dengan nama duplikat akan dilewati. Kategori baru akan dibuat otomatis.",
    importConfirm: "Impor",
    importDuplicate: "duplikat",
    importSuccess: "Produk berhasil diimpor",
    importSkipped: "dilewati (duplikat)",
    importPlanLimit: "Batas paket tercapai — baris tersisa tidak diimpor.",
    importError: "Gagal mengimpor CSV",
    bulkDelete: "Hapus Terpilih",
    bulkDeleteConfirm: "Hapus produk yang dipilih? Tindakan ini tidak dapat dibatalkan.",
    rowsPerPage: "Baris",
    importNewCategory: "Baru",
    duplicateProduct: "Produk dengan nama ini sudah ada.",
    duplicateVariantName: "Nama varian dalam satu produk harus unik.",
    newVariantOption: "Nama varian baru",
    importBomMissingWarning: "Beberapa bahan baku (✗) tidak ditemukan di sistem dan akan dilewati saat impor.",
    importBomUnitMismatchWarning: "Beberapa bahan baku (⚠) memiliki satuan ukuran yang tidak sama dengan inventori dan akan dilewati saat impor.",
    variantsTab: "Preset Varian",
    variantUsedIn: "Dipakai di",
    noVariants: "Belum ada varian",
    addVariantName: "Tambah Varian",
    editVariantName: "Edit Varian",
    duplicateVariantNameGlobal: "Varian dengan nama ini sudah ada.",
    applyPreset: "Terapkan Preset",
    selectPreset: "Pilih Preset",
    noPresets: "Belum ada preset varian. Buat preset di Purchasing > Preset Varian.",
    presetValues: "Nilai",
    presetAppliedTo: "Diterapkan ke",
    selectComponentVariant: "Varian",
    bomPerVariant: "BOM per Varian",
    bomCopyToAll: "Salin ke semua varian",
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
    setMinStock: "Stok Minimum",
    lowStockAlert: "Beberapa item stoknya hampir habis",
    lowStockCount: (n: number) => `${n} item di bawah stok minimum`,
    deleteInventory: "Hapus",
    confirmDeleteInventory: "Hapus baris inventori ini? Tindakan ini tidak dapat dibatalkan.",
    hideZeroStock: "Sembunyikan Stok Kosong",
    showZeroStock: "Tampilkan Stok Kosong",
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
    warnRawTitle: "Bahan Baku Belum Lengkap",
    warnRawNoCategory: "Kategori belum dipilih (bahan baku akan masuk ke Tanpa Kategori).",
    importCsv: "Impor CSV",
    downloadTemplate: "Unduh Template",
    importPreviewTitle: "Pratinjau Impor",
    importPreviewHint: "Periksa data berikut sebelum mengimpor. Vendor duplikat akan dilewati.",
    importConfirm: "Impor",
    importDuplicate: "duplikat",
    importSuccess: "Vendor berhasil diimpor",
    importSkipped: "dilewati (duplikat)",
    importPlanLimit: "Batas paket tercapai — baris tersisa tidak diimpor.",
    importError: "Gagal mengimpor CSV",
    bulkDelete: "Hapus Terpilih",
    bulkDeleteConfirm: "Hapus vendor yang dipilih? Tindakan ini tidak dapat dibatalkan.",
    rowsPerPage: "Baris",
    catImportSuccess: "Kategori berhasil diimpor",
    catImportPlanLimit: "Batas paket tercapai — baris tersisa tidak diimpor.",
    catImportPreviewHint: "Periksa data berikut sebelum mengimpor. Kategori duplikat akan dilewati.",
    catBulkDeleteConfirm: "Hapus kategori yang dipilih? Tindakan ini tidak dapat dibatalkan.",
    deleteCategoryTitle: "Hapus Kategori",
    deleteCategoryWithRaws: "Hapus kategori beserta semua bahan bakunya",
    deleteCategoryKeepRaws: "Hapus kategori saja, pertahankan bahan baku",
    deleteCategoryRawCount: "bahan baku dalam kategori ini",
    rawImportCsv: "Impor CSV",
    rawDownloadTemplate: "Unduh Template",
    rawImportPreviewTitle: "Pratinjau Impor",
    rawImportPreviewHint: "Periksa data berikut sebelum mengimpor. Duplikat akan dilewati. Kategori baru dan preset varian akan dibuat otomatis.",
    rawImportConfirm: "Impor",
    rawImportDuplicate: "duplikat",
    rawImportSuccess: "Bahan baku berhasil diimpor",
    rawImportSkipped: "dilewati (duplikat)",
    rawImportPlanLimit: "Batas paket tercapai — baris tersisa tidak diimpor.",
    rawImportError: "Gagal mengimpor CSV",
    rawBulkDelete: "Hapus Terpilih",
    rawBulkDeleteConfirm: "Hapus bahan baku yang dipilih? Tindakan ini tidak dapat dibatalkan.",
    rawRowsPerPage: "Baris",
    rawImportNewCategory: "Baru",
    variants: "Preset Varian",
    addVariantGroup: "Tambah Preset",
    editVariantGroup: "Edit Preset",
    variantGroupName: "Nama Preset",
    groupValues: "Nilai",
    addValue: "Tambah Nilai",
    noGroups: "Belum ada preset varian",
    deleteGroupConfirm: "Hapus preset varian ini? Semua varian yang diterapkan pada produk juga akan dihapus.",
    groupBulkDelete: "Hapus Terpilih",
    groupBulkDeleteConfirm: "Hapus preset yang dipilih? Semua varian yang diterapkan pada produk juga akan dihapus. Tindakan ini tidak dapat dibatalkan.",
    duplicateGroup: "Preset dengan nama ini sudah ada.",
    duplicateGroupValue: "Nilai dengan nama ini sudah ada dalam preset ini.",
    duplicateGroupValueCrossGroup: (v: string, g: string) => `Nilai "${v}" sudah ada di preset lain "${g}". Setiap nilai harus unik di semua preset.`,
    groupDownloadTemplate: "Unduh Template",
    groupImportCsv: "Impor CSV",
    groupImportPreviewTitle: "Pratinjau Impor",
    groupImportPreviewHint: "Periksa data berikut sebelum mengimpor. Nama preset duplikat akan dilewati. Nilai yang bentrok dengan preset yang ada akan dilewati.",
    groupImportConfirm: "Impor",
    groupImportSuccess: "Preset varian berhasil diimpor",
    groupImportError: "Gagal mengimpor CSV",
    groupImportClash: "bentrok",
    applyToProduct: "Terapkan ke Bahan Baku",
    applyPreset: "Terapkan",
    appliedTo: "Diterapkan Ke",
    variantGroupRowsPerPage: "Baris",
    selectVariant: "Pilih Varian",
    useVariants: "Gunakan Varian",
    noGroupValues: "Tambahkan minimal satu nilai",
    filterByCategory: "Kategori",
    searchRawMaterial: "Cari item...",
    applyPresetInline: "Terapkan Preset",
    removeFromProduct: "Hapus",
  },
  settings: {
    title: "Pengaturan",
    businessSection: "Usaha",
    paymentMethods: "Metode Pembayaran",
    enableCash: "Tunai",
    enableQris: "QRIS",
    enableTransfer: "Transfer",
    enableUtang: "Utang (UTANG)",
    paymentMethodsHint: "Aktifkan atau nonaktifkan metode pembayaran. Minimal 1 metode selain Utang harus tetap aktif.",
    qrisSettings: "Pengaturan QRIS",
    qrisMerchantName: "Nama Merchant QRIS",
    qrisImageUrl: "URL Gambar QRIS",
    qrisImageUrlHint: "Tempel URL publik dari gambar QRIS Anda.",
    qrisSaved: "Pengaturan QRIS berhasil disimpan.",
    uploadQris: "Unggah Gambar QRIS",
    qrisImageTooLarge: "Gambar harus di bawah 1 MB.",
    qrisUploadError: "Unggah gagal. Silakan coba lagi.",
    qrisUploading: "Mengunggah…",
    qrisImageHint: "Unggah gambar QRIS (maks 1 MB). JPG, PNG, atau WebP.",
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
    language: "Bahasa",
    languageHint: "Ganti bahasa tampilan",
    closeCashier: "Tutup Kasir",
    closeCashierTitle: "Laporan Akhir Hari",
    closeCashierConfirmHint: "Periksa ringkasan berikut sebelum menutup sesi kasir.",
    closeCashierReport: "Laporan Kasir",
    closeTime: "Waktu Tutup",
    cashierInCharge: "Kasir",
    openingBalance: "Saldo Awal",
    closingBalance: "Saldo Akhir",
    totalTransactions: "Total Transaksi",
    paymentBreakdown: "Rincian Pembayaran",
    totalSales: "Total Penjualan",
    matchQuestion: "Apakah saldo kas sesuai?",
    matchYes: "Sesuai",
    matchNo: "Tidak Sesuai",
    mismatchNote: "Catatan Ketidaksesuaian",
    mismatchPlaceholder: "Jelaskan ketidaksesuaiannya...",
    closeCashierConfirmBtn: "Tutup Kasir",
    downloadReport: "Unduh",
    printReport: "Cetak",
    cashResetTitle: "Saldo Kas Setelah Tutup",
    cashResetHint: "Apakah Anda sudah mengambil semua uang kas? Pilih tindakan untuk saldo akhir.",
    cashResetEmpty: "Kosongkan saldo kas (reset ke Rp0)",
    cashResetKeep: "Pertahankan saldo kas sebagai saldo awal",
    activeShift: "Shift Aktif",
    shiftFrom: "Shift mulai",
    cashBalanceSection: "Rincian Saldo Kas",
    debtSettlement: "Pelunasan Utang",
    cashEmptiedNote: "Kas dikosongkan saat tutup kasir",
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
    duplicatePhone: "Pelanggan dengan nomor telepon ini sudah ada.",
    importDuplicatePhone: "dilewati (nomor telepon duplikat)",
    transactionHistory: "Riwayat Transaksi",
    customerStats: "Statistik Pelanggan",
    importCsv: "Impor CSV",
    downloadTemplate: "Unduh Template",
    importSuccess: "Pelanggan berhasil diimpor",
    importPlanLimit: "Batas paket tercapai — baris tersisa tidak diimpor.",
    importError: "Gagal mengimpor CSV",
    importInvalidRow: "Baris tidak valid dilewati",
    importPreviewTitle: "Pratinjau Impor",
    importPreviewHint: "Periksa data berikut sebelum mengimpor. Kategori baru akan dibuat otomatis.",
    importConfirm: "Impor",
    importNewCategory: "Baru",
    bulkDelete: "Hapus Terpilih",
    bulkDeleteConfirm: "Hapus pelanggan yang dipilih? Tindakan ini tidak dapat dibatalkan.",
    rowsPerPage: "Baris",
    deleteCategoryTitle: "Hapus Kategori",
    deleteCategoryWithCustomers: "Hapus kategori beserta semua pelanggannya",
    deleteCategoryKeepCustomers: "Hapus kategori saja, pertahankan pelanggan",
    deleteCategoryCustomerCount: "pelanggan dalam kategori ini",
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
    confirmActivated: "Akun Anda berhasil diaktifkan!",
    confirmActivatedHint: "Akun Anda sudah aktif. Silakan masuk dan mulai gunakan AyaKasir.",
    confirmGoToLogin: "Masuk sekarang",
    confirmRecoverySuccess: "Verifikasi berhasil. Mengalihkan ke reset password...",
    confirmError: "Aktivasi berhasil. Silakan login.",
    confirmRecoveryError: "Reset berhasil! Silakan klik link di bawah untuk reset ulang password.",
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
    selected: "terpilih",
  },
  plan: {
    planSection: "Paket Langganan",
    currentPlan: "Paket Saat Ini",
    usage: "Pemakaian",
    startedAt: "Dimulai",
    validUntil: "Berlaku sampai",
    daysRemaining: "Sisa hari",
    daysRemainingValue: (days: number) => days <= 0 ? "Kedaluwarsa" : `${days} hari`,
    planExpired: "Paket berakhir — batas kembali ke Perintis",
    expiryTooltip: "Jika paket Anda tidak diperpanjang sebelum tanggal berakhir, akun Anda akan otomatis kembali ke paket Perintis (Gratis). Data yang sudah ada akan tetap tersimpan, tetapi Anda tidak dapat menambah item baru melebihi batas paket Perintis.",
    planPerintis: "Perintis",
    planTumbuh: "Tumbuh",
    planMapan: "Mapan",
    limitProducts: "Produk",
    limitCustomers: "Pelanggan",
    limitRawMaterials: "Bahan Baku",
    limitTransactions: "Transaksi bulan ini",
    limitStaff: "Staf",
    limitReached: "Batas tercapai untuk paket Anda saat ini.",
    unlimited: "Tidak terbatas",
  },
};

const copies: Record<string, ErpCopy> = { en, id };

export function getErpCopy(locale: string): ErpCopy {
  return copies[locale] || copies.id;
}
