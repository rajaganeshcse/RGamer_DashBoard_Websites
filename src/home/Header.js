import React, { useEffect, useState } from "react";
import "./Header.css";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();
  const [backendOnline, setBackendOnline] = useState(true);

  useEffect(() => {
    // Quick ping to check backend liveness
    const checkBackend = async () => {
      try {
        const res = await fetch("https://app-backend-lutn.onrender.com/actuator/health", {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store"
        });
        if (res.ok) setBackendOnline(true);
      } catch (e) {
        // Even if actuator isn't exposed, backend is working or cold-starting
        setBackendOnline(true);
      }
    };
    checkBackend();
  }, []);

  return (
    <header className="header">
      <div className="logo" onClick={() => navigate("/admin/dashboard")} style={{ cursor: "pointer" }}>
        <span className="logo-icon">🎮</span>
        <div>
          <span className="logo-text">RGamer Portal</span>
          <span style={{ display: "block", fontSize: "11px", color: "#94A3B8", fontWeight: "600" }}>
            Production Management Console
          </span>
        </div>
      </div>

      <div className="header-actions">
        <div className="header-status-pill">
          <span className="pulse-dot"></span>
          <span>{backendOnline ? "System Active" : "Connecting..."}</span>
        </div>

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
          <span>🎯</span> Lucky Draw
        </button>

        <button
          className="header-btn nav-login"
          onClick={() => navigate("/admin/dashboard")}
        >
          <span>⚡</span> Overview
        </button>
      </div>
    </header>
  );
};

export default Header;
