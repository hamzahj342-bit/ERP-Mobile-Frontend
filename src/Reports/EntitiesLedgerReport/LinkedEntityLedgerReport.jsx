import React from "react";
import EntityLedgerReport from "./EntityLedgerReport";

const LinkedEntityLedgerReport = () => (
  <EntityLedgerReport
    pageTitle="Entity Ledger Report"
    entityType="linked"
    entityLabel="Linked Entity"
    description="View consolidated statements for entities acting as both active Customers and Suppliers — track combined payables and receivables in one place."
  />
);

export default LinkedEntityLedgerReport;
