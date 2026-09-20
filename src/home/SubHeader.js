import React from "react";
import "./Header.css";
import { useNavigate, useLocation } from "react-router-dom";

const SubHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sub-header">
      <ul>
        <li
          className={isActive("/admin/dashboard") ? "active" : ""}
          onClick={() => navigate("/admin/dashboard")}
        >
          ⚡ Overview
        </li>
        <li
          className={isActive("/user") || isActive("/") ? "active" : ""}
          onClick={() => navigate("/user")}
        >
          👤 Users
        </li>
        <li
          className={isActive("/admin/notifications") ? "active" : ""}
          onClick={() => navigate("/admin/notifications")}
        >
          🔔 Notifications & IST
        </li>
        <li
          className={isActive("/redeem") ? "active" : ""}
          onClick={() => navigate("/redeem")}
        >
          💳 Redeem Payouts
        </li>
        <li
          className={isActive("/admin/LuckyDrawAdmin") ? "active" : ""}
          onClick={() => navigate("/admin/LuckyDrawAdmin")}
        >
          🎯 Lucky Draw Admin
        </li>
        <li
          className={isActive("/admin/createluckydraw") ? "active" : ""}
          onClick={() => navigate("/admin/createluckydraw")}
        >
          ⚙️ Create Draw
        </li>
        <li
          className={isActive("/admin/winner-history") ? "active" : ""}
          onClick={() => navigate("/admin/winner-history")}
        >
          🏆 Winners
        </li>
        <li
          className={isActive("/admin/delete-requests") ? "active" : ""}
          onClick={() => navigate("/admin/delete-requests")}
        >
          🗑️ Account Deletions
        </li>
      </ul>
    </nav>
  );
};

export default SubHeader;
