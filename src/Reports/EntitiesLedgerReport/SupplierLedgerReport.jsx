import React from "react";
import EntityLedgerReport from "./EntityLedgerReport";

const SupplierLedgerReport = () => (
  <EntityLedgerReport
    pageTitle="Supplier Ledger Report"
    entityType="supplier"
    entityLabel="Supplier"
    description="View purchase, payment, and balance details for your suppliers in a simple ledger format."
  />
);

export default SupplierLedgerReport;
