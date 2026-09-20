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
        <li className={isActive("/user") || isActive("/") ? "active" : ""} onClick={() => navigate("/user")}>
          👤 Users
        </li>
        <li className={isActive("/admin/notifications") ? "active" : ""} onClick={() => navigate("/admin/notifications")}>
          🔔 Notifications
        </li>
        <li className={isActive("/redeem") ? "active" : ""} onClick={() => navigate("/redeem")}>
          💳 Redeem Requests
        </li>
        <li className={isActive("/admin/LuckyDrawAdmin") ? "active" : ""} onClick={() => navigate("/admin/LuckyDrawAdmin")}>
          🎯 Lucky Draw Admin
        </li>
        <li className={isActive("/admin/createluckydraw") ? "active" : ""} onClick={() => navigate("/admin/createluckydraw")}>
          ⚙️ Draw Settings
        </li>
        <li className={isActive("/admin/winner-history") ? "active" : ""} onClick={() => navigate("/admin/winner-history")}>
          🏆 Winner History
        </li>
        <li className={isActive("/admin/createtour") ? "active" : ""} onClick={() => navigate("/admin/createtour")}>
          ⚔️ Tournaments
        </li>
      </ul>
    </nav>
  );
};

export default SubHeader;

