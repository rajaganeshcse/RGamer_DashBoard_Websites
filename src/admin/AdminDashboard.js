import React from "react";
import { useNavigate } from "react-router-dom";
import CreateTournament from "./CreateTournament";
import TournamentList from "./TournamentList";

export default function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }} className="animate-fade-in">
      
      {/* ── HEADER BANNER ── */}
      <div
        className="glass-card"
        style={{
          padding: "28px 32px",
          marginBottom: "28px",
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(6, 182, 212, 0.15))",
          borderColor: "rgba(99, 102, 241, 0.4)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span className="badge badge-success">🟢 ADMIN ACTIVE</span>
            <span style={{ fontSize: "12px", color: "#94A3B8" }}>v2.4 Production Dashboard</span>
          </div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "800", color: "#F8FAFC", letterSpacing: "-0.5px" }}>
            ⚡ Executive Admin Control Center
          </h1>
          <p style={{ margin: "6px 0 0 0", fontSize: "14px", color: "#CBD5E1" }}>
            Real-time management of tournaments, FCM push notifications, lucky draws & account requests.
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button className="btn-glow" onClick={() => navigate("/admin/notifications")}>
            🔔 Notifications & IST Scheduler
          </button>
          <button className="btn-secondary" onClick={() => navigate("/user")}>
            👤 Users Directory
          </button>
        </div>
      </div>

      {/* ── QUICK NAV GRID ── */}
      <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "16px" }}>
        🚀 Quick Management Modules
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
          marginBottom: "32px"
        }}
      >
        <NavCard
          icon="🔔"
          label="Push Notifications"
          desc="Schedule daily IST push alerts & instant FCM broadcasts"
          color="#3B82F6"
          badge="AUTOMATED"
          onClick={() => navigate("/admin/notifications")}
        />
        <NavCard
          icon="🎰"
          label="Lucky Draw Events"
          desc="Create events, pick winners & track entry tickets"
          color="#8B5CF6"
          badge="ACTIVE"
          onClick={() => navigate("/admin/LuckyDrawAdmin")}
        />
        <NavCard
          icon="💸"
          label="Redeem Requests"
          desc="Fulfill UPI, bank transfers & voucher approvals"
          color="#10B981"
          badge="PAYOUTS"
          onClick={() => navigate("/redeem")}
        />
        <NavCard
          icon="🏅"
          label="Winner History"
          desc="Review verified lucky draw winner records"
          color="#F59E0B"
          badge="RECORDS"
          onClick={() => navigate("/admin/winner-history")}
        />
        <NavCard
          icon="🗑️"
          label="Account Deletions"
          desc="Review 7-day account deletion requests & suspensions"
          color="#EF4444"
          badge="SECURITY"
          onClick={() => navigate("/admin/delete-requests")}
        />
      </div>

      {/* ── MAIN MANAGEMENT SECTIONS ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        
        {/* CREATE TOURNAMENT */}
        <div className="glass-card" style={{ padding: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <span style={{ fontSize: "24px" }}>🏆</span>
            <div>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#F8FAFC" }}>
                Create New Tournament / Match
              </h2>
              <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#94A3B8" }}>
                Publish esports tournaments, match schedules, prize pools & room credentials.
              </p>
            </div>
          </div>
          <CreateTournament />
        </div>

        {/* TOURNAMENT LIST */}
        <div className="glass-card" style={{ padding: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <span style={{ fontSize: "24px" }}>📋</span>
            <div>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#F8FAFC" }}>
                Live & Upcoming Tournament Roster
              </h2>
              <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#94A3B8" }}>
                Edit room credentials, manage registered players & finalize match results.
              </p>
            </div>
          </div>
          <TournamentList />
        </div>

      </div>

    </div>
  );
}

/* ── NavCard Helper ── */
function NavCard({ icon, label, desc, color, badge, onClick }) {
  return (
    <div
      className="glass-card"
      onClick={onClick}
      style={{
        padding: "20px",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        borderTop: `3px solid ${color}`
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div
          style={{
            fontSize: "26px",
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "rgba(255, 255, 255, 0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid rgba(255, 255, 255, 0.08)"
          }}
        >
          {icon}
        </div>
        {badge && (
          <span
            style={{
              fontSize: "10px",
              fontWeight: "700",
              color,
              background: `rgba(255, 255, 255, 0.05)`,
              padding: "3px 8px",
              borderRadius: "12px",
              border: `1px solid ${color}40`
            }}
          >
            {badge}
          </span>
        )}
      </div>

      <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: "700", color: "#F8FAFC" }}>
        {label}
      </h4>
      <p style={{ margin: 0, fontSize: "12px", color: "#94A3B8", lineHeight: "1.5" }}>
        {desc}
      </p>
    </div>
  );
}
