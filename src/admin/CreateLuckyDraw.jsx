import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../Firebase";
import { useNavigate } from "react-router-dom";

const PRESETS = [
  { participationLimit: 5, rewardCoins: 25, ticketCost: 5, label: "5 Slots → 25 Coins (5 Tickets)" },
  { participationLimit: 10, rewardCoins: 100, ticketCost: 10, label: "10 Slots → 100 Coins (10 Tickets)" },
  { participationLimit: 20, rewardCoins: 200, ticketCost: 20, label: "20 Slots → 200 Coins (20 Tickets)" },
  { participationLimit: 25, rewardCoins: 250, ticketCost: 25, label: "25 Slots → 250 Coins (25 Tickets)" },
  { participationLimit: 50, rewardCoins: 500, ticketCost: 50, label: "50 Slots → 500 Coins (50 Tickets)" },
  { participationLimit: 100, rewardCoins: 1000, ticketCost: 100, label: "100 Slots → 1000 Coins (100 Tickets)" }
];

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0f172a",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "24px",
    color: "#f8fafc"
  },
  card: {
    width: "100%",
    maxWidth: "480px",
    background: "#1e293b",
    borderRadius: "16px",
    padding: "28px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
    border: "1px solid #334155"
  },
  title: {
    fontSize: "22px",
    fontWeight: "800",
    marginBottom: "8px",
    textAlign: "center",
    color: "#38bdf8"
  },
  subtitle: {
    fontSize: "13px",
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: "20px"
  },
  presetGroup: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
    marginBottom: "20px"
  },
  presetBtn: (active) => ({
    padding: "8px",
    borderRadius: "8px",
    border: active ? "1px solid #38bdf8" : "1px solid #334155",
    background: active ? "rgba(56, 189, 248, 0.2)" : "#0f172a",
    color: active ? "#38bdf8" : "#cbd5e1",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer"
  }),
  field: {
    marginBottom: "16px"
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    marginBottom: "6px",
    color: "#94a3b8"
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #334155",
    background: "#0f172a",
    color: "#f8fafc",
    fontSize: "14px",
    boxSizing: "border-box"
  },
  btn: (loading) => ({
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    background: loading ? "#64748b" : "linear-gradient(135deg, #38bdf8, #2563eb)",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "700",
    cursor: loading ? "not-allowed" : "pointer",
    marginTop: "10px"
  })
};

const CreateLuckyDraw = () => {
  const navigate = useNavigate();

  const [participationLimit, setParticipationLimit] = useState("10");
  const [rewardCoins, setRewardCoins] = useState("100");
  const [ticketCost, setTicketCost] = useState("10");
  const [loading, setLoading] = useState(false);

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

      alert("🎉 Configuration updated successfully!\n\nThis configuration will automatically take effect on the next draw.");
      navigate("/admin/LuckyDrawAdmin");
    } catch (err) {
      console.error(err);
      alert("Failed to update lucky draw configuration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.title}>🎯 Configure Next Lucky Draw</div>
        <div style={subtitleStyle}>
          Sets authoritative defaults for all upcoming draws
        </div>

        <div style={{ marginBottom: "16px", fontSize: "12px", color: "#94a3b8" }}>Presets:</div>
        <div style={styles.presetGroup}>
          {PRESETS.map((preset, i) => (
            <button
              key={i}
              type="button"
              style={styles.presetBtn(
                Number(participationLimit) === preset.participationLimit &&
                Number(rewardCoins) === preset.rewardCoins &&
                Number(ticketCost) === preset.ticketCost
              )}
              onClick={() => {
                setParticipationLimit(String(preset.participationLimit));
                setRewardCoins(String(preset.rewardCoins));
                setTicketCost(String(preset.ticketCost));
              }}
            >
              {preset.participationLimit} Users / {preset.rewardCoins} Coins
            </button>
          ))}
        </div>

        <form onSubmit={handleSave}>
          <div style={styles.field}>
            <label style={styles.label}>Participation Limit (Slots)</label>
            <input
              type="number"
              value={participationLimit}
              onChange={(e) => setParticipationLimit(e.target.value)}
              placeholder="e.g. 10"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Reward Coins</label>
            <input
              type="number"
              value={rewardCoins}
              onChange={(e) => setRewardCoins(e.target.value)}
              placeholder="e.g. 100"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Ticket Cost</label>
            <input
              type="number"
              value={ticketCost}
              onChange={(e) => setTicketCost(e.target.value)}
              placeholder="e.g. 10"
              style={styles.input}
              required
            />
          </div>

          <button type="submit" disabled={loading} style={styles.btn(loading)}>
            {loading ? "Saving..." : "Save Configuration"}
          </button>
        </form>
      </div>
    </div>
  );
};

const subtitleStyle = {
  fontSize: "13px",
  color: "#94a3b8",
  textAlign: "center",
  marginBottom: "20px"
};

export default CreateLuckyDraw;
