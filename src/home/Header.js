import React from "react";
import "./Header.css";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="header">
      <div className="logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
        🎮 Ganesh Gaming Portal
      </div>

      <div className="search-box">
        <input type="text" placeholder="Search users, draws..." />
        <button>Search</button>
      </div>

      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <button className="login-btn" onClick={() => navigate("/admin/LuckyDrawAdmin")}>
          🎯 Lucky Draw Admin
        </button>
        <button className="login-btn" onClick={() => navigate("/admin")} style={{ background: "linear-gradient(135deg, #6A1BFF, #2563eb)" }}>
          🔒 Admin Login
        </button>
      </div>
    </header>
  );
};

export default Header;

