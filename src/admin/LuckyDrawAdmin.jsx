import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  setDoc,
  addDoc,
  serverTimestamp,
  getDoc
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../Firebase";

/* ================= DEFAULT PRESETS ================= */

const PRESETS = [
  { participationLimit: 5, rewardCoins: 25, ticketCost: 1, label: "5 Participants → 25 Coins (Cost: 1 Ticket)" },
  { participationLimit: 10, rewardCoins: 100, ticketCost: 1, label: "10 Participants → 100 Coins (Cost: 1 Ticket)" },
  { participationLimit: 20, rewardCoins: 200, ticketCost: 1, label: "20 Participants → 200 Coins (Cost: 1 Ticket)" },
  { participationLimit: 25, rewardCoins: 250, ticketCost: 1, label: "25 Participants → 250 Coins (Cost: 1 Ticket)" },
  { participationLimit: 50, rewardCoins: 500, ticketCost: 1, label: "50 Participants → 500 Coins (Cost: 1 Ticket)" },
  { participationLimit: 100, rewardCoins: 1000, ticketCost: 1, label: "100 Participants → 1000 Coins (Cost: 1 Ticket)" }
];

/* ================= STYLES ================= */

const styles = {
  page: {
    padding: "24px",
    background: "#0f172a",
    minHeight: "100vh",
    color: "#f8fafc",
    fontFamily: "'Inter', sans-serif"
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "24px",
    paddingBottom: "16px",
    borderBottom: "1px solid #1e293b"
  },
  title: {
    fontSize: "26px",
    fontWeight: "800",
    color: "#f8fafc",
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  subtitle: {
    fontSize: "14px",
    color: "#94a3b8",
    marginTop: "4px"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: "24px",
    marginBottom: "32px"
  },
  card: {
    background: "#1e293b",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
    border: "1px solid #334155"
  },
  cardHeader: {
    fontSize: "18px",
    fontWeight: "700",
    marginBottom: "16px",
    color: "#38bdf8",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  presetGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "20px"
  },
  presetBtn: (active) => ({
    padding: "8px 12px",
    borderRadius: "8px",
    border: active ? "1px solid #38bdf8" : "1px solid #334155",
    background: active ? "rgba(56, 189, 248, 0.15)" : "#0f172a",
    color: active ? "#38bdf8" : "#cbd5e1",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease"
  }),
  formGroup: {
    marginBottom: "16px"
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#94a3b8",
    marginBottom: "6px"
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #334155",
    background: "#0f172a",
    color: "#f8fafc",
    fontSize: "15px",
    fontWeight: "600",
    boxSizing: "border-box",
    outline: "none"
  },
  btnSave: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    marginTop: "12px",
    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
    transition: "transform 0.1s ease"
  },
  infoRule: {
    background: "rgba(234, 179, 8, 0.1)",
    border: "1px solid rgba(234, 179, 8, 0.3)",
    borderRadius: "10px",
    padding: "12px 14px",
    fontSize: "12px",
    color: "#fde047",
    marginTop: "16px",
    lineHeight: "1.5"
  },
  liveBadge: {
    padding: "4px 10px",
    borderRadius: "20px",
    background: "rgba(34, 197, 94, 0.2)",
    color: "#4ade80",
    fontSize: "12px",
    fontWeight: "700",
    border: "1px solid rgba(34, 197, 94, 0.4)"
  },
  statRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid #334155"
  },
  statLabel: {
    color: "#94a3b8",
    fontSize: "13px"
  },
  statVal: {
    fontWeight: "700",
    fontSize: "14px",
    color: "#f8fafc"
  },
  progressTrack: {
    height: "8px",
    background: "#0f172a",
    borderRadius: "6px",
    overflow: "hidden",
    marginTop: "12px",
    border: "1px solid #334155"
  },
  progressBar: (pct) => ({
    height: "100%",
    width: `${pct}%`,
    background: "linear-gradient(90deg, #38bdf8, #4ade80)",
    borderRadius: "6px",
    transition: "width 0.5s ease"
  }),
  tableContainer: {
    background: "#1e293b",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid #334155",
    overflowX: "auto"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left"
  },
  th: {
    padding: "12px 16px",
    color: "#94a3b8",
    fontSize: "12px",
    fontWeight: "700",
    textTransform: "uppercase",
    borderBottom: "1px solid #334155"
  },
  td: {
    padding: "14px 16px",
    color: "#e2e8f0",
    fontSize: "13px",
    borderBottom: "1px solid #334155"
  },
  tokenBadge: {
    fontFamily: "monospace",
    background: "#0f172a",
    padding: "4px 8px",
    borderRadius: "6px",
    color: "#f59e0b",
    fontWeight: "700",
    border: "1px solid #334155",
    letterSpacing: "1px"
  },
  statusBadge: (status) => ({
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    background: status === "COMPLETED" ? "rgba(34, 197, 94, 0.2)" : "rgba(234, 179, 8, 0.2)",
    color: status === "COMPLETED" ? "#4ade80" : "#fde047",
    border: status === "COMPLETED" ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(234, 179, 8, 0.3)"
  })
};

