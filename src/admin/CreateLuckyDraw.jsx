import React, { useEffect, useState } from "react";
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../Firebase";
import { useNavigate } from "react-router-dom";

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
      alert("Please enter valid positive numbers for all fields");
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

      setStatusMsg("🎉 Configuration updated successfully! This configuration takes effect immediately on all upcoming draws.");
      setTimeout(() => {
        navigate("/admin/LuckyDrawAdmin");
      }, 1500);
    } catch (err) {
      console.error(err);
      alert("Failed to update lucky draw configuration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "40px 20px", display: "flex", justifyContent: "center" }} className="animate-fade-in">
      <div className="glass-card" style={{ width: "100%", maxWidth: "560px", padding: "36px" }}>
        
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <span style={{ fontSize: "40px", display: "inline-block", marginBottom: "8px" }}>🎯</span>
          <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "800", color: "#F8FAFC" }}>
            Configure Next Lucky Draw
          </h2>
          <p style={{ margin: "6px 0 0 0", fontSize: "14px", color: "#94A3B8" }}>
            Authoritative parameters for auto-generating lottery events
          </p>
        </div>

        {statusMsg && (
          <div style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34D399", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "12px", borderRadius: "10px", marginBottom: "20px", fontSize: "13px" }}>
            {statusMsg}
          </div>
        )}

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#94A3B8", marginBottom: "8px", textTransform: "uppercase" }}>
            Select Popular Preset
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
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
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: active ? "1px solid #6366F1" : "1px solid rgba(255,255,255,0.08)",
                    background: active ? "rgba(99, 102, 241, 0.2)" : "rgba(255,255,255,0.03)",
                    color: active ? "#818CF8" : "#CBD5E1",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    textAlign: "center"
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#94A3B8", marginBottom: "6px" }}>
              PARTICIPATION LIMIT (SLOTS)
            </label>
            <input
              type="number"
              min="1"
              value={participationLimit}
              onChange={(e) => setParticipationLimit(e.target.value)}
              placeholder="e.g. 10"
              className="form-input"
              required
            />
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#94A3B8", marginBottom: "6px" }}>
              REWARD PRIZE (COINS)
            </label>
            <input
              type="number"
              min="1"
              value={rewardCoins}
              onChange={(e) => setRewardCoins(e.target.value)}
              placeholder="e.g. 100"
              className="form-input"
              required
            />
          </div>

          <div style={{ marginBottom: "26px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#94A3B8", marginBottom: "6px" }}>
              TICKET ENTRY COST
            </label>
            <input
              type="number"
              min="1"
              value={ticketCost}
              onChange={(e) => setTicketCost(e.target.value)}
              placeholder="e.g. 1"
              className="form-input"
              required
            />
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ flex: 1, justifyContent: "center" }}
              onClick={() => navigate("/admin/LuckyDrawAdmin")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-glow"
              style={{ flex: 2, justifyContent: "center" }}
            >
              {loading ? "Saving Parameters..." : "Publish Configuration →"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default CreateLuckyDraw;
