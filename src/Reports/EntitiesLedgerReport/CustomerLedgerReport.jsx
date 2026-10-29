import React from "react";
import EntityLedgerReport from "./EntityLedgerReport";

const CustomerLedgerReport = () => (
  <EntityLedgerReport
    pageTitle="Customer Ledger Report"
    entityType="customer"
    entityLabel="Customer"
    description="View sales, receipts, and outstanding customer balances with an easy-to-use ledger interface."
  />
);

export default CustomerLedgerReport;
