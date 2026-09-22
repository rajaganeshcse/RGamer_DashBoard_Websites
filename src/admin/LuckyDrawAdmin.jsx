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

  // Configuration Form State
  const [participationLimit, setParticipationLimit] = useState("10");
  const [rewardCoins, setRewardCoins] = useState("100");
  const [ticketCost, setTicketCost] = useState("1");
  const [savingConfig, setSavingConfig] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
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
      alert("All values must be positive integers!");
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

      showToast("✅ Lucky draw configuration updated successfully!");
    } catch (err) {
      console.error("Save config error:", err);
      showToast("❌ Failed to save configuration", "error");
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

      showToast(`Draw cancelled & ${entriesSnap.size} players refunded ${refundCost} tickets each!`);
    } catch (err) {
      console.error("Cancel draw failed:", err);
      showToast("Failed to cancel draw: " + err.message, "error");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div style={{ padding: "28px", maxWidth: "1400px", margin: "0 auto" }} className="animate-fade-in">
      
      {/* FLOATING TOAST */}
      {toast && (
        <div className={`floating-toast ${toast.type === "error" ? "toast-error" : "toast-success"}`}>
          {toast.message}
        </div>
      )}

      {/* HEADER BANNER */}
      <div
        className="glass-card"
        style={{
          padding: "28px 32px",
          marginBottom: "28px",
          background: "linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(6, 182, 212, 0.15) 100%)",
          borderColor: "rgba(139, 92, 246, 0.4)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <span className="badge badge-info">🎯 LOTTERY ENGINE</span>
            <span style={{ fontSize: "12px", color: "#94A3B8" }}>6 Active Presets (5, 10, 20, 25, 50, 100 Slots)</span>
          </div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "800", color: "#F8FAFC", letterSpacing: "-0.5px" }}>
            Lucky Draw Management &amp; Automation
          </h1>
          <p style={{ margin: "6px 0 0 0", fontSize: "14px", color: "#CBD5E1" }}>
            Monitor real-time participant fills, inspect lottery entrants, manage presets, and audit winner histories.
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button className="btn-glow" onClick={() => navigate("/admin/createluckydraw")}>
            <span>⚙️</span> Configure Next Draw
          </button>
          <button className="btn-secondary" onClick={() => navigate("/admin/winner-history")}>
            <span>🏆</span> Full Winner History
          </button>
        </div>
      </div>

      {/* ================= 1. CONFIGURATION PRESETS ================= */}
      <div className="glass-card" style={{ padding: "28px", marginBottom: "32px" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "700", color: "#F8FAFC", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>⚙️</span> Authoritative Draw Parameters
        </h3>

        <div style={{ marginBottom: "14px", fontSize: "12px", color: "#94A3B8", fontWeight: "700", textTransform: "uppercase" }}>
          Quick Preset Switcher:
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
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
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: isActive ? "1px solid #8B5CF6" : "1px solid rgba(255, 255, 255, 0.08)",
                  background: isActive ? "rgba(139, 92, 246, 0.25)" : "rgba(255, 255, 255, 0.03)",
                  color: isActive ? "#C084FC" : "#94A3B8",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSaveConfig} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#94A3B8", marginBottom: "6px" }}>
              PARTICIPATION LIMIT (SLOTS)
            </label>
            <input
              type="number"
              className="form-input"
              value={participationLimit}
              onChange={(e) => setParticipationLimit(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#94A3B8", marginBottom: "6px" }}>
              REWARD PRIZE (COINS)
            </label>
            <input
              type="number"
              className="form-input"
              value={rewardCoins}
              onChange={(e) => setRewardCoins(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#94A3B8", marginBottom: "6px" }}>
              TICKET ENTRY COST
            </label>
            <input
              type="number"
              className="form-input"
              value={ticketCost}
              onChange={(e) => setTicketCost(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={savingConfig}
            className="btn-glow"
            style={{ padding: "11px 18px", justifyContent: "center" }}
          >
            {savingConfig ? "Saving..." : "Save Parameters"}
          </button>
        </form>
      </div>

      {/* ================= 2. ACTIVE OPEN DRAWS ================= */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.8px", margin: 0 }}>
          🔥 Active Open Draws ({openDraws.length})
        </h3>
        <span style={{ fontSize: "12px", color: "#94A3B8" }}>Auto-completes and regenerates when slots fill</span>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div className="spinner"></div>
          <p style={{ color: "#94A3B8" }}>Loading active lucky draws...</p>
        </div>
      ) : openDraws.length === 0 ? (
        <div className="glass-card" style={{ padding: "40px", textAlign: "center", color: "#94A3B8", marginBottom: "32px" }}>
          No active open draws found. Backend automatically regenerates them on demand.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "20px", marginBottom: "36px" }}>
          {openDraws.map((draw) => {
            const currentPart = draw.currentParticipation ?? draw.filledSlots ?? 0;
            const maxPart = draw.participationLimit ?? draw.totalSlots ?? 10;
            const remSlots = Math.max(0, maxPart - currentPart);
            const pct = maxPart > 0 ? Math.min(100, Math.floor((currentPart / maxPart) * 100)) : 0;
            const drawId = draw.id || draw.drawId;

            return (
              <div
                key={drawId}
                className="glass-card"
                style={{
                  padding: "22px",
                  borderTop: "3px solid #8B5CF6",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ fontSize: "12px", color: "#94A3B8", fontFamily: "monospace" }}>
                      #{drawId.slice(0, 8)}
                    </span>
                    <span className="badge badge-success">
                      OPEN ({maxPart} Slots)
                    </span>
                  </div>

                  <div style={{ fontSize: "20px", fontWeight: "800", color: "#F8FAFC", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>🎁</span> Win {Number(draw.rewardCoins || 0).toLocaleString()} Coins
                  </div>

                  <div style={{ background: "rgba(255, 255, 255, 0.03)", borderRadius: "8px", padding: "10px 12px", marginBottom: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94A3B8", marginBottom: "4px" }}>
                      <span>Ticket Entry Cost:</span>
                      <strong style={{ color: "#60A5FA" }}>🎟️ {draw.ticketCost || 1} Ticket</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94A3B8" }}>
                      <span>Remaining Slots:</span>
                      <strong style={{ color: remSlots > 0 ? "#34D399" : "#F87171" }}>{remSlots} slots left</strong>
                    </div>
                  </div>

                  {/* Progress */}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#CBD5E1", marginBottom: "6px" }}>
                    <span>Enrolled: <strong>{currentPart}</strong> / {maxPart}</span>
                    <span style={{ color: "#818CF8", fontWeight: "700" }}>{pct}%</span>
                  </div>
                  <div style={{ height: "7px", width: "100%", background: "rgba(255,255,255,0.06)", borderRadius: "6px", overflow: "hidden", marginBottom: "16px" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: "linear-gradient(90deg, #6366F1, #C084FC)",
                        transition: "width 0.4s ease"
                      }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "8px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <button
                    className="btn-secondary"
                    style={{ flex: 1, padding: "8px 10px", fontSize: "12px", justifyContent: "center" }}
                    onClick={() => navigate(`/admin/lucky-draw/${drawId}`)}
                  >
                    👥 Participants ({currentPart})
                  </button>
                  <button
                    className="btn-danger"
                    style={{ padding: "8px 12px", fontSize: "12px" }}
                    disabled={cancellingId === drawId}
                    onClick={() => handleCancelDraw(draw)}
                    title="Cancel draw and refund tickets to players"
                  >
                    {cancellingId === drawId ? "..." : "🚫 Cancel"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= 3. RECENT COMPLETED DRAWS ================= */}
      <div className="glass-card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#F8FAFC", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>📜</span> Recent Completed Draw History
          </h4>
          <button
            onClick={() => navigate("/admin/winner-history")}
            style={{ background: "transparent", border: "none", color: "#818CF8", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
          >
            View Full Records ({historyList.length}) →
          </button>
        </div>

        {historyList.length === 0 ? (
          <p style={{ color: "#94A3B8", fontSize: "13px" }}>No completed draw history records yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="user-table">
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
                {historyList.slice(0, 5).map((item) => (
                  <tr key={item.id || item.drawId} className="table-row">
                    <td>
                      <code style={{ color: "#38BDF8", fontSize: "12px" }}>
                        #{(item.drawId || item.id)?.slice(0, 8)}
                      </code>
                    </td>
                    <td>{item.participationLimit || item.totalSlots || 10} Slots</td>
                    <td>
                      <span className="badge badge-pending">
                        🪙 {item.rewardCoins || item.rewardAmount || 0}
                      </span>
                    </td>
                    <td>
                      <code style={{ color: "#A855F7", fontWeight: "700" }}>{item.winningToken || "—"}</code>
                    </td>
                    <td>
                      <span style={{ fontSize: "12px", fontFamily: "monospace", color: "#94A3B8" }}>
                        {item.winningUserId || item.winnerUid || "—"}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-success">COMPLETED</span>
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
