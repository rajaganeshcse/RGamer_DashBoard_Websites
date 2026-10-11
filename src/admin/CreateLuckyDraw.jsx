import React, { useEffect, useState } from "react";
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../Firebase";
import { useNavigate } from "react-router-dom";
import "./LuckyDraw.css";

const PRESETS = [
  { participationLimit: 5, rewardCoins: 25, ticketCost: 1, label: "5 Slots → 25 Coins (1 🎟️)" },
  { participationLimit: 10, rewardCoins: 100, ticketCost: 1, label: "10 Slots → 100 Coins (1 🎟️)" },
  { participationLimit: 20, rewardCoins: 200, ticketCost: 1, label: "20 Slots → 200 Coins (1 🎟️)" },
  { participationLimit: 25, rewardCoins: 250, ticketCost: 1, label: "25 Slots → 250 Coins (1 🎟️)" },
  { participationLimit: 50, rewardCoins: 500, ticketCost: 1, label: "50 Slots → 500 Coins (1 🎟️)" },
  { participationLimit: 100, rewardCoins: 1000, ticketCost: 1, label: "100 Slots → 1000 Coins (1 🎟️)" }
];

const CreateLuckyDraw = () => {
  const navigate = useNavigate();

  const [participationLimit, setParticipationLimit] = useState("10");
  const [rewardCoins, setRewardCoins] = useState("100");
  const [ticketCost, setTicketCost] = useState("1");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docSnap = await getDoc(doc(db, "lucky_draw_config", "current"));
        if (docSnap.exists()) {
          const d = docSnap.data();
          if (d.participationLimit) setParticipationLimit(String(d.participationLimit));
          if (d.rewardCoins) setRewardCoins(String(d.rewardCoins));
          if (d.ticketCost) setTicketCost(String(d.ticketCost));
        }
      } catch (ignored) {}
    };
    fetchConfig();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();

    const p = Number(participationLimit);
    const r = Number(rewardCoins);
    const c = Number(ticketCost);

    if (p <= 0 || r <= 0 || c <= 0) {
      alert("Please enter valid positive numbers for all parameters");
      return;
    }

    try {
      setLoading(true);

      const configData = {
        participationLimit: p,
        rewardCoins: r,
        ticketCost: c,
        updatedAt: serverTimestamp(),
        updatedBy: "ADMIN_WEB"
      };

      await setDoc(doc(db, "lucky_draw_config", "current"), configData);
      await addDoc(collection(db, "lucky_draw_config_history"), configData);

      setStatusMsg("🎉 Authoritative configuration published successfully! All newly spawned draws will use these parameters.");
      setTimeout(() => {
        navigate("/admin/LuckyDrawAdmin");
      }, 1500);
    } catch (err) {
      console.error(err);
      alert("Failed to update lucky draw configuration: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="luckydraw-container animate-fade-in" style={{ maxWidth: "1100px" }}>
      
      {/* HEADER BAR */}
      <div className="luckydraw-header">
        <div className="luckydraw-header-left">
          <div className="luckydraw-badge-row">
            <span className="luckydraw-engine-pill">
              <span>⚙️</span> DRAW CONFIGURATION
            </span>
            <span className="luckydraw-preset-tag">
              Global Platform Parameters
            </span>
          </div>
          <h1 className="luckydraw-main-title">
            <span>🎯</span> Configure Authoritative Lucky Draw
          </h1>
          <p className="luckydraw-header-subtitle">
            Set default prize pools, participant limits, and ticket entry requirements for automatic lottery cycles.
          </p>
        </div>

        <button
          type="button"
          className="luckydraw-action-btn-secondary"
          onClick={() => navigate("/admin/LuckyDrawAdmin")}
        >
          <span>←</span> Back to Operations
        </button>
      </div>

      {statusMsg && (
        <div
          style={{
            background: "rgba(16, 185, 129, 0.2)",
            color: "#34D399",
            border: "1.5px solid rgba(16, 185, 129, 0.45)",
            padding: "16px 20px",
            borderRadius: "14px",
            marginBottom: "24px",
            fontSize: "14px",
            fontWeight: "800",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}
        >
          <span>✅</span> {statusMsg}
        </div>
      )}

      {/* TWO-COLUMN LAYOUT: CONFIG FORM ON LEFT, LIVE PREVIEW CARD ON RIGHT */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px", alignItems: "start" }}>
        
        {/* LEFT COLUMN: FORM */}
        <div className="luckydraw-config-card" style={{ marginBottom: 0 }}>
          <div className="preset-chips-label">
            <span>⚡</span> Quick Popular Presets:
          </div>
          <div className="preset-chips-grid" style={{ marginBottom: "20px" }}>
            {PRESETS.map((preset, i) => {
              const active =
                Number(participationLimit) === preset.participationLimit &&
                Number(rewardCoins) === preset.rewardCoins &&
                Number(ticketCost) === preset.ticketCost;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setParticipationLimit(String(preset.participationLimit));
                    setRewardCoins(String(preset.rewardCoins));
                    setTicketCost(String(preset.ticketCost));
                  }}
                  className={`preset-chip-btn ${active ? "active" : ""}`}
                  style={{ width: "100%", justifyContent: "space-between" }}
                >
                  <span>{preset.label}</span>
                  {active && <span className="chip-badge">ACTIVE</span>}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSave}>
            <div className="luckydraw-form-group" style={{ marginBottom: "18px" }}>
              <label className="luckydraw-input-label">
                PARTICIPATION LIMIT (TOTAL SLOTS)
              </label>
              <input
                type="number"
                min="1"
                value={participationLimit}
                onChange={(e) => setParticipationLimit(e.target.value)}
                placeholder="e.g. 10"
                className="luckydraw-input"
                required
              />
            </div>

            <div className="luckydraw-form-group" style={{ marginBottom: "18px" }}>
              <label className="luckydraw-input-label">
                REWARD PRIZE (COINS AWARDED TO WINNER)
              </label>
              <input
                type="number"
                min="1"
                value={rewardCoins}
                onChange={(e) => setRewardCoins(e.target.value)}
                placeholder="e.g. 100"
                className="luckydraw-input"
                required
              />
            </div>

            <div className="luckydraw-form-group" style={{ marginBottom: "24px" }}>
              <label className="luckydraw-input-label">
                TICKET ENTRY COST (TICKETS CONSUMED PER ENTRY)
              </label>
              <input
                type="number"
                min="1"
                value={ticketCost}
                onChange={(e) => setTicketCost(e.target.value)}
                placeholder="e.g. 1"
                className="luckydraw-input"
                required
              />
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                className="luckydraw-action-btn-secondary"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => navigate("/admin/LuckyDrawAdmin")}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="luckydraw-action-btn-primary"
                style={{ flex: 2, justifyContent: "center" }}
              >
                {loading ? "Publishing Config..." : "Publish Configuration →"}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: LIVE PREVIEW CARD */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ fontSize: "13px", fontWeight: "800", color: "#00F2FE", textTransform: "uppercase", letterSpacing: "0.6px", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>👁️</span> Real-time Live Event Preview
          </div>

          <div className="luckydraw-event-card" style={{ boxShadow: "0 0 30px rgba(99, 102, 241, 0.25)" }}>
            <div>
              <div className="luckydraw-card-topbar">
                <span className="luckydraw-card-id">#LIVE-PREVIEW</span>
                <span className="luckydraw-status-badge status-badge-open">
                  <span className="status-pulse-dot"></span>
                  OPEN ({participationLimit || 10} Slots)
                </span>
              </div>

              <div className="luckydraw-card-reward-title">
                <span>🎁</span>
                <span>Win </span>
                <span className="luckydraw-card-reward-amount">
                  {Number(rewardCoins || 0).toLocaleString()} Coins
                </span>
              </div>

              <div className="luckydraw-specs-panel">
                <div className="luckydraw-spec-item">
                  <span className="luckydraw-spec-label">Ticket Entry Cost</span>
                  <span className="luckydraw-spec-val cyan">
                    🎟️ {ticketCost || 1} Ticket
                  </span>
                </div>
                <div className="luckydraw-spec-item">
                  <span className="luckydraw-spec-label">Remaining Slots</span>
                  <span className="luckydraw-spec-val mint">
                    {participationLimit || 10} slots left
                  </span>
                </div>
              </div>

              <div className="luckydraw-progress-wrap">
                <div className="luckydraw-progress-meta">
                  <span className="luckydraw-progress-label">
                    Enrolled: <strong>0</strong> / {participationLimit || 10}
                  </span>
                  <span className="luckydraw-progress-pct">0% Fill</span>
                </div>
                <div className="luckydraw-progress-track">
                  <div className="luckydraw-progress-fill" style={{ width: "0%" }} />
                </div>
              </div>
            </div>

            <div style={{ background: "rgba(255, 255, 255, 0.04)", borderRadius: "10px", padding: "10px 12px", border: "1px dashed rgba(255, 255, 255, 0.15)", fontSize: "12px", color: "#E2E8F0", textAlign: "center" }}>
              💡 This card illustrates how newly generated lottery events will appear in the player app and admin console.
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default CreateLuckyDraw;
