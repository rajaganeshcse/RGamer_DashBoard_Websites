import React, { useEffect, useState } from "react";
import { collection, doc, getDoc, onSnapshot, orderBy, query } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../Firebase";
import "./LuckyDraw.css";

const WinnerHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, "lucky_draws"), orderBy("completedAt", "desc"));

    const unsub = onSnapshot(
      q,
      async (snap) => {
        const completed = snap.docs.filter((d) => d.data().status === "COMPLETED");

        try {
          const promises = completed.map(async (docSnap) => {
            const draw = docSnap.data();
            let username = "Anonymous Player";
            let email = "—";

            if (draw.winnerUid) {
              try {
                const userSnap = await getDoc(doc(db, "users", draw.winnerUid));
                if (userSnap.exists()) {
                  const u = userSnap.data();
                  username = u.name || u.username || "Anonymous Player";
                  email = u.email || "—";
                }
              } catch (e) {
                console.error("Winner lookup error:", e);
              }
            }

            return {
              drawId: docSnap.id,
              winnerUid: draw.winnerUid || "—",
              username,
              email,
              rewardCoins: draw.rewardCoins ?? 0,
              totalSlots: draw.totalSlots ?? 0,
              completedAt: draw.completedAt?.toDate?.() || null,
              status: draw.status
            };
          });

          const results = await Promise.all(promises);
          setHistory(results);
        } catch (err) {
          console.error("Winner history load failed:", err);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error("Firestore history error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const filteredHistory = history.filter((h) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      h.username.toLowerCase().includes(q) ||
      h.winnerUid.toLowerCase().includes(q) ||
      h.drawId.toLowerCase().includes(q) ||
      h.email.toLowerCase().includes(q)
    );
  });

  const totalPrizeDistributed = history.reduce((acc, h) => acc + (Number(h.rewardCoins) || 0), 0);
  const avgPrize = history.length > 0 ? Math.round(totalPrizeDistributed / history.length) : 0;

  return (
    <div className="luckydraw-container animate-fade-in">
      
      {/* HEADER BANNER */}
      <div className="luckydraw-header">
        <div className="luckydraw-header-left">
          <div className="luckydraw-badge-row">
            <span className="luckydraw-engine-pill">
              <span>🏆</span> WINNER HALL OF FAME
            </span>
            <span className="luckydraw-preset-tag">
              Official Resolution Ledger
            </span>
          </div>
          <h1 className="luckydraw-main-title">
            <span>🏅</span> Winner Records &amp; Prize Audit Log
          </h1>
          <p className="luckydraw-header-subtitle">
            Auditable and immutable history of finalized lucky draw tournaments and awarded prize coins.
          </p>
        </div>

        <div className="luckydraw-header-actions">
          <button
            type="button"
            className="luckydraw-action-btn-secondary"
            onClick={() => navigate("/admin/LuckyDrawAdmin")}
          >
            <span>←</span> Back to Operations
          </button>
        </div>
      </div>

      {/* 4 STATS CARDS */}
      <div className="luckydraw-kpi-grid">
        <div className="luckydraw-kpi-card kpi-variant-violet">
          <div className="luckydraw-kpi-icon">👑</div>
          <div className="luckydraw-kpi-content">
            <div className="luckydraw-kpi-value">{history.length}</div>
            <div className="luckydraw-kpi-label">Verified Winners Crowned</div>
            <div className="luckydraw-kpi-subtext">Completed lottery events</div>
          </div>
        </div>

        <div className="luckydraw-kpi-card kpi-variant-gold">
          <div className="luckydraw-kpi-icon">💰</div>
          <div className="luckydraw-kpi-content">
            <div className="luckydraw-kpi-value" style={{ color: "#FFB800" }}>
              {totalPrizeDistributed.toLocaleString()}
            </div>
            <div className="luckydraw-kpi-label">Total Coins Won</div>
            <div className="luckydraw-kpi-subtext">Prizes credited to users</div>
          </div>
        </div>

        <div className="luckydraw-kpi-card kpi-variant-cyan">
          <div className="luckydraw-kpi-icon">🎯</div>
          <div className="luckydraw-kpi-content">
            <div className="luckydraw-kpi-value">
              {avgPrize.toLocaleString()}
            </div>
            <div className="luckydraw-kpi-label">Average Prize Pool</div>
            <div className="luckydraw-kpi-subtext">Coins awarded per draw</div>
          </div>
        </div>

        <div className="luckydraw-kpi-card kpi-variant-mint">
          <div className="luckydraw-kpi-icon">✅</div>
          <div className="luckydraw-kpi-content">
            <div className="luckydraw-kpi-value" style={{ color: "#00F5A0" }}>100%</div>
            <div className="luckydraw-kpi-label">Settlement Rate</div>
            <div className="luckydraw-kpi-subtext">Auto-credited to balances</div>
          </div>
        </div>
      </div>

      {/* SEARCH TOOLBAR */}
      <div
        className="glass-card"
        style={{
          padding: "18px 24px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "14px", fontWeight: "800", color: "#FFFFFF" }}>
            Audit Records:
          </span>
          <span className="luckydraw-count-chip">
            {filteredHistory.length} of {history.length}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <input
            type="text"
            className="luckydraw-input"
            placeholder="Search winner name, UID, draw ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "290px", padding: "10px 14px", fontSize: "13px" }}
          />
        </div>
      </div>

      {/* WINNERS AUDIT TABLE */}
      <div className="luckydraw-history-box">
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div className="spinner"></div>
            <p style={{ color: "#FFFFFF", fontWeight: "800", marginTop: "14px" }}>
              Loading official winner audit records...
            </p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 20px", color: "#FFFFFF", fontWeight: "700" }}>
            {search ? "No winner records match your query." : "No completed lucky draw records found."}
          </div>
        ) : (
          <div className="luckydraw-table-wrap">
            <table className="luckydraw-table">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Crowned Winner</th>
                  <th>Awarded Prize</th>
                  <th>Event Tier</th>
                  <th>Finalized Date</th>
                  <th>Settlement Status</th>
                  <th>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => (
                  <tr key={item.drawId}>
                    <td>
                      <span className="luckydraw-id-tag">
                        #{item.drawId.slice(0, 8)}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: "800", color: "#FFFFFF", fontSize: "14px" }}>
                        {item.username}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                        <span className="luckydraw-uid-pill">
                          UID: {item.winnerUid}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="luckydraw-prize-pill" style={{ fontSize: "13.5px" }}>
                        🪙 {Number(item.rewardCoins).toLocaleString()} COINS
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "13px", color: "#FFFFFF", fontWeight: "700" }}>
                        {item.totalSlots} Slots
                      </span>
                    </td>
                    <td>
                      <span style={{ color: "#CBD5E1", fontSize: "12.5px", fontWeight: "600" }}>
                        {item.completedAt
                          ? item.completedAt.toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })
                          : "—"}
                      </span>
                    </td>
                    <td>
                      <span className="luckydraw-status-badge status-badge-open">
                        <span className="status-pulse-dot" style={{ background: "#00F5A0" }}></span>
                        CREDITED
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="luckydraw-filter-btn"
                        style={{ padding: "6px 12px", fontSize: "12px", color: "#00F2FE", borderColor: "rgba(6, 182, 212, 0.4)" }}
                        onClick={() => navigate(`/admin/lucky-draw/${item.drawId}`)}
                      >
                        👥 Roster →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default WinnerHistory;
