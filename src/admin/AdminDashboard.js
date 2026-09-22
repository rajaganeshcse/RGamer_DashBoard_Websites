import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../Firebase";

export default function AdminDashboard() {
  const navigate = useNavigate();

  // Metrics State
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
    pendingDeletions: 0
  });

  const [recentUsers, setRecentUsers] = useState([]);
  const [recentRedeems, setRecentRedeems] = useState([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  useEffect(() => {
    // 1. Users Metrics
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        let coins = 0;
        let tickets = 0;
        let banned = 0;
        const list = snap.docs.map((d) => {
          const data = d.data();
          const userCoins = Number(data.coins) || 0;
          const userTickets = Number(data.tickets) || 0;
          coins += userCoins;
          tickets += userTickets;
          if ((data.status || "").toUpperCase() === "BANNED" || (data.account || "").toLowerCase() === "suspended") {
            banned++;
          }
          return { id: d.id, ...data };
        });

        // Sort by created_at desc for recent users
        list.sort((a, b) => {
          const t1 = a.created_at || 0;
          const t2 = b.created_at || 0;
          return (t2?.toDate ? t2.toDate().getTime() : t2) - (t1?.toDate ? t1.toDate().getTime() : t1);
        });

        setRecentUsers(list.slice(0, 5));
        setMetrics((prev) => ({
          ...prev,
          totalUsers: snap.size,
          totalCoins: coins,
          totalTickets: tickets,
          bannedUsers: banned
        }));
        setLoadingMetrics(false);
      },
      (err) => console.error("Users metrics error:", err)
    );

    // 2. Redeem Requests Metrics
    const unsubRedeems = onSnapshot(
      collection(db, "redeem_requests"),
      (snap) => {
        let pendingCount = 0;
        let pendingAmount = 0;
        let successCount = 0;
        const list = snap.docs.map((d) => {
          const data = d.data();
          const status = (data.status || "").toLowerCase();
          const amount = Number(data.amount) || 0;
          if (status === "pending") {
            pendingCount++;
            pendingAmount += amount;
          } else if (status === "success") {
            successCount++;
          }
          return { id: d.id, ...data };
        });

        list.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
        setRecentRedeems(list.slice(0, 5));

        setMetrics((prev) => ({
          ...prev,
          pendingRedeemsCount: pendingCount,
          pendingRedeemsAmount: pendingAmount,
          completedRedeemsCount: successCount
        }));
      },
      (err) => console.error("Redeems metrics error:", err)
    );

    // 3. Lucky Draws Metrics
    const unsubDraws = onSnapshot(
      collection(db, "lucky_draws"),
      (snap) => {
        let active = 0;
        let filledSlots = 0;
        snap.docs.forEach((d) => {
          const data = d.data();
          if (data.status === "OPEN") {
            active++;
            filledSlots += Number(data.filledSlots) || 0;
          }
        });
        setMetrics((prev) => ({
          ...prev,
          activeLuckyDraws: active,
          totalDrawSlotsFilled: filledSlots
        }));
      },
      (err) => console.error("Draws metrics error:", err)
    );

    // 4. Share & Earn Offers & Conversions
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

    // 5. Account Deletions
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

  return (
    <div style={{ padding: "28px", maxWidth: "1440px", margin: "0 auto" }} className="animate-fade-in">
      
      {/* ── TOP HERO BANNER ── */}
      <div
        className="glass-card"
        style={{
          padding: "32px",
          marginBottom: "32px",
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(6, 182, 212, 0.15) 100%)",
          borderColor: "rgba(99, 102, 241, 0.35)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "24px"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <span className="badge badge-success">
              <span className="pulse-dot"></span> LIVE EXECUTIVE CONSOLE
            </span>
            <span style={{ fontSize: "12px", color: "#94A3B8" }}>RGamer Cloud Network v2.5</span>
          </div>
          <h1 style={{ margin: 0, fontSize: "30px", fontWeight: "800", color: "#F8FAFC", letterSpacing: "-0.5px" }}>
            Control Center & Real-Time Analytics
          </h1>
          <p style={{ margin: "8px 0 0 0", fontSize: "14px", color: "#CBD5E1", maxWidth: "700px", lineHeight: "1.5" }}>
            Instant operational metrics across player accounts, pending payout liabilities, lucky draw lotteries, and push campaigns.
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button className="btn-glow" onClick={() => navigate("/admin/notifications")}>
            <span>🔔</span> Broadcast Push
          </button>
          <button className="btn-secondary" onClick={() => navigate("/user")}>
            <span>👤</span> Manage Users
          </button>
          <button className="btn-amber" onClick={() => navigate("/redeem")}>
            <span>💳</span> Review Payouts ({metrics.pendingRedeemsCount})
          </button>
        </div>
      </div>

      {/* ── LIVE KPI METRICS GRID ── */}
      <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "16px" }}>
        📊 Real-Time Operations Overview
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
          marginBottom: "36px"
        }}
      >
        {/* KPI 1: TOTAL USERS */}
        <div className="glass-card" style={{ padding: "22px", borderTop: "3px solid #6366F1" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "24px" }}>👥</span>
            <span className="badge badge-info">{metrics.bannedUsers} Banned</span>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "800", color: "#F8FAFC" }}>
            {loadingMetrics ? "..." : metrics.totalUsers.toLocaleString()}
          </div>
          <div style={{ fontSize: "13px", color: "#94A3B8", fontWeight: "600", marginTop: "4px" }}>
            Registered Players
          </div>
        </div>

        {/* KPI 2: ECONOMY COINS */}
        <div className="glass-card" style={{ padding: "22px", borderTop: "3px solid #F59E0B" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "24px" }}>💰</span>
            <span className="badge badge-pending">CIRCULATION</span>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "800", color: "#FBBF24" }}>
            {loadingMetrics ? "..." : metrics.totalCoins.toLocaleString()}
          </div>
          <div style={{ fontSize: "13px", color: "#94A3B8", fontWeight: "600", marginTop: "4px" }}>
            Total User Coins ({metrics.totalTickets.toLocaleString()} 🎟️)
          </div>
        </div>

        {/* KPI 3: PENDING PAYOUTS */}
        <div
          className="glass-card"
          style={{
            padding: "22px",
            borderTop: `3px solid ${metrics.pendingRedeemsCount > 0 ? "#EF4444" : "#10B981"}`,
            cursor: "pointer"
          }}
          onClick={() => navigate("/redeem")}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "24px" }}>💳</span>
            <span className={`badge ${metrics.pendingRedeemsCount > 0 ? "badge-danger" : "badge-success"}`}>
              {metrics.pendingRedeemsCount > 0 ? "ACTION REQUIRED" : "CLEARED"}
            </span>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "800", color: metrics.pendingRedeemsCount > 0 ? "#F87171" : "#34D399" }}>
            ₹{metrics.pendingRedeemsAmount.toLocaleString()}
          </div>
          <div style={{ fontSize: "13px", color: "#94A3B8", fontWeight: "600", marginTop: "4px" }}>
            {metrics.pendingRedeemsCount} Pending Redemptions →
          </div>
        </div>

        {/* KPI 4: LUCKY DRAWS */}
        <div className="glass-card" style={{ padding: "22px", borderTop: "3px solid #8B5CF6", cursor: "pointer" }} onClick={() => navigate("/admin/LuckyDrawAdmin")}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "24px" }}>🎯</span>
            <span className="badge badge-info">{metrics.totalDrawSlotsFilled} Slots</span>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "800", color: "#C084FC" }}>
            {metrics.activeLuckyDraws} Active
          </div>
          <div style={{ fontSize: "13px", color: "#94A3B8", fontWeight: "600", marginTop: "4px" }}>
            Lucky Draw Events →
          </div>
        </div>

        {/* KPI 5: SHARE & EARN */}
        <div className="glass-card" style={{ padding: "22px", borderTop: "3px solid #06B6D4", cursor: "pointer" }} onClick={() => navigate("/admin/share-earn")}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "24px" }}>🚀</span>
            <span className="badge badge-cyan">{metrics.pendingConversions} Pending</span>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "800", color: "#22D3EE" }}>
            {metrics.activeOffers} Live
          </div>
          <div style={{ fontSize: "13px", color: "#94A3B8", fontWeight: "600", marginTop: "4px" }}>
            Offers & Referral Tasks →
          </div>
        </div>

        {/* KPI 6: ACCOUNT DELETIONS */}
        <div className="glass-card" style={{ padding: "22px", borderTop: "3px solid #64748B", cursor: "pointer" }} onClick={() => navigate("/admin/delete-requests")}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "24px" }}>🗑️</span>
            <span className="badge badge-pending">7-DAY GRACE</span>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "800", color: metrics.pendingDeletions > 0 ? "#FBBF24" : "#F8FAFC" }}>
            {metrics.pendingDeletions}
          </div>
          <div style={{ fontSize: "13px", color: "#94A3B8", fontWeight: "600", marginTop: "4px" }}>
            Pending Deletion Requests →
          </div>
        </div>
      </div>

      {/* ── LIVE RECENT ACTIVITY SECTION ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "24px", marginBottom: "36px" }}>
        
        {/* RECENT REDEMPTION REQUESTS */}
        <div className="glass-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#F8FAFC", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>💸</span> Recent Payout Requests
            </h4>
            <button
              onClick={() => navigate("/redeem")}
              style={{ background: "transparent", border: "none", color: "#818CF8", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
            >
              View All ({metrics.pendingRedeemsCount}) →
            </button>
          </div>

          {recentRedeems.length === 0 ? (
            <p style={{ color: "#64748B", fontSize: "13px" }}>No redemption requests recorded yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {recentRedeems.map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    background: "rgba(255, 255, 255, 0.03)",
                    borderRadius: "10px",
                    border: "1px solid rgba(255, 255, 255, 0.05)"
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "700", color: "#F8FAFC", fontSize: "14px" }}>
                      {(r.type || "PAYOUT").toUpperCase()} • ₹{r.amount}
                    </div>
                    <div style={{ fontSize: "12px", color: "#94A3B8" }}>
                      {r.payment_address || r.upi_id || r.bank_account || "No Address"}
                    </div>
                  </div>
                  <div>
                    <span
                      className={`badge ${
                        (r.status || "").toLowerCase() === "pending"
                          ? "badge-pending"
                          : (r.status || "").toLowerCase() === "success"
                          ? "badge-success"
                          : "badge-danger"
                      }`}
                    >
                      {r.status || "PENDING"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RECENTLY REGISTERED USERS */}
        <div className="glass-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#F8FAFC", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>👥</span> Latest Player Registrations
            </h4>
            <button
              onClick={() => navigate("/user")}
              style={{ background: "transparent", border: "none", color: "#818CF8", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
            >
              Open Directory →
            </button>
          </div>

          {recentUsers.length === 0 ? (
            <p style={{ color: "#64748B", fontSize: "13px" }}>No users found.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {recentUsers.map((u) => (
                <div
                  key={u.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    background: "rgba(255, 255, 255, 0.03)",
                    borderRadius: "10px",
                    border: "1px solid rgba(255, 255, 255, 0.05)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <img
                      src={u.profile_pic || u.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`}
                      alt="avatar"
                      style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#1E293B" }}
                    />
                    <div>
                      <div style={{ fontWeight: "700", color: "#F8FAFC", fontSize: "13px" }}>
                        {u.name || "Anonymous Player"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                        {u.email || u.id?.substring(0, 14) + "..."}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: "700", color: "#F59E0B", fontSize: "13px" }}>
                      🪙 {Number(u.coins || 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: "11px", color: "#60A5FA" }}>
                      🎟️ {Number(u.tickets || 0)} tickets
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