/* ================= MAIN COMPONENT ================= */

const LuckyDrawAdmin = () => {
  const navigate = useNavigate();

  // Admin Config State
  const [participationLimit, setParticipationLimit] = useState(10);
  const [rewardCoins, setRewardCoins] = useState(100);
  const [ticketCost, setTicketCost] = useState(10);
  const [savingConfig, setSavingConfig] = useState(false);

  // Active Draws & History State
  const [openDraws, setOpenDraws] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ===== FETCH CURRENT CONFIG & LISTEN TO ACTIVE DRAWS & HISTORY ===== */
  useEffect(() => {
    // 1. Fetch Admin Config
    const fetchConfig = async () => {
      try {
        const configDoc = await getDoc(doc(db, "lucky_draw_config", "current"));
        if (configDoc.exists()) {
          const data = configDoc.data();
          if (data.participationLimit) setParticipationLimit(data.participationLimit);
          if (data.rewardCoins) setRewardCoins(data.rewardCoins);
          if (data.ticketCost) setTicketCost(data.ticketCost);
        }
      } catch (err) {
        console.error("Failed to load config:", err);
      }
    };
    fetchConfig();

    // 2. Real-time Listener for Active OPEN Draws Across All Presets
    const openQuery = query(collection(db, "lucky_draws"), orderBy("createdAt", "desc"));
    const unsubOpen = onSnapshot(openQuery, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const opens = docs.filter((d) => d.status === "OPEN" || d.status === "LOCK" || d.status === "CLOSING");
      opens.sort((a, b) => (a.rewardCoins || 0) - (b.rewardCoins || 0));
      setOpenDraws(opens);
      setLoading(false);
    });

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

  /* ===== APPLY PRESET ===== */
  const applyPreset = (preset) => {
    setParticipationLimit(preset.participationLimit);
    setRewardCoins(preset.rewardCoins);
    setTicketCost(preset.ticketCost);
  };

  /* ===== SAVE CONFIGURATION ===== */
  const handleSaveConfig = async (e) => {
    e.preventDefault();

    const p = Number(participationLimit);
    const r = Number(rewardCoins);
    const c = Number(ticketCost);

    if (p <= 0 || r <= 0 || c <= 0) {
      alert("⚠️ All configuration values must be greater than zero!");
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

      // 1. Update current config doc
      await setDoc(doc(db, "lucky_draw_config", "current"), configData);

      // 2. Add to history collection
      await addDoc(collection(db, "lucky_draw_config_history"), configData);

      alert("✅ Configuration Saved Successfully!\n\nThis configuration will automatically be used for the NEXT draw of this preset category.");
    } catch (err) {
      console.error("Save config error:", err);
      alert("❌ Failed to save configuration: " + err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <div style={styles.title}>
            <span>🎯</span> Lucky Draw Management
          </div>
          <div style={styles.subtitle}>
            Active Open Preset Category Draws (5, 10, 20, 25, 50, 100) & Automatic Draw Generation
          </div>
        </div>
        <button
          style={{
            padding: "10px 18px",
            borderRadius: "10px",
            background: "#1e293b",
            color: "#38bdf8",
            border: "1px solid #334155",
            fontWeight: "700",
            cursor: "pointer"
          }}
          onClick={() => navigate("/admin/winner-history")}
        >
          🏆 Full Winner History
        </button>
      </div>

      {/* ================= 1. ADMIN CONFIGURATION PANEL ================= */}
      <div style={{ marginBottom: "32px" }}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span>⚙️ Draw Configuration Settings & Presets</span>
          </div>

          <div style={styles.label}>Supported Presets:</div>
          <div style={styles.presetGroup}>
            {PRESETS.map((preset, idx) => {
              const isActive =
                participationLimit === preset.participationLimit &&
                rewardCoins === preset.rewardCoins &&
                ticketCost === preset.ticketCost;
              return (
                <button
                  key={idx}
                  style={styles.presetBtn(isActive)}
                  onClick={() => applyPreset(preset)}
                >
                  {preset.participationLimit} Users → {preset.rewardCoins} Coins (Cost: {preset.ticketCost})
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSaveConfig} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", alignItems: "end" }}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Participation Limit (Slots)</label>
              <input
                type="number"
                style={styles.input}
                value={participationLimit}
                onChange={(e) => setParticipationLimit(e.target.value)}
                placeholder="e.g. 10"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Reward Coins</label>
              <input
                type="number"
                style={styles.input}
                value={rewardCoins}
                onChange={(e) => setRewardCoins(e.target.value)}
                placeholder="e.g. 100"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Ticket Cost (Tickets)</label>
              <input
                type="number"
                style={styles.input}
                value={ticketCost}
                onChange={(e) => setTicketCost(e.target.value)}
                placeholder="e.g. 10"
                required
              />
            </div>

            <button type="submit" disabled={savingConfig} style={{ ...styles.btnSave, marginTop: 0 }}>
              {savingConfig ? "Saving..." : "Save Configuration"}
            </button>
          </form>

          <div style={styles.infoRule}>
            📌 <b>ALL PRESET CATEGORIES ACTIVE SIMULTANEOUSLY:</b> Backend maintains an active OPEN draw for each preset category (5, 10, 20, 25, 50, 100). When any draw fills and completes, the next draw for that category is automatically created!
          </div>
        </div>
      </div>

      {/* ================= 2. LIVE ACTIVE DRAWS GRID ================= */}
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ fontSize: "18px", color: "#38bdf8", marginBottom: "16px" }}>
          🔥 Active Open Preset Category Draws ({openDraws.length})
        </h3>
      </div>

      {loading ? (
        <p style={{ color: "#94a3b8" }}>Loading active draws...</p>
      ) : openDraws.length === 0 ? (
        <p style={{ color: "#94a3b8" }}>No active open draws found. Backend will automatically generate them on startup/request.</p>
      ) : (
        <div style={styles.grid}>
          {openDraws.map((draw) => {
            const currentPart = draw.currentParticipation ?? draw.filledSlots ?? 0;
            const maxPart = draw.participationLimit ?? draw.totalSlots ?? 10;
            const remSlots = Math.max(0, maxPart - currentPart);
            const pct = maxPart > 0 ? Math.min(100, Math.floor((currentPart / maxPart) * 100)) : 0;

            return (
              <div key={draw.id || draw.drawId} style={styles.card}>
                <div style={styles.cardHeader}>
                  <span style={{ color: "#38bdf8", fontWeight: "800" }}>#{draw.drawId || draw.id}</span>
                  <span style={styles.liveBadge}>OPEN ({maxPart} Slots)</span>
                </div>

                <div style={styles.statRow}>
                  <span style={styles.statLabel}>Participation Category</span>
                  <span style={{ ...styles.statVal, color: "#f59e0b" }}>
                    {maxPart} Participants
                  </span>
                </div>

                <div style={styles.statRow}>
                  <span style={styles.statLabel}>Reward Coins</span>
                  <span style={{ ...styles.statVal, color: "#4ade80" }}>
                    🪙 {draw.rewardCoins} Coins
                  </span>
                </div>

                <div style={styles.statRow}>
                  <span style={styles.statLabel}>Ticket Cost</span>
                  <span style={styles.statVal}>
                    🎟️ {draw.ticketCost} Tickets / entry
                  </span>
                </div>

                <div style={styles.statRow}>
                  <span style={styles.statLabel}>Current Entries</span>
                  <span style={styles.statVal}>
                    {currentPart} / {maxPart}
                  </span>
                </div>

                <div style={styles.statRow}>
                  <span style={styles.statLabel}>Remaining Slots</span>
                  <span style={{ ...styles.statVal, color: remSlots > 0 ? "#4ade80" : "#ef4444" }}>
                    {remSlots} slots left
                  </span>
                </div>

                <div style={styles.progressTrack}>
                  <div style={styles.progressBar(pct)} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "11px", color: "#94a3b8" }}>
                  <span>Progress</span>
                  <span>{pct}% Filled</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= 3. DRAW HISTORY TABLE ================= */}
      <div style={styles.tableContainer}>
        <div style={{ ...styles.cardHeader, marginBottom: "20px" }}>
          <span>📜 Completed Draw History</span>
          <span style={{ fontSize: "13px", color: "#94a3b8" }}>Showing last {historyList.length} completed draws</span>
        </div>

        {historyList.length === 0 ? (
          <p style={{ color: "#94a3b8", textAlign: "center", padding: "20px" }}>
            No completed draws recorded yet. Completed draws will automatically populate here with full winner & token details.
          </p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Draw ID</th>
                <th style={styles.th}>Participation</th>
                <th style={styles.th}>Reward</th>
                <th style={styles.th}>Ticket Cost</th>
                <th style={styles.th}>Winning Token (5 Digit)</th>
                <th style={styles.th}>Winner UID</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Completed At</th>
              </tr>
            </thead>
            <tbody>
              {historyList.map((item) => (
                <tr key={item.id || item.drawId}>
                  <td style={{ ...styles.td, fontWeight: "700", color: "#38bdf8" }}>
                    #{item.drawId || item.id}
                  </td>
                  <td style={styles.td}>{item.participationLimit || item.totalSlots || 0}</td>
                  <td style={{ ...styles.td, color: "#f59e0b", fontWeight: "700" }}>
                    🪙 {item.rewardCoins || item.rewardAmount || 0}
                  </td>
                  <td style={styles.td}>🎟️ {item.ticketCost || "-"}</td>
                  <td style={styles.td}>
                    <span style={styles.tokenBadge}>{item.winningToken || "—"}</span>
                  </td>
                  <td style={{ ...styles.td, fontFamily: "monospace" }}>
                    {item.winningUserId || item.winnerUid || "—"}
                  </td>
                  <td style={styles.td}>
                    <span style={styles.statusBadge(item.status || "COMPLETED")}>
                      {item.status || "COMPLETED"}
                    </span>
                  </td>
                  <td style={{ ...styles.td, color: "#94a3b8", fontSize: "12px" }}>
                    {item.completedAt?.toDate ? item.completedAt.toDate().toLocaleString() : (item.completedAt || "—")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default LuckyDrawAdmin;
