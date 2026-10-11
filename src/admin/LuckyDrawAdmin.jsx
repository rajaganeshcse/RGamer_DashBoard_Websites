import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  setDoc,
  addDoc,
  serverTimestamp,
  getDoc,
  updateDoc,
  getDocs,
  increment
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../Firebase";
import "./LuckyDraw.css";

const PRESETS = [
  { participationLimit: 5, rewardCoins: 25, ticketCost: 1, label: "5 Slots → 25 Coins (1 🎟️)" },
  { participationLimit: 10, rewardCoins: 100, ticketCost: 1, label: "10 Slots → 100 Coins (1 🎟️)" },
  { participationLimit: 20, rewardCoins: 200, ticketCost: 1, label: "20 Slots → 200 Coins (1 🎟️)" },
  { participationLimit: 25, rewardCoins: 250, ticketCost: 1, label: "25 Slots → 250 Coins (1 🎟️)" },
  { participationLimit: 50, rewardCoins: 500, ticketCost: 1, label: "50 Slots → 500 Coins (1 🎟️)" },
  { participationLimit: 100, rewardCoins: 1000, ticketCost: 1, label: "100 Slots → 1000 Coins (1 🎟️)" }
];

export default function LuckyDrawAdmin() {
  const navigate = useNavigate();

  const [openDraws, setOpenDraws] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [tierFilter, setTierFilter] = useState("ALL");

  // Configuration Form State
  const [participationLimit, setParticipationLimit] = useState("10");
  const [rewardCoins, setRewardCoins] = useState("100");
  const [ticketCost, setTicketCost] = useState("1");
  const [savingConfig, setSavingConfig] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    // 1. Load Current Authority Configuration
    const fetchConfig = async () => {
      try {
        const configDoc = await getDoc(doc(db, "lucky_draw_config", "current"));
        if (configDoc.exists()) {
          const data = configDoc.data();
          if (data.participationLimit) setParticipationLimit(String(data.participationLimit));
          if (data.rewardCoins) setRewardCoins(String(data.rewardCoins));
          if (data.ticketCost) setTicketCost(String(data.ticketCost));
        }
      } catch (err) {
        console.error("Failed to load config:", err);
      }
    };
    fetchConfig();

    // 2. Real-time Listener for Active OPEN Draws Across All Presets
    const openQuery = query(collection(db, "lucky_draws"), orderBy("createdAt", "desc"));
    const unsubOpen = onSnapshot(
      openQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        const opens = docs.filter((d) => d.status === "OPEN" || d.status === "LOCK" || d.status === "CLOSING");
        opens.sort((a, b) => (a.rewardCoins || 0) - (b.rewardCoins || 0));
        setOpenDraws(opens);
        setLoading(false);
      },
      (err) => {
        console.error("Open draws error:", err);
        setLoading(false);
      }
    );

    // 3. Real-time Listener for Draw History
    const historyQuery = query(collection(db, "drawHistory"), orderBy("completedAt", "desc"));
    const unsubHistory = onSnapshot(historyQuery, (snapshot) => {
      const history = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setHistoryList(history);
    });

    return () => {
      unsubOpen();
      unsubHistory();
    };
  }, []);

  const handleSaveConfig = async (e) => {
    e.preventDefault();

    const p = Number(participationLimit);
    const r = Number(rewardCoins);
    const c = Number(ticketCost);

    if (p <= 0 || r <= 0 || c <= 0) {
      alert("All parameters must be positive integers!");
      return;
    }

    try {
      setSavingConfig(true);

      const configData = {
        participationLimit: p,
        rewardCoins: r,
        ticketCost: c,
        updatedAt: serverTimestamp(),
        updatedBy: "ADMIN_WEB"
      };

      await setDoc(doc(db, "lucky_draw_config", "current"), configData);
      await addDoc(collection(db, "lucky_draw_config_history"), configData);

      showToast("✅ Lucky draw authoritative configuration published successfully!");
    } catch (err) {
      console.error("Save config error:", err);
      showToast("❌ Failed to save configuration: " + err.message, "error");
    } finally {
      setSavingConfig(false);
    }
  };

  // Cancel draw and refund tickets to all enrolled players
  const handleCancelDraw = async (draw) => {
    const drawId = draw.id || draw.drawId;
    const confirmMsg = `Are you sure you want to CANCEL Lucky Draw #${drawId.slice(0, 8)}? All participants will have their ${draw.ticketCost || 1} tickets refunded.`;
    if (!window.confirm(confirmMsg)) return;

    setCancellingId(drawId);
    try {
      // 1. Fetch participants
      const entriesSnap = await getDocs(collection(db, "lucky_draw_entries", drawId, "users"));
      const refundCost = Number(draw.ticketCost) || 1;

      // 2. Refund each user's tickets
      for (const entryDoc of entriesSnap.docs) {
        const uid = entryDoc.id;
        try {
          await updateDoc(doc(db, "users", uid), {
            tickets: increment(refundCost)
          });
        } catch (e) {
          console.error("Refund error for user", uid, e);
        }
      }

      // 3. Mark draw as CANCELLED
      await updateDoc(doc(db, "lucky_draws", drawId), {
        status: "CANCELLED",
        cancelledAt: serverTimestamp(),
        cancelledBy: "admin"
      });

      showToast(`✅ Draw cancelled & ${entriesSnap.size} players refunded ${refundCost} tickets each!`);
    } catch (err) {
      console.error("Cancel draw failed:", err);
      showToast("❌ Failed to cancel draw: " + err.message, "error");
    } finally {
      setCancellingId(null);
    }
  };

  // Calculate Operational KPI Metrics
  const activeEventsCount = openDraws.length;
  const totalEnrolledSlots = openDraws.reduce(
    (acc, d) => acc + (d.currentParticipation ?? d.filledSlots ?? 0),
    0
  );
  const totalCapacitySlots = openDraws.reduce(
    (acc, d) => acc + (d.participationLimit ?? d.totalSlots ?? 10),
    0
  );
  const totalPrizePoolInPlay = openDraws.reduce(
    (acc, d) => acc + (Number(d.rewardCoins) || 0),
    0
  );
  const totalWinnersCrowned = historyList.length;

  // Filter Active Draws by Tier
  const filteredDraws = openDraws.filter((draw) => {
    const maxPart = draw.participationLimit ?? draw.totalSlots ?? 10;
    if (tierFilter === "SMALL") return maxPart <= 10;
    if (tierFilter === "MEDIUM") return maxPart > 10 && maxPart <= 25;
    if (tierFilter === "HIGH") return maxPart > 25;
    return true;
  });

  return (
    <div className="luckydraw-container animate-fade-in">
      
      {/* FLOATING TOAST NOTIFICATION */}
      {toast && (
        <div className={`luckydraw-toast ${toast.type === "error" ? "luckydraw-toast-error" : "luckydraw-toast-success"}`}>
          {toast.message}
        </div>
      )}

      {/* ================= HEADER BANNER ================= */}
      <div className="luckydraw-header">
        <div className="luckydraw-header-left">
          <div className="luckydraw-badge-row">
            <span className="luckydraw-engine-pill">
              <span>🎯</span> LOTTERY ENGINE COMMAND
            </span>
            <span className="luckydraw-preset-tag">
              6 Active Preset Tiers (5, 10, 20, 25, 50, 100 Slots)
            </span>
          </div>
          <h1 className="luckydraw-main-title">
            <span>🎲</span> Lucky Draw Operations &amp; Live Monitoring
          </h1>
          <p className="luckydraw-header-subtitle">
            Real-time participant fill tracking, auto-regenerating prize pools, authoritative preset config &amp; winner verification.
          </p>
        </div>

        <div className="luckydraw-header-actions">
          <button
            type="button"
            className="luckydraw-action-btn-primary"
            onClick={() => navigate("/admin/createluckydraw")}
          >
            <span>⚙️</span> Configure Next Draw
          </button>
          <button
            type="button"
            className="luckydraw-action-btn-secondary"
            onClick={() => navigate("/admin/winner-history")}
          >
            <span>🏆</span> Winner Hall of Fame
          </button>
        </div>
      </div>

      {/* ================= 4 OPERATIONAL KPI CARDS ================= */}
      <div className="luckydraw-kpi-grid">
        {/* KPI 1: Active Open Draws */}
        <div className="luckydraw-kpi-card kpi-variant-violet">
          <div className="luckydraw-kpi-icon">🔥</div>
          <div className="luckydraw-kpi-content">
            <div className="luckydraw-kpi-value">{activeEventsCount}</div>
            <div className="luckydraw-kpi-label">Active Open Events</div>
            <div className="luckydraw-kpi-subtext">Live lottery pools running</div>
          </div>
        </div>

        {/* KPI 2: Total Enrolled Slots */}
        <div className="luckydraw-kpi-card kpi-variant-cyan">
          <div className="luckydraw-kpi-icon">👥</div>
          <div className="luckydraw-kpi-content">
            <div className="luckydraw-kpi-value">
              {totalEnrolledSlots}
              <span style={{ fontSize: "15px", fontWeight: "700", color: "#E2E8F0" }}>
                {" "}/ {totalCapacitySlots}
              </span>
            </div>
            <div className="luckydraw-kpi-label">Total Enrolled Slots</div>
            <div className="luckydraw-kpi-subtext">
              {totalCapacitySlots > 0
                ? `${Math.round((totalEnrolledSlots / totalCapacitySlots) * 100)}% overall fill rate`
                : "Active participant tickets"}
            </div>
          </div>
        </div>

        {/* KPI 3: Prize Pool in Play */}
        <div className="luckydraw-kpi-card kpi-variant-gold">
          <div className="luckydraw-kpi-icon">🪙</div>
          <div className="luckydraw-kpi-content">
            <div className="luckydraw-kpi-value">
              {totalPrizePoolInPlay.toLocaleString()}
            </div>
            <div className="luckydraw-kpi-label">Prize Pool in Play</div>
            <div className="luckydraw-kpi-subtext">Coins under active competition</div>
          </div>
        </div>

        {/* KPI 4: Winners Crowned */}
        <div className="luckydraw-kpi-card kpi-variant-mint">
          <div className="luckydraw-kpi-icon">🏆</div>
          <div className="luckydraw-kpi-content">
            <div className="luckydraw-kpi-value">{totalWinnersCrowned}</div>
            <div className="luckydraw-kpi-label">Winners Crowned</div>
            <div className="luckydraw-kpi-subtext">Resolved lottery drawings</div>
          </div>
        </div>
      </div>

      {/* ================= 1. AUTHORITATIVE DRAW PARAMETERS ================= */}
      <div className="luckydraw-config-card">
        <div className="luckydraw-config-header">
          <div>
            <h3 className="luckydraw-config-title">
              <span>⚙️</span> Authoritative Draw Parameters
            </h3>
            <span className="luckydraw-config-desc">
              Controls the base settings for newly spawned auto-draws across the platform
            </span>
          </div>
          <span className="luckydraw-preset-tag" style={{ color: "#00F2FE", borderColor: "rgba(6, 182, 212, 0.4)" }}>
            ⚡ Live Firestore Rule: lucky_draw_config/current
          </span>
        </div>

        {/* Quick Preset Switcher Chips */}
        <div className="preset-chips-label">
          <span>⚡</span> Quick Preset Switcher (Select to Pre-fill):
        </div>
        <div className="preset-chips-grid">
          {PRESETS.map((p, idx) => {
            const isActive =
              Number(participationLimit) === p.participationLimit &&
              Number(rewardCoins) === p.rewardCoins &&
              Number(ticketCost) === p.ticketCost;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setParticipationLimit(String(p.participationLimit));
                  setRewardCoins(String(p.rewardCoins));
                  setTicketCost(String(p.ticketCost));
                }}
                className={`preset-chip-btn ${isActive ? "active" : ""}`}
              >
                <span>{p.label}</span>
                {isActive && <span className="chip-badge">ACTIVE</span>}
              </button>
            );
          })}
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSaveConfig} className="luckydraw-form-grid">
          <div className="luckydraw-form-group">
            <label className="luckydraw-input-label">
              PARTICIPATION LIMIT (SLOTS)
            </label>
            <input
              type="number"
              min="1"
              className="luckydraw-input"
              value={participationLimit}
              onChange={(e) => setParticipationLimit(e.target.value)}
              required
            />
          </div>

          <div className="luckydraw-form-group">
            <label className="luckydraw-input-label">
              REWARD PRIZE (COINS)
            </label>
            <input
              type="number"
              min="1"
              className="luckydraw-input"
              value={rewardCoins}
              onChange={(e) => setRewardCoins(e.target.value)}
              required
            />
          </div>

          <div className="luckydraw-form-group">
            <label className="luckydraw-input-label">
              TICKET ENTRY COST
            </label>
            <input
              type="number"
              min="1"
              className="luckydraw-input"
              value={ticketCost}
              onChange={(e) => setTicketCost(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={savingConfig}
            className="luckydraw-save-btn"
          >
            {savingConfig ? (
              <>
                <span className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }}></span>
                Saving...
              </>
            ) : (
              <>
                <span>💾</span> Save &amp; Publish Parameters
              </>
            )}
          </button>
        </form>
      </div>

      {/* ================= 2. ACTIVE OPEN DRAWS ================= */}
      <div className="luckydraw-section-header">
        <h3 className="luckydraw-section-title">
          <span>🔥</span> Active Open Draws
          <span className="luckydraw-count-chip">{filteredDraws.length} Active</span>
        </h3>

        {/* Tier Filter Tabs */}
        <div className="luckydraw-filter-tabs">
          <button
            type="button"
            className={`luckydraw-filter-btn ${tierFilter === "ALL" ? "active" : ""}`}
            onClick={() => setTierFilter("ALL")}
          >
            All Tiers ({openDraws.length})
          </button>
          <button
            type="button"
            className={`luckydraw-filter-btn ${tierFilter === "SMALL" ? "active" : ""}`}
            onClick={() => setTierFilter("SMALL")}
          >
            5 - 10 Slots
          </button>
          <button
            type="button"
            className={`luckydraw-filter-btn ${tierFilter === "MEDIUM" ? "active" : ""}`}
            onClick={() => setTierFilter("MEDIUM")}
          >
            20 - 25 Slots
          </button>
          <button
            type="button"
            className={`luckydraw-filter-btn ${tierFilter === "HIGH" ? "active" : ""}`}
            onClick={() => setTierFilter("HIGH")}
          >
            50 - 100 Slots
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div className="spinner"></div>
          <p style={{ color: "#FFFFFF", fontWeight: "800", marginTop: "14px" }}>
            Synchronizing live lucky draws from Firestore...
          </p>
        </div>
      ) : filteredDraws.length === 0 ? (
        <div
          className="glass-card"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            color: "#FFFFFF",
            marginBottom: "36px",
            border: "1.5px dashed rgba(255, 255, 255, 0.15)"
          }}
        >
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎲</div>
          <h4 style={{ margin: "0 0 6px 0", fontSize: "18px", fontWeight: "800", color: "#FFFFFF" }}>
            No Active Draws in This Tier
          </h4>
          <p style={{ margin: 0, fontSize: "13.5px", color: "#CBD5E1" }}>
            Backend automatically spawns new draws on demand as players join.
          </p>
        </div>
      ) : (
        <div className="luckydraw-cards-grid">
          {filteredDraws.map((draw) => {
            const currentPart = draw.currentParticipation ?? draw.filledSlots ?? 0;
            const maxPart = draw.participationLimit ?? draw.totalSlots ?? 10;
            const remSlots = Math.max(0, maxPart - currentPart);
            const pct = maxPart > 0 ? Math.min(100, Math.floor((currentPart / maxPart) * 100)) : 0;
            const drawId = draw.id || draw.drawId;

            return (
              <div key={drawId} className="luckydraw-event-card">
                <div>
                  {/* Top Bar: Draw ID + Status */}
                  <div className="luckydraw-card-topbar">
                    <span className="luckydraw-card-id">
                      #{drawId.slice(0, 8)}
                    </span>
                    <span className="luckydraw-status-badge status-badge-open">
                      <span className="status-pulse-dot"></span>
                      OPEN ({maxPart} Slots)
                    </span>
                  </div>

                  {/* Reward Prize Title */}
                  <div className="luckydraw-card-reward-title">
                    <span>🎁</span>
                    <span>Win </span>
                    <span className="luckydraw-card-reward-amount">
                      {Number(draw.rewardCoins || 0).toLocaleString()} Coins
                    </span>
                  </div>

                  {/* Specs Panel */}
                  <div className="luckydraw-specs-panel">
                    <div className="luckydraw-spec-item">
                      <span className="luckydraw-spec-label">Ticket Entry Cost</span>
                      <span className="luckydraw-spec-val cyan">
                        🎟️ {draw.ticketCost || 1} Ticket
                      </span>
                    </div>
                    <div className="luckydraw-spec-item">
                      <span className="luckydraw-spec-label">Remaining Slots</span>
                      <span className={`luckydraw-spec-val ${remSlots > 0 ? "mint" : "coral"}`}>
                        {remSlots} slots left
                      </span>
                    </div>
                  </div>

                  {/* Slot Progress */}
                  <div className="luckydraw-progress-wrap">
                    <div className="luckydraw-progress-meta">
                      <span className="luckydraw-progress-label">
                        Enrolled: <strong>{currentPart}</strong> / {maxPart}
                      </span>
                      <span className="luckydraw-progress-pct">{pct}% Fill</span>
                    </div>
                    <div className="luckydraw-progress-track">
                      <div
                        className="luckydraw-progress-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="luckydraw-card-actions">
                  <button
                    type="button"
                    className="luckydraw-btn-participants"
                    onClick={() => navigate(`/admin/lucky-draw/${drawId}`)}
                  >
                    <span>👥</span> Participants ({currentPart})
                  </button>
                  <button
                    type="button"
                    className="luckydraw-btn-cancel"
                    disabled={cancellingId === drawId}
                    onClick={() => handleCancelDraw(draw)}
                    title="Cancel draw and refund tickets to players"
                  >
                    {cancellingId === drawId ? "Refunding..." : "🚫 Cancel"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= 3. RECENT COMPLETED DRAWS ================= */}
      <div className="luckydraw-history-box">
        <div className="luckydraw-history-header">
          <h4 className="luckydraw-history-title">
            <span>📜</span> Recent Completed Draw History
          </h4>
          <button
            type="button"
            onClick={() => navigate("/admin/winner-history")}
            className="luckydraw-link-all"
          >
            View Full Records ({historyList.length}) →
          </button>
        </div>

        {historyList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 10px", color: "#FFFFFF", fontWeight: "700" }}>
            No completed draw history records yet.
          </div>
        ) : (
          <div className="luckydraw-table-wrap">
            <table className="luckydraw-table">
              <thead>
                <tr>
                  <th>Draw ID</th>
                  <th>Category</th>
                  <th>Reward</th>
                  <th>Winning Token</th>
                  <th>Winner UID</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {historyList.slice(0, 6).map((item) => (
                  <tr key={item.id || item.drawId}>
                    <td>
                      <span className="luckydraw-id-tag">
                        #{(item.drawId || item.id)?.slice(0, 8)}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: "#FFFFFF" }}>
                        {item.participationLimit || item.totalSlots || 10} Slots
                      </strong>
                    </td>
                    <td>
                      <span className="luckydraw-prize-pill">
                        🪙 {Number(item.rewardCoins || item.rewardAmount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className="luckydraw-token-chip">
                        {item.winningToken || "—"}
                      </span>
                    </td>
                    <td>
                      <span className="luckydraw-uid-pill">
                        {item.winningUserId || item.winnerUid || "—"}
                      </span>
                    </td>
                    <td>
                      <span className="luckydraw-status-badge status-badge-open">
                        <span className="status-pulse-dot" style={{ background: "#00F5A0" }}></span>
                        COMPLETED
                      </span>
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
}
