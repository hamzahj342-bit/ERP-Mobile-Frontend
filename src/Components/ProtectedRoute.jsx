import React from "react";
import { Navigate } from "react-router-dom";
import { isTokenExpired, logout } from "../auth";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");

  if (!token || isTokenExpired()) {
    logout(); // clear storage
    return <Navigate to="/" replace />; // ✅ redirect to login page at "/"
  }

  return children;
};

export default ProtectedRoute;
