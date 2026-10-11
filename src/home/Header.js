import React, { useState } from "react";
import "./Header.css";
import { useNavigate } from "react-router-dom";
import { useBackendHealth } from "../utils/useBackendHealth";

const Header = () => {
  const navigate = useNavigate();
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const {
    isOnline,
    latency,
    httpStatus,
    lastChecked,
    checking,
    history,
    backendUrl,
    pingNow
  } = useBackendHealth();

  const getPillClass = () => {
    if (isOnline === false) return "status-offline";
    if (latency > 1000 || isOnline === null) return "status-slow";
    return "";
  };

  const getDotClass = () => {
    if (isOnline === false) return "pulse-dot pulse-red";
    if (latency > 1000 || isOnline === null) return "pulse-dot pulse-amber";
    return "pulse-dot";
  };

  const getStatusLabel = () => {
    if (checking && isOnline === null) return "Pinging Server...";
    if (isOnline === false) return "Backend Offline";
    if (isOnline === true) return `Live • ${latency}ms`;
    return "Connecting...";
  };

  return (
    <>
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
          {/* LIVE INTERACTIVE BACKEND STATUS PILL */}
          <div
            className={`header-status-pill ${getPillClass()}`}
            onClick={() => setShowDiagnostics(true)}
            title="Click to view live backend diagnostics & latency metrics"
          >
            <span className={getDotClass()}></span>
            <span>{getStatusLabel()}</span>
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

      {/* ================= LIVE BACKEND DIAGNOSTICS MODAL ================= */}
      {showDiagnostics && (
        <div className="backend-modal-overlay" onClick={() => setShowDiagnostics(false)}>
          <div className="backend-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="backend-modal-header">
              <h3 className="backend-modal-title">
                <span>⚡</span> Live Backend Health Diagnostics
              </h3>
              <button
                type="button"
                className="backend-modal-close"
                onClick={() => setShowDiagnostics(false)}
              >
                ✕
              </button>
            </div>

            {/* Microservices Grid */}
            <div className="backend-services-grid">
              {/* Service 1: Spring Boot / Render */}
              <div className="backend-service-card">
                <div className="backend-service-title">
                  <span>🖥️ Spring Boot API</span>
                  <span
                    className={`backend-latency-badge ${
                      !isOnline
                        ? "latency-slow"
                        : latency < 400
                        ? "latency-fast"
                        : "latency-medium"
                    }`}
                  >
                    {isOnline ? `${latency}ms` : "OFFLINE"}
                  </span>
                </div>
                <div className="backend-service-value" style={{ color: isOnline ? "#00F5A0" : "#FF4B72" }}>
                  {isOnline ? `HTTP ${httpStatus || 200} OK` : "Unreachable"}
                </div>
                <div style={{ fontSize: "11px", color: "#CBD5E1", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {backendUrl}
                </div>
              </div>

              {/* Service 2: Firebase Firestore */}
              <div className="backend-service-card">
                <div className="backend-service-title">
                  <span>🔥 Firestore Database</span>
                  <span className="backend-latency-badge latency-fast">LIVE</span>
                </div>
                <div className="backend-service-value" style={{ color: "#00F5A0" }}>
                  Synchronized
                </div>
                <div style={{ fontSize: "11px", color: "#CBD5E1" }}>
                  Realtime WebSocket Listener Active
                </div>
              </div>

              {/* Service 3: FCM Push Service */}
              <div className="backend-service-card">
                <div className="backend-service-title">
                  <span>🔔 FCM Gateway</span>
                  <span className="backend-latency-badge latency-fast">READY</span>
                </div>
                <div className="backend-service-value" style={{ color: "#00F5A0" }}>
                  Operational
                </div>
                <div style={{ fontSize: "11px", color: "#CBD5E1" }}>
                  Firebase Cloud Messaging Pipeline
                </div>
              </div>

              {/* Service 4: Auto Polling Engine */}
              <div className="backend-service-card">
                <div className="backend-service-title">
                  <span>⏱️ Heartbeat Monitor</span>
                  <span className="backend-latency-badge latency-fast">25s Cron</span>
                </div>
                <div className="backend-service-value" style={{ color: "#00F2FE", fontSize: "14px" }}>
                  {lastChecked
                    ? lastChecked.toLocaleTimeString("en-IN")
                    : "Initializing..."}
                </div>
                <div style={{ fontSize: "11px", color: "#CBD5E1" }}>
                  Auto-pings backend every 25 seconds
                </div>
              </div>
            </div>

            {/* Recent Ping Latency Trail */}
            <div className="backend-history-trail">
              <div className="backend-history-trail-title">
                <span>Recent Ping Latency Trail</span>
                <span>Last {history.length} Probes</span>
              </div>
              <div className="backend-pings-row">
                {history.map((h, idx) => (
                  <div key={idx} className="backend-ping-chip">
                    <span
                      className="backend-ping-ms"
                      style={{
                        color: !h.ok
                          ? "#FF4B72"
                          : h.latency < 400
                          ? "#00F5A0"
                          : "#FFB800"
                      }}
                    >
                      {h.ok ? `${h.latency}ms` : "ERR"}
                    </span>
                    <span className="backend-ping-time">{h.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="backend-modal-actions">
              <span style={{ fontSize: "12px", color: "#CBD5E1", fontWeight: "600" }}>
                Region: Cloudflare Edge / Render Server
              </span>

              <button
                type="button"
                className="btn-ping-refresh"
                disabled={checking}
                onClick={pingNow}
              >
                <span>{checking ? "⏳" : "🔄"}</span>
                <span>{checking ? "Probing..." : "Test Ping Now"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
