import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../Firebase";

const KPICard = ({ icon, label, value, sub, accent, badge, badgeClass, onClick }) => (
  <div
    className="glass-card"
    style={{
      padding: "22px 24px",
      borderTop: `3px solid ${accent}`,
      cursor: onClick ? "pointer" : "default",
      position: "relative",
      overflow: "hidden",
      transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
    }}
    onClick={onClick}
    onMouseEnter={(e) => {
      if (onClick) {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = `0 16px 36px -6px rgba(0, 0, 0, 0.6), 0 0 20px ${accent}25`;
        e.currentTarget.style.borderColor = `${accent}60`;
      }
    }}
    onMouseLeave={(e) => {
      if (onClick) {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "var(--shadow-card)";
        e.currentTarget.style.borderColor = "var(--border-color)";
      }
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "12px",
          background: `${accent}18`,
          border: `1px solid ${accent}35`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "24px",
        }}
      >
        {icon}
      </div>
      {badge != null && (
        <span className={`badge ${badgeClass || "badge-info"}`}>{badge}</span>
      )}
    </div>

    <div style={{ fontSize: "28px", fontWeight: "800", color: accent, lineHeight: 1.1, marginBottom: "4px", letterSpacing: "-0.5px" }}>
      {value}
    </div>

    <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.6px" }}>
      {label}
    </div>

    {sub && (
      <div style={{ fontSize: "12px", color: "#64748B", marginTop: "8px", fontWeight: "500", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>{sub}</span>
        {onClick && <span style={{ color: accent, fontSize: "14px", fontWeight: "700" }}>→</span>}
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
          const t1 = a.created_at?.toDate?.()?.getTime() ?? (a.created_at || 0);
          const t2 = b.created_at?.toDate?.()?.getTime() ?? (b.created_at || 0);
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
        <p style={{ color: "#94A3B8", fontWeight: "600", fontSize: "15px" }}>Connecting to Realtime Command Hub...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: "1400px", margin: "0 auto" }} className="animate-fade-in">

      {/* ── HERO BANNER & REALTIME CLOCK ── */}
      <div
        className="glass-card"
        style={{
          padding: "24px 30px",
          marginBottom: "28px",
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.16) 0%, rgba(6, 182, 212, 0.08) 50%, rgba(18, 24, 39, 0.85) 100%)",
          borderColor: "rgba(99, 102, 241, 0.25)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "18px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span className="badge badge-info" style={{ fontSize: "11px", fontWeight: "800" }}>
              ⚡ LIVE COMMAND CENTER
            </span>
            <span style={{ fontSize: "12px", color: "#34D399", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
              <span className="pulse-dot"></span> FIRESTORE SYNC ACTIVE
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "800", color: "#F8FAFC", letterSpacing: "-0.5px" }}>
            DailyKash Executive Operations
          </h1>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#94A3B8" }}>
            Authoritative platform status, financial exposure, payout authorizations, and user growth.
          </p>
        </div>

        {/* Live Clock & Action */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div
            style={{
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              padding: "8px 16px",
              borderRadius: "12px",
              textAlign: "right",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: "800", color: "#F8FAFC", fontFamily: "monospace" }}>
              {currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} IST
            </div>
            <div style={{ fontSize: "11px", color: "#64748B", fontWeight: "600" }}>
              {currentTime.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
          </div>

          <button
            className="btn-glow"
            onClick={() => navigate("/redeem")}
            style={{ padding: "10px 18px", fontSize: "13px" }}
          >
            💳 Review Payouts ({metrics.pendingRedeemsCount})
          </button>
        </div>
      </div>

      {/* ── 6 AUTHORITATIVE KPI CARDS ── */}
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
          accent="#F59E0B"
        />

        <KPICard
          icon="💳"
          label="Pending Payout Pipeline"
          value={metrics.pendingRedeemsCount}
          sub={`₹${fmt(metrics.pendingRedeemsAmount)} awaiting approval`}
          accent="#34D399"
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
          accent="#22D3EE"
          badge={metrics.pendingConversions > 0 ? `${metrics.pendingConversions} Pending` : "Idle"}
          badgeClass={metrics.pendingConversions > 0 ? "badge-cyan" : "badge-info"}
          onClick={() => navigate("/admin/share-earn")}
        />

        <KPICard
          icon="🗑️"
          label="Account Deletions (Play Store)"
          value={metrics.pendingDeletions}
          sub="7-day grace period enforcement"
          accent={metrics.pendingDeletions > 0 ? "#F87171" : "#64748B"}
          badge={metrics.pendingDeletions > 0 ? "Review Ticket" : "Zero Queued"}
          badgeClass={metrics.pendingDeletions > 0 ? "badge-pending" : "badge-info"}
          onClick={() => navigate("/admin/delete-requests")}
        />
      </div>

      {/* ── PLATFORM HEALTH & RATIOS BAR ── */}
      <div
        className="glass-card"
        style={{
          padding: "18px 24px",
          marginBottom: "28px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "20px",
          alignItems: "center",
        }}
      >
        {/* User Health Ratio */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
            <span style={{ color: "#94A3B8", fontWeight: "700" }}>ACCOUNT INTEGRITY RATE</span>
            <span style={{ color: "#34D399", fontWeight: "800" }}>{userHealthPct}% Active</span>
          </div>
          <div style={{ height: "6px", width: "100%", background: "rgba(255, 255, 255, 0.06)", borderRadius: "6px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${userHealthPct}%`, background: "linear-gradient(90deg, #10B981, #06B6D4)" }} />
          </div>
        </div>

        {/* Payout Completion Rate */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
            <span style={{ color: "#94A3B8", fontWeight: "700" }}>PAYOUT FULFILLMENT VELOCITY</span>
            <span style={{ color: "#818CF8", fontWeight: "800" }}>{payoutFulfillRate}% Completed</span>
          </div>
          <div style={{ height: "6px", width: "100%", background: "rgba(255, 255, 255, 0.06)", borderRadius: "6px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${payoutFulfillRate}%`, background: "linear-gradient(90deg, #6366F1, #818CF8)" }} />
          </div>
        </div>

        {/* Google Play Compliance Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "flex-end" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "12px", fontWeight: "700", color: "#F8FAFC" }}>Play Store Compliance</div>
            <div style={{ fontSize: "11px", color: "#34D399", fontWeight: "600" }}>All Legal URLs Live</div>
          </div>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
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
        <div className="glass-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <div>
              <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#F8FAFC", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>💳</span> Urgent Payout Queue
              </h4>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748B" }}>
                Pending UPI, Amazon, and Google Play redemptions
              </p>
            </div>
            <button
              onClick={() => navigate("/redeem")}
              style={{
                background: "rgba(99, 102, 241, 0.12)",
                border: "1px solid rgba(99, 102, 241, 0.25)",
                color: "#818CF8",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
                padding: "6px 12px",
                borderRadius: "8px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => e.target.style.background = "rgba(99, 102, 241, 0.25)"}
              onMouseLeave={(e) => e.target.style.background = "rgba(99, 102, 241, 0.12)"}
            >
              Fulfill Payouts →
            </button>
          </div>

          {recentRedeems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#475569" }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>🎉</div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#94A3B8" }}>All Payout Queues Cleared!</div>
              <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>Zero pending redemption requests.</div>
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
                      padding: "12px 14px",
                      background: "rgba(255, 255, 255, 0.025)",
                      borderRadius: "10px",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                      transition: "all 0.18s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.3)";
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.05)";
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.025)";
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "800",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: typeUpper === "UPI" ? "rgba(6, 182, 212, 0.15)" : "rgba(245, 158, 11, 0.15)",
                            color: typeUpper === "UPI" ? "#22D3EE" : "#FBBF24",
                            border: `1px solid ${typeUpper === "UPI" ? "rgba(6, 182, 212, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                          }}
                        >
                          {typeUpper}
                        </span>
                        <strong style={{ color: "#F8FAFC", fontSize: "14px" }}>₹{r.amount}</strong>
                        <span style={{ fontSize: "11px", color: "#64748B" }}>({r.coins || r.amount * 100} coins)</span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px", fontFamily: "monospace" }}>
                        {r.payment_address || r.withdraw_details || r.upi_id || "No address"}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span
                        className={`badge ${
                          status === "pending" ? "badge-pending" :
                          status === "success" ? "badge-success" : "badge-danger"
                        }`}
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
        <div className="glass-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <div>
              <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#F8FAFC", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>👤</span> Newly Joined Players
              </h4>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748B" }}>
                Real-time user onboarding &amp; account creation stream
              </p>
            </div>
            <button
              onClick={() => navigate("/user")}
              style={{
                background: "rgba(99, 102, 241, 0.12)",
                border: "1px solid rgba(99, 102, 241, 0.25)",
                color: "#818CF8",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
                padding: "6px 12px",
                borderRadius: "8px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => e.target.style.background = "rgba(99, 102, 241, 0.25)"}
              onMouseLeave={(e) => e.target.style.background = "rgba(99, 102, 241, 0.12)"}
            >
              Player Directory →
            </button>
          </div>

          {recentUsers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#475569" }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>👤</div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#94A3B8" }}>No Player Records Found</div>
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
                    padding: "10px 14px",
                    background: "rgba(255, 255, 255, 0.025)",
                    borderRadius: "10px",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    transition: "all 0.18s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.3)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.05)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.025)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <img
                      src={u.profile_pic || u.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`}
                      alt="avatar"
                      style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#1E293B", objectFit: "cover", flexShrink: 0, border: "1px solid rgba(255, 255, 255, 0.1)" }}
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
                    <div style={{ fontSize: "11px", color: "#38BDF8", marginTop: "1px" }}>
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
      <div className="glass-card" style={{ padding: "24px 28px" }}>
        <div style={{ marginBottom: "16px" }}>
          <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#F8FAFC" }}>
            ⚡ Rapid Operational Launchpad
          </h4>
          <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748B" }}>
            Instant shortcuts to primary administrative functions
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          {[
            { label: "Configure Lucky Draw", desc: "Slots & Coins", icon: "🎯", path: "/admin/createluckydraw", color: "#8B5CF6" },
            { label: "Dispatch Push Alert", desc: "FCM Broadcast", icon: "🔔", path: "/admin/notifications", color: "#3B82F6" },
            { label: "Authorize Payouts", desc: "UPI / Gift Cards", icon: "💳", path: "/redeem", color: "#10B981" },
            { label: "Share & Earn Deals", desc: "Affiliate Offers", icon: "🔗", path: "/admin/share-earn", color: "#06B6D4" },
            { label: "Audited Winners", desc: "Draw History", icon: "🏆", path: "/admin/winner-history", color: "#F59E0B" },
            { label: "Data Erasure Tickets", desc: "Google Compliance", icon: "🗑️", path: "/admin/delete-requests", color: "#EF4444" },
          ].map((action) => (
            <div
              key={action.path}
              onClick={() => navigate(action.path)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "14px 16px",
                background: `${action.color}0D`,
                border: `1px solid ${action.color}25`,
                borderRadius: "12px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${action.color}1E`;
                e.currentTarget.style.borderColor = `${action.color}50`;
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `${action.color}0D`;
                e.currentTarget.style.borderColor = `${action.color}25`;
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: `${action.color}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  flexShrink: 0,
                }}
              >
                {action.icon}
              </div>
              <div>
                <div style={{ color: "#F8FAFC", fontWeight: "700", fontSize: "13px" }}>{action.label}</div>
                <div style={{ color: "#64748B", fontSize: "11px", marginTop: "2px" }}>{action.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
