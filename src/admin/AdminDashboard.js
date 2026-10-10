import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../Firebase";

const KPICard = ({ icon, label, value, sub, accent, badge, badgeClass, onClick }) => (
  <div
    className="glass-card"
    style={{
      padding: "22px",
      borderTop: `3px solid ${accent}`,
      cursor: onClick ? "pointer" : "default",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
    }}
    onClick={onClick}
    onMouseEnter={(e) => { if (onClick) e.currentTarget.style.transform = "translateY(-3px)"; }}
    onMouseLeave={(e) => { if (onClick) e.currentTarget.style.transform = "translateY(0)"; }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
      <span style={{ fontSize: "28px", lineHeight: 1 }}>{icon}</span>
      {badge != null && (
        <span className={`badge ${badgeClass || "badge-info"}`}>{badge}</span>
      )}
    </div>
    <div style={{ fontSize: "26px", fontWeight: "800", color: accent, lineHeight: 1.1, marginBottom: "4px" }}>
      {value}
    </div>
    <div style={{ fontSize: "12px", color: "#64748B", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "2px" }}>
      {label}
    </div>
    {sub && (
      <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "6px", fontWeight: "500" }}>{sub}</div>
    )}
  </div>
);

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalCoins: 0,
    totalTickets: 0,
    bannedUsers: 0,
    pendingRedeemsCount: 0,
    pendingRedeemsAmount: 0,
    completedRedeemsCount: 0,
    activeLuckyDraws: 0,
    totalDrawSlotsFilled: 0,
    activeOffers: 0,
    pendingConversions: 0,
    pendingDeletions: 0,
  });

  const [recentUsers, setRecentUsers] = useState([]);
  const [recentRedeems, setRecentRedeems] = useState([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  useEffect(() => {
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        let coins = 0, tickets = 0, banned = 0;
        const list = snap.docs.map((d) => {
          const data = d.data();
          coins += Number(data.coins) || 0;
          tickets += Number(data.tickets) || 0;
          if (
            (data.status || "").toUpperCase() === "BANNED" ||
            (data.account || "").toLowerCase() === "suspended"
          ) banned++;
          return { id: d.id, ...data };
        });
        list.sort((a, b) => {
          const t1 = a.created_at?.toDate?.()?.getTime() ?? (a.created_at || 0);
          const t2 = b.created_at?.toDate?.()?.getTime() ?? (b.created_at || 0);
          return t2 - t1;
        });
        setRecentUsers(list.slice(0, 5));
        setMetrics((prev) => ({
          ...prev,
          totalUsers: snap.size,
          totalCoins: coins,
          totalTickets: tickets,
          bannedUsers: banned,
        }));
        setLoadingMetrics(false);
      },
      (err) => console.error("Users metrics error:", err)
    );

    const unsubRedeems = onSnapshot(
      collection(db, "redeem_requests"),
      (snap) => {
        let pendingCount = 0, pendingAmount = 0, successCount = 0;
        const list = snap.docs.map((d) => {
          const data = d.data();
          const status = (data.status || "").toLowerCase();
          const amount = Number(data.amount) || 0;
          if (status === "pending") { pendingCount++; pendingAmount += amount; }
          else if (status === "success") successCount++;
          return { id: d.id, ...data };
        });
        list.sort((a, b) => {
          const t1 = a.created_at?.toDate?.()?.getTime() ?? 0;
          const t2 = b.created_at?.toDate?.()?.getTime() ?? 0;
          return t2 - t1;
        });
        setRecentRedeems(list.slice(0, 5));
        setMetrics((prev) => ({
          ...prev,
          pendingRedeemsCount: pendingCount,
          pendingRedeemsAmount: pendingAmount,
          completedRedeemsCount: successCount,
        }));
      },
      (err) => console.error("Redeems metrics error:", err)
    );

    const unsubDraws = onSnapshot(
      collection(db, "lucky_draws"),
      (snap) => {
        let active = 0, filledSlots = 0;
        snap.docs.forEach((d) => {
          const data = d.data();
          if (data.status === "OPEN") {
            active++;
            filledSlots += Number(data.filledSlots) || 0;
          }
        });
        setMetrics((prev) => ({ ...prev, activeLuckyDraws: active, totalDrawSlotsFilled: filledSlots }));
      },
      (err) => console.error("Draws metrics error:", err)
    );

    const unsubOffers = onSnapshot(
      collection(db, "offers"),
      (snap) => {
        const active = snap.docs.filter((d) => (d.data().status || "").toUpperCase() === "ACTIVE").length;
        setMetrics((prev) => ({ ...prev, activeOffers: active }));
      },
      (err) => console.error("Offers metrics error:", err)
    );

    const unsubConversions = onSnapshot(
      collection(db, "conversions"),
      (snap) => {
        const pending = snap.docs.filter((d) => (d.data().status || "").toUpperCase() === "PENDING").length;
        setMetrics((prev) => ({ ...prev, pendingConversions: pending }));
      },
      (err) => console.error("Conversions metrics error:", err)
    );

    const unsubDeletions = onSnapshot(
      collection(db, "account_delete_requests"),
      (snap) => {
        const pending = snap.docs.filter((d) => (d.data().status || "").toLowerCase() === "pending").length;
        setMetrics((prev) => ({ ...prev, pendingDeletions: pending }));
      },
      (err) => console.error("Deletions metrics error:", err)
    );

    return () => {
      unsubUsers();
      unsubRedeems();
      unsubDraws();
      unsubOffers();
      unsubConversions();
      unsubDeletions();
    };
  }, []);

  const fmt = (n) => Number(n || 0).toLocaleString();

  if (loadingMetrics) {
    return (
      <div style={{ padding: "60px", textAlign: "center" }}>
        <div style={{ fontSize: "32px", marginBottom: "16px" }}>⏳</div>
        <div style={{ color: "#64748B", fontWeight: "600" }}>Loading dashboard metrics...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: "1400px", margin: "0 auto" }}>

      {/* ── PAGE TITLE ── */}
      <div style={{ marginBottom: "28px" }}>
        <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: "#F8FAFC" }}>
          📊 Dashboard Overview
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B", fontWeight: "500" }}>
          Real-time metrics across the entire DailyKash platform
        </p>
      </div>

      {/* ── KPI GRID ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "18px",
        marginBottom: "32px",
      }}>
        <KPICard
          icon="👥"
          label="Total Players"
          value={fmt(metrics.totalUsers)}
          sub={`${metrics.bannedUsers} suspended`}
          accent="#818CF8"
          badge={metrics.bannedUsers > 0 ? `${metrics.bannedUsers} banned` : null}
          badgeClass="badge-danger"
          onClick={() => navigate("/user")}
        />
        <KPICard
          icon="🪙"
          label="Total Coins in Circulation"
          value={fmt(metrics.totalCoins)}
          sub={`${fmt(metrics.totalTickets)} tickets issued`}
          accent="#F59E0B"
        />
        <KPICard
          icon="💳"
          label="Pending Payout Requests"
          value={metrics.pendingRedeemsCount}
          sub={`₹${fmt(metrics.pendingRedeemsAmount)} pending • ${metrics.completedRedeemsCount} completed`}
          accent="#34D399"
          badge={metrics.pendingRedeemsCount > 0 ? "Action Required" : null}
          badgeClass="badge-pending"
          onClick={() => navigate("/redeem")}
        />
        <KPICard
          icon="🎯"
          label="Active Lucky Draws"
          value={metrics.activeLuckyDraws}
          sub={`${fmt(metrics.totalDrawSlotsFilled)} slots filled`}
          accent="#C084FC"
          onClick={() => navigate("/admin/LuckyDrawAdmin")}
        />
        <KPICard
          icon="🔗"
          label="Live Share & Earn Offers"
          value={metrics.activeOffers}
          sub={`${metrics.pendingConversions} pending conversions`}
          accent="#22D3EE"
          badge={metrics.pendingConversions > 0 ? metrics.pendingConversions : null}
          badgeClass="badge-info"
          onClick={() => navigate("/admin/share-earn")}
        />
        <KPICard
          icon="🗑️"
          label="Account Deletion Requests"
          value={metrics.pendingDeletions}
          sub="7-day grace period enforced"
          accent={metrics.pendingDeletions > 0 ? "#FBBF24" : "#64748B"}
          badge={metrics.pendingDeletions > 0 ? "Review Now" : null}
          badgeClass="badge-pending"
          onClick={() => navigate("/admin/delete-requests")}
        />
      </div>

      {/* ── ACTIVITY TABLES ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
        gap: "24px",
        marginBottom: "32px",
      }}>

        {/* Recent Payout Requests */}
        <div className="glass-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#F8FAFC", display: "flex", alignItems: "center", gap: "8px" }}>
              💳 Recent Payout Requests
            </h4>
            <button
              onClick={() => navigate("/redeem")}
              style={{ background: "transparent", border: "none", color: "#818CF8", fontSize: "12px", fontWeight: "700", cursor: "pointer", padding: "4px 8px", borderRadius: "6px" }}
              onMouseEnter={(e) => e.target.style.background = "rgba(99,102,241,0.1)"}
              onMouseLeave={(e) => e.target.style.background = "transparent"}
            >
              View All ({metrics.pendingRedeemsCount}) →
            </button>
          </div>

          {recentRedeems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#475569" }}>
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>📭</div>
              <div style={{ fontSize: "13px", fontWeight: "600" }}>No redemption requests yet</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {recentRedeems.map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "11px 14px",
                    background: "rgba(255, 255, 255, 0.03)",
                    borderRadius: "10px",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    transition: "border-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"}
                >
                  <div>
                    <div style={{ fontWeight: "700", color: "#F8FAFC", fontSize: "13px" }}>
                      {(r.type || "PAYOUT").toUpperCase()} · ₹{r.amount}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                      {r.payment_address || r.upi_id || r.bank_account || "No address on file"}
                    </div>
                  </div>
                  <span className={`badge ${
                    (r.status || "").toLowerCase() === "pending" ? "badge-pending" :
                    (r.status || "").toLowerCase() === "success" ? "badge-success" : "badge-danger"
                  }`}>
                    {r.status || "PENDING"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Latest Registrations */}
        <div className="glass-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#F8FAFC", display: "flex", alignItems: "center", gap: "8px" }}>
              👤 Latest Player Registrations
            </h4>
            <button
              onClick={() => navigate("/user")}
              style={{ background: "transparent", border: "none", color: "#818CF8", fontSize: "12px", fontWeight: "700", cursor: "pointer", padding: "4px 8px", borderRadius: "6px" }}
              onMouseEnter={(e) => e.target.style.background = "rgba(99,102,241,0.1)"}
              onMouseLeave={(e) => e.target.style.background = "transparent"}
            >
              Open Directory →
            </button>
          </div>

          {recentUsers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#475569" }}>
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>👤</div>
              <div style={{ fontSize: "13px", fontWeight: "600" }}>No users found</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {recentUsers.map((u) => (
                <div
                  key={u.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    background: "rgba(255, 255, 255, 0.03)",
                    borderRadius: "10px",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    transition: "border-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <img
                      src={u.profile_pic || u.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`}
                      alt="avatar"
                      style={{ width: "34px", height: "34px", borderRadius: "50%", background: "#1E293B", objectFit: "cover", flexShrink: 0 }}
                      onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${u.name || "U"}`; }}
                    />
                    <div>
                      <div style={{ fontWeight: "700", color: "#F8FAFC", fontSize: "13px" }}>
                        {u.name || "Anonymous Player"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748B" }}>
                        {u.email || `${u.id?.substring(0, 16)}...`}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontWeight: "700", color: "#F59E0B", fontSize: "12px" }}>
                      🪙 {Number(u.coins || 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: "11px", color: "#60A5FA", marginTop: "2px" }}>
                      🎟️ {Number(u.tickets || 0)} tickets
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── QUICK ACTIONS ── */}
      <div className="glass-card" style={{ padding: "22px" }}>
        <h4 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: "700", color: "#F8FAFC" }}>
          ⚡ Quick Actions
        </h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
          {[
            { label: "Create Lucky Draw", icon: "✨", path: "/admin/createluckydraw", color: "#6366F1" },
            { label: "Send Notification", icon: "🔔", path: "/admin/notifications", color: "#3B82F6" },
            { label: "Review Payouts", icon: "💳", path: "/redeem", color: "#10B981" },
            { label: "Manage Offers", icon: "🔗", path: "/admin/share-earn", color: "#06B6D4" },
            { label: "Winner History", icon: "🏆", path: "/admin/winner-history", color: "#F59E0B" },
            { label: "Delete Requests", icon: "🗑️", path: "/admin/delete-requests", color: "#EF4444" },
          ].map((action) => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 16px",
                background: `${action.color}18`,
                border: `1px solid ${action.color}35`,
                borderRadius: "10px",
                color: action.color,
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.18s ease",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${action.color}30`;
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `${action.color}18`;
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {action.icon} {action.label}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
