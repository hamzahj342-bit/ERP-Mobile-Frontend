import React from "react";
import EntityLedgerReport from "./EntityLedgerReport";

const EmployeeLedgerReport = () => (
  <EntityLedgerReport
    pageTitle="Employee Ledger Report"
    entityType="employee"
    entityLabel="Employee"
    description="Review payroll, advances, and salary ledger balances for your employee accounts."
  />
);

export default EmployeeLedgerReport;
