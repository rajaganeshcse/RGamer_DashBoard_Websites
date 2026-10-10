import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../Firebase";

const KPICard = ({ icon, label, value, sub, accent, badge, badgeClass, onClick }) => (
  <div
    className="glass-card"
    style={{
      padding: "24px",
      background: `linear-gradient(145deg, ${accent}18 0%, rgba(18, 24, 39, 0.92) 100%)`,
      borderTop: `4px solid ${accent}`,
      borderLeft: `1px solid ${accent}35`,
      borderRight: `1px solid ${accent}35`,
      borderBottom: `1px solid ${accent}35`,
      cursor: onClick ? "pointer" : "default",
      position: "relative",
      overflow: "hidden",
      transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
    }}
    onClick={onClick}
    onMouseEnter={(e) => {
      if (onClick) {
        e.currentTarget.style.transform = "translateY(-5px)";
        e.currentTarget.style.boxShadow = `0 18px 40px -6px rgba(0, 0, 0, 0.7), 0 0 25px ${accent}40`;
        e.currentTarget.style.borderColor = accent;
      }
    }}
    onMouseLeave={(e) => {
      if (onClick) {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "var(--shadow-card)";
        e.currentTarget.style.borderColor = `${accent}35`;
        e.currentTarget.style.borderTopColor = accent;
      }
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
      <div
        style={{
          width: "50px",
          height: "50px",
          borderRadius: "14px",
          background: `${accent}25`,
          border: `1.5px solid ${accent}60`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "26px",
          boxShadow: `0 4px 14px ${accent}30`,
        }}
      >
        {icon}
      </div>
      {badge != null && (
        <span className={`badge ${badgeClass || "badge-info"}`} style={{ fontWeight: "800", fontSize: "11px" }}>
          {badge}
        </span>
      )}
    </div>

    <div style={{ fontSize: "30px", fontWeight: "900", color: accent, lineHeight: 1.1, marginBottom: "6px", letterSpacing: "-0.5px" }}>
      {value}
    </div>

    <div style={{ fontSize: "12px", color: "#FFFFFF", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.6px" }}>
      {label}
    </div>

    {sub && (
      <div style={{ fontSize: "12.5px", color: "#E2E8F0", marginTop: "10px", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>{sub}</span>
        {onClick && <span style={{ color: accent, fontSize: "16px", fontWeight: "800" }}>→</span>}
      </div>
    )}
  </div>
);

export default function AdminDashboard() {
  const navigate = useNavigate();

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
                fontSize: "11px",
                fontWeight: "900",
                background: "linear-gradient(135deg, #6366F1, #4F46E5)",
                color: "#FFFFFF",
                padding: "4px 10px",
                borderRadius: "20px",
                letterSpacing: "0.5px",
                boxShadow: "0 2px 10px rgba(99, 102, 241, 0.4)",
              }}
            >
              ⚡ LIVE COMMAND CENTER
            </span>
            <span style={{ fontSize: "12px", color: "#00F5A0", fontWeight: "800", display: "flex", alignItems: "center", gap: "6px" }}>
              <span className="pulse-dot" style={{ background: "#00F5A0", boxShadow: "0 0 8px #00F5A0" }}></span> FIRESTORE SYNC ACTIVE
            </span>
          </div>

          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "900", color: "#FFFFFF", letterSpacing: "-0.5px" }}>
            DailyKash Executive Operations
          </h1>
          <p style={{ margin: "5px 0 0 0", fontSize: "14px", color: "#F1F5F9", fontWeight: "600" }}>
            Authoritative platform status, financial exposure, payout authorizations, and user growth.
          </p>
        </div>

        {/* Live Clock & Action */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div
            style={{
              background: "#0F172A",
              border: "1.5px solid rgba(99, 102, 241, 0.4)",
              padding: "10px 18px",
              borderRadius: "14px",
              textAlign: "right",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
            }}
          >
            <div style={{ fontSize: "16px", fontWeight: "900", color: "#00F2FE", fontFamily: "monospace", letterSpacing: "1px" }}>
              {currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} IST
            </div>
            <div style={{ fontSize: "12px", color: "#FFFFFF", fontWeight: "700", marginTop: "2px" }}>
              {currentTime.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
          </div>

          <button
            className="btn-glow"
            onClick={() => navigate("/redeem")}
            style={{ padding: "12px 22px", fontSize: "14px", fontWeight: "800", boxShadow: "0 6px 20px rgba(99, 102, 241, 0.5)" }}
          >
            💳 Review Payouts ({metrics.pendingRedeemsCount})
          </button>
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
          accent="#00F5A0"
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
          badgeClass={metrics.pendingConversions > 0 ? "badge-cyan" : "badge-info"}
          onClick={() => navigate("/admin/share-earn")}
        />

        <KPICard
          icon="🗑️"
          label="Account Deletions (Play Store)"
          value={metrics.pendingDeletions}
          sub="7-day grace period enforcement"
          accent={metrics.pendingDeletions > 0 ? "#FF4B72" : "#94A3B8"}
          badge={metrics.pendingDeletions > 0 ? "Review Ticket" : "Zero Queued"}
          badgeClass={metrics.pendingDeletions > 0 ? "badge-pending" : "badge-info"}
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
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "8px" }}>
            <span style={{ color: "#FFFFFF", fontWeight: "800", letterSpacing: "0.5px" }}>ACCOUNT INTEGRITY RATE</span>
            <span style={{ color: "#00F5A0", fontWeight: "900" }}>{userHealthPct}% Active</span>
          </div>
          <div style={{ height: "8px", width: "100%", background: "rgba(255, 255, 255, 0.1)", borderRadius: "8px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${userHealthPct}%`, background: "linear-gradient(90deg, #00F5A0, #00F2FE)", boxShadow: "0 0 10px #00F5A0" }} />
          </div>
        </div>

        {/* Payout Completion Rate */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "8px" }}>
            <span style={{ color: "#FFFFFF", fontWeight: "800", letterSpacing: "0.5px" }}>PAYOUT FULFILLMENT VELOCITY</span>
            <span style={{ color: "#818CF8", fontWeight: "900" }}>{payoutFulfillRate}% Completed</span>
          </div>
          <div style={{ height: "8px", width: "100%", background: "rgba(255, 255, 255, 0.1)", borderRadius: "8px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${payoutFulfillRate}%`, background: "linear-gradient(90deg, #6366F1, #818CF8)", boxShadow: "0 0 10px #818CF8" }} />
          </div>
        </div>

        {/* Google Play Compliance Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", justifyContent: "flex-end" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "13px", fontWeight: "800", color: "#FFFFFF" }}>Play Store Compliance</div>
            <div style={{ fontSize: "12px", color: "#00F5A0", fontWeight: "800" }}>All Policy Endpoints Active</div>
          </div>
          <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "rgba(0, 245, 160, 0.2)", border: "1.5px solid rgba(0, 245, 160, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", boxShadow: "0 0 12px rgba(0, 245, 160, 0.3)" }}>
            🛡️
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
            padding: "26px",
            background: "linear-gradient(145deg, rgba(0, 245, 160, 0.04) 0%, rgba(18, 24, 39, 0.95) 100%)",
            border: "1px solid rgba(0, 245, 160, 0.25)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h4 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#FFFFFF", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>💳</span> Urgent Payout Queue
              </h4>
              <p style={{ margin: "3px 0 0 0", fontSize: "13px", color: "#E2E8F0", fontWeight: "600" }}>
                Pending UPI, Amazon, and Google Play redemptions
              </p>
            </div>
            <button
              onClick={() => navigate("/redeem")}
              style={{
                background: "rgba(99, 102, 241, 0.2)",
                border: "1.5px solid rgba(99, 102, 241, 0.5)",
                color: "#FFFFFF",
                fontSize: "12.5px",
                fontWeight: "800",
                cursor: "pointer",
                padding: "8px 14px",
                borderRadius: "8px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#6366F1";
                e.target.style.boxShadow = "0 4px 14px rgba(99, 102, 241, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "rgba(99, 102, 241, 0.2)";
                e.target.style.boxShadow = "none";
              }}
            >
              Fulfill Payouts →
            </button>
          </div>

          {recentRedeems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: "36px", marginBottom: "10px" }}>🎉</div>
              <div style={{ fontSize: "15px", fontWeight: "800", color: "#FFFFFF" }}>All Payout Queues Cleared!</div>
              <div style={{ fontSize: "13px", color: "#E2E8F0", marginTop: "4px", fontWeight: "600" }}>Zero pending redemption requests.</div>
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
                      padding: "13px 16px",
                      background: "rgba(15, 23, 42, 0.75)",
                      borderRadius: "12px",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      transition: "all 0.18s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#00F5A0";
                      e.currentTarget.style.background = "rgba(15, 23, 42, 0.95)";
                      e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 245, 160, 0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                      e.currentTarget.style.background = "rgba(15, 23, 42, 0.75)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "900",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background: typeUpper === "UPI" ? "rgba(6, 182, 212, 0.25)" : "rgba(255, 184, 0, 0.25)",
                            color: typeUpper === "UPI" ? "#00F2FE" : "#FFB800",
                            border: `1px solid ${typeUpper === "UPI" ? "rgba(6, 182, 212, 0.6)" : "rgba(255, 184, 0, 0.6)"}`,
                          }}
                        >
                          {typeUpper}
                        </span>
                        <strong style={{ color: "#FFFFFF", fontSize: "15px", fontWeight: "900" }}>₹{r.amount}</strong>
                        <span style={{ fontSize: "12px", color: "#FFB800", fontWeight: "700" }}>🪙 {Number(r.coins || r.amount * 100).toLocaleString()} coins</span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#00F2FE", marginTop: "5px", fontFamily: "monospace", fontWeight: "700" }}>
                        {r.payment_address || r.withdraw_details || r.upi_id || "No address on file"}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span
                        className={`badge ${
                          status === "pending" ? "badge-pending" :
                          status === "success" ? "badge-success" : "badge-danger"
                        }`}
                        style={{ fontWeight: "800", fontSize: "11px" }}
                      >
                        {status === "pending" ? "⏳ AWAITING" : status === "success" ? "✅ PAID" : "❌ REJECTED"}
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
            padding: "26px",
            background: "linear-gradient(145deg, rgba(99, 102, 241, 0.05) 0%, rgba(18, 24, 39, 0.95) 100%)",
            border: "1px solid rgba(99, 102, 241, 0.25)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h4 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#FFFFFF", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>👤</span> Newly Joined Players
              </h4>
              <p style={{ margin: "3px 0 0 0", fontSize: "13px", color: "#E2E8F0", fontWeight: "600" }}>
                Real-time user onboarding &amp; account creation stream
              </p>
            </div>
            <button
              onClick={() => navigate("/user")}
              style={{
                background: "rgba(99, 102, 241, 0.2)",
                border: "1.5px solid rgba(99, 102, 241, 0.5)",
                color: "#FFFFFF",
                fontSize: "12.5px",
                fontWeight: "800",
                cursor: "pointer",
                padding: "8px 14px",
                borderRadius: "8px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#6366F1";
                e.target.style.boxShadow = "0 4px 14px rgba(99, 102, 241, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "rgba(99, 102, 241, 0.2)";
                e.target.style.boxShadow = "none";
              }}
            >
              Player Directory →
            </button>
          </div>

          {recentUsers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: "36px", marginBottom: "10px" }}>👤</div>
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
                    padding: "12px 16px",
                    background: "rgba(15, 23, 42, 0.75)",
                    borderRadius: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    transition: "all 0.18s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#818CF8";
                    e.currentTarget.style.background = "rgba(15, 23, 42, 0.95)";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(129, 140, 248, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                    e.currentTarget.style.background = "rgba(15, 23, 42, 0.75)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <img
                      src={u.profile_pic || u.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`}
                      alt="avatar"
                      style={{ width: "38px", height: "38px", borderRadius: "50%", background: "#1E293B", objectFit: "cover", flexShrink: 0, border: "2px solid #6366F1" }}
                      onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${u.name || "U"}`; }}
                    />
                    <div>
                      <div style={{ fontWeight: "800", color: "#FFFFFF", fontSize: "13.5px" }}>
                        {u.name || "Anonymous Player"}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "#CBD5E1", fontWeight: "600" }}>
                        {u.email || `${u.id?.substring(0, 16)}...`}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontWeight: "900", color: "#FFB800", fontSize: "13px" }}>
                      🪙 {Number(u.coins || 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: "11.5px", color: "#00F2FE", marginTop: "2px", fontWeight: "800" }}>
                      🎟️ {Number(u.tickets || 0)} tickets
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
          padding: "26px 32px",
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.7) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        <div style={{ marginBottom: "18px" }}>
          <h4 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#FFFFFF" }}>
            ⚡ Rapid Operational Launchpad
          </h4>
          <p style={{ margin: "3px 0 0 0", fontSize: "13px", color: "#E2E8F0", fontWeight: "600" }}>
            Instant shortcuts to primary administrative functions
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
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
                alignItems: "center",
                gap: "12px",
                padding: "16px 18px",
                background: `linear-gradient(135deg, ${action.color}15 0%, rgba(15, 23, 42, 0.9) 100%)`,
                border: `1.5px solid ${action.color}40`,
                borderRadius: "14px",
                cursor: "pointer",
                transition: "all 0.22s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `linear-gradient(135deg, ${action.color}30 0%, rgba(15, 23, 42, 0.95) 100%)`;
                e.currentTarget.style.borderColor = action.color;
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = `0 10px 25px -4px ${action.color}35`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `linear-gradient(135deg, ${action.color}15 0%, rgba(15, 23, 42, 0.9) 100%)`;
                e.currentTarget.style.borderColor = `${action.color}40`;
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: `${action.color}25`,
                  border: `1px solid ${action.color}60`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                  flexShrink: 0,
                  boxShadow: `0 4px 12px ${action.color}25`,
                }}
              >
                {action.icon}
              </div>
              <div>
                <div style={{ color: "#FFFFFF", fontWeight: "800", fontSize: "13.5px" }}>{action.label}</div>
                <div style={{ color: "#E2E8F0", fontSize: "11.5px", marginTop: "2px", fontWeight: "600" }}>{action.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
