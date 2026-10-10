import React, { useEffect, useState } from "react";
import "./Header.css";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();
  const [backendOnline, setBackendOnline] = useState(null);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch("https://app-backend-lutn.onrender.com/actuator/health", {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: AbortSignal.timeout(5000)
        });
        setBackendOnline(res.ok);
      } catch {
        setBackendOnline(false);
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="header">
      <div className="logo" onClick={() => navigate("/admin/dashboard")} style={{ cursor: "pointer" }}>
        <span className="logo-icon">🎮</span>
        <div>
          <span className="logo-text">DailyKash</span>
          <span style={{ display: "block", fontSize: "11px", color: "#E2E8F0", fontWeight: "700" }}>
            Admin Console
          </span>
        </div>
      </div>

      <div className="header-actions">
        <div className={`header-status-pill ${backendOnline === false ? "status-offline" : ""}`}>
          <span className={backendOnline === false ? "pulse-dot pulse-red" : "pulse-dot"}></span>
          <span>
            {backendOnline === null ? "Connecting..." : backendOnline ? "System Live" : "Backend Offline"}
          </span>
        </div>

        <button className="header-btn nav-notifications" onClick={() => navigate("/admin/notifications")}>
          🔔 Notifications
        </button>

        <button className="header-btn nav-draw" onClick={() => navigate("/admin/LuckyDrawAdmin")}>
          🎯 Lucky Draw
        </button>

        <button className="header-btn nav-login" onClick={() => navigate("/admin/dashboard")}>
          ⚡ Overview
        </button>
      </div>
    </header>
  );
};

export default Header;
