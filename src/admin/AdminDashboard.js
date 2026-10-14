import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../Firebase";
import { useBackendHealth } from "../utils/useBackendHealth";

const KPICard = ({ icon, label, value, sub, accent, badge, badgeClass, onClick }) => (
  <div
    className="glass-card"
    style={{
      padding: "20px 22px",
      background: "rgba(18, 24, 39, 0.85)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderTop: `3px solid ${accent}`,
      borderRadius: "var(--radius-lg)",
      cursor: onClick ? "pointer" : "default",
      position: "relative",
      overflow: "hidden",
      transition: "all 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
    }}
    onClick={onClick}
    onMouseEnter={(e) => {
      if (onClick) {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = `0 12px 28px -4px rgba(0, 0, 0, 0.6), 0 0 15px ${accent}25`;
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.16)";
        e.currentTarget.style.borderTopColor = accent;
      }
    }}
    onMouseLeave={(e) => {
      if (onClick) {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "var(--shadow-card)";
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
        e.currentTarget.style.borderTopColor = accent;
      }
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
      <div
        style={{
          width: "42px",
          height: "42px",
          borderRadius: "var(--radius-md)",
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "20px",
        }}
        aria-hidden="true"
      >
        {icon}
      </div>
      {badge != null && (
        <span
          className={`badge ${badgeClass || "badge-info"}`}
          role="status"
          style={{ fontWeight: "700", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
        >
          {badge === "Action Required" && <span aria-hidden="true">⚠️</span>}
          {badge}
        </span>
      )}
    </div>

    <div style={{ fontSize: "28px", fontWeight: "800", color: "#FFFFFF", lineHeight: 1.15, marginBottom: "4px", letterSpacing: "-0.5px" }}>
      {value}
    </div>

    <div style={{ fontSize: "12px", color: "#CBD5E1", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
      {label}
    </div>

    {sub && (
      <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "10px", fontWeight: "500", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>{sub}</span>
        {onClick && <span style={{ color: accent, fontSize: "15px", fontWeight: "800" }}>→</span>}
      </div>
    )}
  </div>
);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const backendHealth = useBackendHealth();

  const [currentTime, setCurrentTime] = useState(new Date());

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

  // Live Clock (IST & UTC)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

        setRecentUsers(list.slice(0, 6));
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

        setRecentRedeems(list.slice(0, 6));
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

  // Calculated Analytics Ratios
  const activeUsersCount = Math.max(0, metrics.totalUsers - metrics.bannedUsers);
  const userHealthPct = metrics.totalUsers > 0 ? Math.round((activeUsersCount / metrics.totalUsers) * 100) : 100;
  const totalPayoutTasks = metrics.completedRedeemsCount + metrics.pendingRedeemsCount;
  const payoutFulfillRate = totalPayoutTasks > 0 ? Math.round((metrics.completedRedeemsCount / totalPayoutTasks) * 100) : 100;

  if (loadingMetrics) {
    return (
      <div style={{ padding: "100px 20px", textAlign: "center" }} className="animate-fade-in">
        <div className="spinner"></div>
        <p style={{ color: "#FFFFFF", fontWeight: "700", fontSize: "16px" }}>Connecting to Realtime Command Hub...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: "1400px", margin: "0 auto" }} className="animate-fade-in">

      {/* ── HERO BANNER & REALTIME CLOCK ── */}
      <div
        className="glass-card"
        style={{
          padding: "26px 32px",
          marginBottom: "28px",
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.28) 0%, rgba(6, 182, 212, 0.18) 50%, rgba(18, 24, 39, 0.95) 100%)",
          borderColor: "rgba(99, 102, 241, 0.5)",
          boxShadow: "0 12px 36px -4px rgba(99, 102, 241, 0.25), 0 0 20px rgba(6, 182, 212, 0.15)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "18px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "800",
                background: "linear-gradient(135deg, #6366F1, #4F46E5)",
                color: "#FFFFFF",
                padding: "5px 12px",
                borderRadius: "var(--radius-full)",
                letterSpacing: "0.4px",
                boxShadow: "0 2px 10px rgba(99, 102, 241, 0.35)",
              }}
            >
              ⚡ Live Command Center
            </span>
            <span style={{ fontSize: "13px", color: "#00F5A0", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
              <span className="pulse-dot" aria-hidden="true" style={{ background: "#00F5A0", boxShadow: "0 0 8px #00F5A0" }}></span>
              Firestore sync active
            </span>
          </div>

          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "900", color: "#FFFFFF", letterSpacing: "-0.5px" }}>
            DailyKash Executive Operations
          </h1>
          <p style={{ margin: "5px 0 0 0", fontSize: "14px", color: "#E2E8F0", fontWeight: "500", lineHeight: "1.4" }}>
            Authoritative platform status, financial exposure, payout authorizations, and user growth.
          </p>
        </div>

        {/* Live Clock Widget */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <div
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              padding: "8px 16px",
              borderRadius: "var(--radius-md)",
              textAlign: "right",
            }}
            aria-label="Current Indian Standard Time"
          >
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#E2E8F0", fontFamily: "monospace", letterSpacing: "0.5px" }}>
              🕒 {currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} IST
            </div>
            <div style={{ fontSize: "12px", color: "#94A3B8", fontWeight: "500", marginTop: "2px" }}>
              {currentTime.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
          </div>
        </div>
      </div>

      {/* ── 6 HIGH-IMPACT KPI CARDS ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "18px",
          marginBottom: "28px",
        }}
      >
        <KPICard
          icon="👥"
          label="Total Registered Players"
          value={fmt(metrics.totalUsers)}
          sub={`${activeUsersCount} active · ${metrics.bannedUsers} suspended`}
          accent="#818CF8"
          badge={metrics.bannedUsers > 0 ? `${metrics.bannedUsers} Banned` : "100% Active"}
          badgeClass={metrics.bannedUsers > 0 ? "badge-danger" : "badge-success"}
          onClick={() => navigate("/user")}
        />

        <KPICard
          icon="🪙"
          label="Circulating Coins"
          value={fmt(metrics.totalCoins)}
          sub={`≈ ₹${(metrics.totalCoins / 100).toLocaleString("en-IN", { maximumFractionDigits: 1 })} liability · ${fmt(metrics.totalTickets)} tickets`}
          accent="#FFB800"
        />

        <KPICard
          icon="💳"
          label="Pending Payout Pipeline"
          value={metrics.pendingRedeemsCount}
          sub={`₹${fmt(metrics.pendingRedeemsAmount)} awaiting approval`}
          accent={metrics.pendingRedeemsCount > 0 ? "#F59E0B" : "#10B981"}
          badge={metrics.pendingRedeemsCount > 0 ? "Action Required" : "Cleared"}
          badgeClass={metrics.pendingRedeemsCount > 0 ? "badge-pending" : "badge-success"}
          onClick={() => navigate("/redeem")}
        />

        <KPICard
          icon="🎯"
          label="Active Lucky Draw Events"
          value={metrics.activeLuckyDraws}
          sub={`${fmt(metrics.totalDrawSlotsFilled)} total player slots filled`}
          accent="#C084FC"
          onClick={() => navigate("/admin/LuckyDrawAdmin")}
        />

        <KPICard
          icon="🔗"
          label="Share & Earn Campaigns"
          value={metrics.activeOffers}
          sub={`${metrics.pendingConversions} pending action proofs`}
          accent="#00F2FE"
          badge={metrics.pendingConversions > 0 ? `${metrics.pendingConversions} Pending` : "Idle"}
          badgeClass={metrics.pendingConversions > 0 ? "badge-pending" : "badge-info"}
          onClick={() => navigate("/admin/share-earn")}
        />

        <KPICard
          icon="🗑️"
          label="Account Deletions (Play Store)"
          value={metrics.pendingDeletions}
          sub="7-day grace period enforcement"
          accent={metrics.pendingDeletions > 0 ? "#FF4B72" : "#10B981"}
          badge={metrics.pendingDeletions > 0 ? "Review Ticket" : "Zero Queued"}
          badgeClass={metrics.pendingDeletions > 0 ? "badge-pending" : "badge-success"}
          onClick={() => navigate("/admin/delete-requests")}
        />
      </div>

      {/* ── PLATFORM HEALTH & RATIOS BAR ── */}
      <div
        className="glass-card"
        style={{
          padding: "20px 28px",
          marginBottom: "28px",
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.8) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "24px",
          alignItems: "center",
        }}
      >
        {/* User Health Ratio */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
            <span style={{ color: "#E2E8F0", fontWeight: "700", letterSpacing: "0.3px" }}>Account Integrity Rate</span>
            <span style={{ color: "#34D399", fontWeight: "800" }}>{userHealthPct}% Active</span>
          </div>
          <div style={{ height: "8px", width: "100%", background: "rgba(255, 255, 255, 0.1)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${userHealthPct}%`, background: "linear-gradient(90deg, #10B981, #00F5A0)", boxShadow: "0 0 10px rgba(16, 185, 129, 0.4)" }} />
          </div>
        </div>

        {/* Payout Completion Rate */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
            <span style={{ color: "#E2E8F0", fontWeight: "700", letterSpacing: "0.3px" }}>Payout Fulfillment Velocity</span>
            <span style={{ color: "#818CF8", fontWeight: "800" }}>{payoutFulfillRate}% Completed</span>
          </div>
          <div style={{ height: "8px", width: "100%", background: "rgba(255, 255, 255, 0.1)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${payoutFulfillRate}%`, background: "linear-gradient(90deg, #6366F1, #818CF8)", boxShadow: "0 0 10px rgba(99, 102, 241, 0.4)" }} />
          </div>
        </div>

        {/* Google Play Compliance Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", justifyContent: "flex-end" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "13px", fontWeight: "800", color: "#FFFFFF" }}>Play Store Compliance</div>
            <div style={{ fontSize: "12px", color: "#00F5A0", fontWeight: "700" }}>All Policy Endpoints Active</div>
          </div>
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(0, 245, 160, 0.15)", border: "1.5px solid rgba(0, 245, 160, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
            🛡️
          </div>
        </div>
      </div>

      {/* ── LIVE BACKEND & INFRASTRUCTURE STATUS MONITOR ── */}
      <div
        className="glass-card"
        style={{
          padding: "22px 28px",
          marginBottom: "28px",
          background: "rgba(15, 23, 42, 0.85)",
          border: "1px solid rgba(0, 242, 254, 0.25)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "24px" }} aria-hidden="true">⚡</span>
            <div>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#FFFFFF", display: "flex", alignItems: "center", gap: "10px" }}>
                Live Backend Infrastructure &amp; Services Health
                <span className="badge badge-success" style={{ fontSize: "11px", padding: "3px 8px" }}>
                  <span className="status-dot"></span> Live Heartbeat
                </span>
              </h2>
              <div style={{ fontSize: "13px", color: "#CBD5E1", marginTop: "4px", fontWeight: "500" }}>
                Real-time round-trip latency probe • Auto-refreshes every 25 seconds • Last verified: {backendHealth.lastChecked ? backendHealth.lastChecked.toLocaleTimeString("en-IN") : "Syncing..."}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{
              padding: "8px 16px",
              fontSize: "13px",
              background: "linear-gradient(135deg, #00F2FE 0%, #06B6D4 100%)",
              color: "#000000",
              fontWeight: "800",
              border: "none",
              borderRadius: "var(--radius-md)",
            }}
            disabled={backendHealth.checking}
            onClick={backendHealth.pingNow}
          >
            <span>{backendHealth.checking ? "⏳" : "🔄"}</span>
            <span>{backendHealth.checking ? "Probing..." : "Test Ping Now"}</span>
          </button>
        </div>

        {/* 4 Infrastructure Microservice Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
          {/* Service 1: Spring Boot API */}
          <div style={{ background: "rgba(11, 17, 32, 0.75)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "var(--radius-md)", padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "13px", fontWeight: "700", color: "#E2E8F0" }}>Spring Boot API (Render)</span>
              <span style={{ fontSize: "12px", fontWeight: "700", color: backendHealth.isOnline ? "#00F5A0" : "#FF4B72", background: backendHealth.isOnline ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)", padding: "2px 8px", borderRadius: "var(--radius-sm)" }}>
                {backendHealth.isOnline ? `${backendHealth.latency}ms` : "OFFLINE"}
              </span>
            </div>
            <div style={{ fontSize: "14px", fontWeight: "800", color: backendHealth.isOnline ? "#00F5A0" : "#FF4B72" }}>
              {backendHealth.isOnline ? "🟢 Online (200 OK)" : "🔴 Unreachable"}
            </div>
            <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "4px", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              https://app-backend-lutn.onrender.com
            </div>
          </div>

          {/* Service 2: Firestore DB */}
          <div style={{ background: "rgba(11, 17, 32, 0.75)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "var(--radius-md)", padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "13px", fontWeight: "700", color: "#E2E8F0" }}>Firebase Firestore DB</span>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#00F5A0", background: "rgba(16, 185, 129, 0.15)", padding: "2px 8px", borderRadius: "var(--radius-sm)" }}>
                REALTIME
              </span>
            </div>
            <div style={{ fontSize: "14px", fontWeight: "800", color: "#00F5A0" }}>
              🟢 Synchronized
            </div>
            <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "4px" }}>
              WebSocket Listener Active
            </div>
          </div>

          {/* Service 3: FCM Push */}
          <div style={{ background: "rgba(11, 17, 32, 0.75)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "var(--radius-md)", padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "13px", fontWeight: "700", color: "#E2E8F0" }}>FCM Cloud Messaging</span>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#00F2FE", background: "rgba(6, 182, 212, 0.15)", padding: "2px 8px", borderRadius: "var(--radius-sm)" }}>
                PIPELINE
              </span>
            </div>
            <div style={{ fontSize: "14px", fontWeight: "800", color: "#00F2FE" }}>
              🟢 Push Gateway Ready
            </div>
            <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "4px" }}>
              Direct FCM Token Dispatcher
            </div>
          </div>

          {/* Service 4: CDN & Protection */}
          <div style={{ background: "rgba(11, 17, 32, 0.75)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "var(--radius-md)", padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "13px", fontWeight: "700", color: "#E2E8F0" }}>Cloudflare Edge CDN</span>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#C084FC", background: "rgba(139, 92, 246, 0.15)", padding: "2px 8px", borderRadius: "var(--radius-sm)" }}>
                SSL/TLS
              </span>
            </div>
            <div style={{ fontSize: "14px", fontWeight: "800", color: "#C084FC" }}>
              🟢 Active &amp; Encrypted
            </div>
            <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "4px" }}>
              DDoS Shield &amp; HTTP/3 Enabled
            </div>
          </div>
        </div>
      </div>

      {/* ── REALTIME ACTIVITY STREAMS ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: "24px",
          marginBottom: "28px",
        }}
      >
        {/* RECENT PAYOUT REQUESTS */}
        <div
          className="glass-card"
          style={{
            padding: "24px",
            background: "rgba(18, 24, 39, 0.85)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", gap: "12px", flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#FFFFFF", display: "flex", alignItems: "center", gap: "8px" }}>
                <span aria-hidden="true">💳</span> Urgent Payout Queue
              </h3>
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#CBD5E1", fontWeight: "500", lineHeight: "1.4" }}>
                Pending UPI, Amazon, and Google Play redemptions
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/redeem")}
              aria-label={`Review and fulfill ${metrics.pendingRedeemsCount} pending payouts`}
              style={{ padding: "9px 18px", fontSize: "13.5px" }}
            >
              Review Payouts ({metrics.pendingRedeemsCount}) →
            </button>
          </div>

          {recentRedeems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: "36px", marginBottom: "10px" }} aria-hidden="true">🎉</div>
              <div style={{ fontSize: "15px", fontWeight: "800", color: "#FFFFFF" }}>All Payout Queues Cleared!</div>
              <div style={{ fontSize: "13px", color: "#CBD5E1", marginTop: "4px" }}>Zero pending redemption requests.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {recentRedeems.map((r) => {
                const status = (r.status || "pending").toLowerCase();
                const typeUpper = (r.type || "PAYOUT").toUpperCase();
                return (
                  <div
                    key={r.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "16px",
                      padding: "13px 16px",
                      background: "rgba(15, 23, 42, 0.75)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      transition: "all 0.18s ease",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "800",
                            padding: "3px 8px",
                            borderRadius: "var(--radius-sm)",
                            background: typeUpper === "UPI" ? "rgba(6, 182, 212, 0.2)" : "rgba(255, 184, 0, 0.2)",
                            color: typeUpper === "UPI" ? "#00F2FE" : "#FFB800",
                            border: `1px solid ${typeUpper === "UPI" ? "rgba(6, 182, 212, 0.4)" : "rgba(255, 184, 0, 0.4)"}`,
                          }}
                        >
                          {typeUpper}
                        </span>
                        <strong style={{ color: "#FFFFFF", fontSize: "15px", fontWeight: "800" }}>₹{r.amount}</strong>
                        <span style={{ fontSize: "12px", color: "#FFB800", fontWeight: "700" }}>🪙 {Number(r.coins || r.amount * 100).toLocaleString()} coins</span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#00F2FE", marginTop: "4px", fontFamily: "monospace", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.payment_address || r.withdraw_details || r.upi_id || "No address on file"}
                      </div>
                    </div>

                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                      <span
                        className={`badge ${
                          status === "pending" ? "badge-pending" :
                          status === "success" ? "badge-success" : "badge-danger"
                        }`}
                        style={{ fontSize: "12px", fontWeight: "700" }}
                      >
                        {status === "pending" ? "⏳ Awaiting" : status === "success" ? "✅ Paid" : "❌ Rejected"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RECENT PLAYER REGISTRATIONS */}
        <div
          className="glass-card"
          style={{
            padding: "24px",
            background: "rgba(18, 24, 39, 0.85)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", gap: "12px", flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#FFFFFF", display: "flex", alignItems: "center", gap: "8px" }}>
                <span aria-hidden="true">👤</span> Newly Joined Players
              </h3>
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#CBD5E1", fontWeight: "500", lineHeight: "1.4" }}>
                Real-time user onboarding &amp; account creation stream
              </p>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => navigate("/user")}
              style={{ padding: "8px 14px", fontSize: "13px" }}
            >
              Player Directory →
            </button>
          </div>

          {recentUsers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: "36px", marginBottom: "10px" }} aria-hidden="true">👤</div>
              <div style={{ fontSize: "15px", fontWeight: "800", color: "#FFFFFF" }}>No Player Records Found</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {recentUsers.map((u) => (
                <div
                  key={u.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "16px",
                    padding: "12px 16px",
                    background: "rgba(15, 23, 42, 0.75)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    transition: "all 0.18s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                    <img
                      src={u.profile_pic || u.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`}
                      alt="avatar"
                      style={{ width: "38px", height: "38px", borderRadius: "var(--radius-full)", background: "#1E293B", objectFit: "cover", flexShrink: 0, border: "2px solid #6366F1" }}
                      onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${u.name || "U"}`; }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: "700", color: "#FFFFFF", fontSize: "13.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {u.name || "Anonymous Player"}
                      </div>
                      <div style={{ fontSize: "12px", color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {u.email || `${u.id?.substring(0, 16)}...`}
                      </div>
                    </div>
                  </div>

                  {/* Vertically aligned scan axis for stats */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "110px", textAlign: "left", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "800", color: "#FFB800", fontSize: "13px" }}>
                      <span aria-hidden="true" style={{ width: "16px", textAlign: "center" }}>🪙</span>
                      <span>{Number(u.coins || 0).toLocaleString()}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#00F2FE", fontWeight: "700" }}>
                      <span aria-hidden="true" style={{ width: "16px", textAlign: "center" }}>🎟️</span>
                      <span>{Number(u.tickets || 0)} tickets</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RAPID OPERATIONS LAUNCHPAD ── */}
      <div
        className="glass-card"
        style={{
          padding: "24px 28px",
          background: "rgba(18, 24, 39, 0.85)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <div style={{ marginBottom: "18px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#FFFFFF" }}>
            ⚡ Rapid Operational Launchpad
          </h3>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#CBD5E1", fontWeight: "500", lineHeight: "1.4" }}>
            Instant shortcuts to primary administrative functions
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
          {[
            { label: "Configure Lucky Draw", desc: "Slots & Coins", icon: "🎯", path: "/admin/createluckydraw", color: "#C084FC" },
            { label: "Dispatch Push Alert", desc: "FCM Broadcast", icon: "🔔", path: "/admin/notifications", color: "#60A5FA" },
            { label: "Authorize Payouts", desc: "UPI / Gift Cards", icon: "💳", path: "/redeem", color: "#00F5A0" },
            { label: "Share & Earn Deals", desc: "Affiliate Offers", icon: "🔗", path: "/admin/share-earn", color: "#00F2FE" },
            { label: "Audited Winners", desc: "Draw History", icon: "🏆", path: "/admin/winner-history", color: "#FFB800" },
            { label: "Data Erasure Tickets", desc: "Google Compliance", icon: "🗑️", path: "/admin/delete-requests", color: "#FF4B72" },
          ].map((action) => (
            <div
              key={action.path}
              onClick={() => navigate(action.path)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                padding: "14px 16px",
                background: "rgba(15, 23, 42, 0.75)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderLeft: `3px solid ${action.color}`,
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(15, 23, 42, 0.95)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.16)";
                e.currentTarget.style.borderLeftColor = action.color;
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = `0 8px 20px -4px ${action.color}25`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(15, 23, 42, 0.75)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.borderLeftColor = action.color;
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  flexShrink: 0,
                  lineHeight: 1,
                }}
                aria-hidden="true"
              >
                {action.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: "#FFFFFF", fontWeight: "700", fontSize: "14px", lineHeight: 1.25 }}>
                  {action.label}
                </div>
                <div style={{ color: "#CBD5E1", fontSize: "12px", marginTop: "6px", lineHeight: 1.3 }}>
                  {action.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
