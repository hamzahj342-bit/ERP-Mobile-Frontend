import React from "react";
import { Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { hasPermission, hasAnyPermission } from "../permissions";

// Wraps ProtectedRoute (auth check) and additionally enforces a permission.
// - `permission`: single required key
// - `anyPermission`: array; user needs at least one (used for the Reports hub)
// On missing permission, redirect to /dashboard (always-accessible landing).
const PermissionRoute = ({ permission, anyPermission, children }) => {
  const allowed = anyPermission
    ? hasAnyPermission(anyPermission)
    : hasPermission(permission);

  return (
    <ProtectedRoute>
      {allowed ? children : <Navigate to="/dashboard" replace />}
    </ProtectedRoute>
  );
};

export default PermissionRoute;
