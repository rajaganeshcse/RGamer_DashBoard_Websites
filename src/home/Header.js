import React from "react";
import "./Header.css";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="header">
      <div className="logo" onClick={() => navigate("/admin/dashboard")} style={{ cursor: "pointer" }}>
        <span className="logo-icon">🎮</span>
        <span className="logo-text">RGamer Admin Portal</span>
      </div>

      <div className="header-actions">
        <button
          className="header-btn nav-notifications"
          onClick={() => navigate("/admin/notifications")}
        >
          <span>🔔</span> Notifications & IST
        </button>

        <button
          className="header-btn nav-draw"
          onClick={() => navigate("/admin/LuckyDrawAdmin")}
        >
          <span>🎯</span> Lucky Draw Admin
        </button>

        <button
          className="header-btn nav-login"
          onClick={() => navigate("/admin/dashboard")}
        >
          <span>📊</span> Admin Dashboard
        </button>
      </div>
    </header>
  );
};

export default Header;
