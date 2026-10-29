// RBAC permission catalog (source of truth for the UI).
// Keys here MUST match the backend list in ERP-Backend/constants/permissions.js.

export const PERMISSION_GROUPS = [
  {
    group: "General",
    permissions: [
      { key: "dashboard", label: "Dashboard" },
      { key: "customers", label: "Customers" },
      { key: "suppliers", label: "Suppliers" },
      { key: "employees", label: "Employees" },
      { key: "adjustments", label: "Adjustments" },
      { key: "invoice_details", label: "Invoice Details" },
    ],
  },
  {
    group: "Inventory",
    permissions: [
      { key: "rm.materials_list", label: "Products / Fingerprint Lookup" },
      { key: "rm.stocks", label: "Stock" },
      { key: "rm.grn", label: "Goods Received Note" },
      { key: "rm.delivery_challan", label: "Delivery Challan" },
      { key: "rm.transactions", label: "Transactions" },
    ],
  },
  {
    group: "Finished Product",
    permissions: [
      { key: "fp.production", label: "FP Production" },
      { key: "fp.transactions", label: "FP Transactions" },
      { key: "fp.delivery_challan", label: "FP Delivery Challan" },
      { key: "fp.product_batches", label: "Product Batches" },
      { key: "fp.history", label: "FP History" },
    ],
  },
  {
    group: "Retail",
    permissions: [
      { key: "retail.transactions", label: "Retail Purchases, Sales & Returns" },
    ],
  },
  {
    group: "Wholesale",
    permissions: [
      { key: "wholesale.transactions", label: "Wholesale Purchases, Sales & Returns" },
    ],
  },
  {
    group: "POS",
    permissions: [
      { key: "pos.products", label: "POS Products" },
      { key: "pos.transactions", label: "POS Purchases, Sales & Returns" },
    ],
  },
  {
    group: "Chart of Account",
    permissions: [
      { key: "accounts.create", label: "Create Account" },
      { key: "accounts.transactions", label: "Transactions" },
    ],
  },
  {
    group: "Reports",
    permissions: [
      { key: "reports.entity_ledger", label: "Entity Ledger Report" },
      { key: "reports.profit_loss", label: "Profit & Loss Report" },
      { key: "reports.accounts", label: "Accounts Report" },
      { key: "reports.sales", label: "Sales Detail Report" },
      { key: "reports.production", label: "Production Analytics Report" },
      { key: "reports.stock", label: "Inventory & Stock Report" },
      { key: "reports.balance_summary", label: "Balance Summary" },
      { key: "reports.capital", label: "Capital & Net Worth Report" },
      { key: "reports.trial_balance", label: "Trial Balance" },
      { key: "reports.segmented_pl", label: "Segmented Profit & Loss" },
      { key: "reports.history", label: "Phone History & Profit" },
      { key: "reports.sales_register", label: "Sales Register Report" },
      { key: "reports.purchase_register", label: "Purchase Register Report" },
      { key: "reports.receivable_register", label: "Receivable Register Report" },
      { key: "reports.cash_report", label: "Cash / Voucher Report" },
      { key: "reports.stock_ledger", label: "Stock Ledger Report" },
      { key: "reports.inventory_adjustment", label: "Inventory Adjustment Report" },
      { key: "reports.payable_receivable", label: "Payable & Receivable Report" },
      { key: "reports.balance_sheet", label: "Balance Sheet" },
    ],
  },
  {
    // Shown only to Super Admin (users.manage) when creating/editing roles.
    group: "Administration",
    permissions: [
      { key: "roles.manage", label: "Manage Roles & Edit Users" },
      { key: "users.manage", label: "Create Users & Manage Companies" },
    ],
  },
];

export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => p.key)
);

export const ADMIN_PERMISSION_KEYS = (
  PERMISSION_GROUPS.find((g) => g.group === "Administration")?.permissions || []
).map((p) => p.key);

export const REPORT_PERMISSION_KEYS = (
  PERMISSION_GROUPS.find((g) => g.group === "Reports")?.permissions || []
).map((p) => p.key);

// Groups visible in RoleForm: Full Access does not see Administration.
export function getAssignablePermissionGroups() {
  if (hasPermission("users.manage")) return PERMISSION_GROUPS;
  return PERMISSION_GROUPS.filter((g) => g.group !== "Administration");
}

export function getUserPermissions() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return [];
    const user = JSON.parse(raw);
    return Array.isArray(user?.permissions) ? user.permissions : [];
  } catch {
    return [];
  }
}

export function hasPermission(key) {
  if (!key) return true;
  return getUserPermissions().includes(key);
}

export function hasAnyPermission(keys = []) {
  const perms = getUserPermissions();
  return keys.some((k) => perms.includes(k));
}
