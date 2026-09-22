import React from "react";
import { Navigate } from "react-router-dom";

export default function AdminLogin() {
  // Admin authentication has been removed - redirect straight to the dashboard
  return <Navigate to="/admin/dashboard" replace />;
}
