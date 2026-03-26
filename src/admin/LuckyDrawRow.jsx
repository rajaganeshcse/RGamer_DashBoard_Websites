import React from "react";

/* ================= STYLES ================= */

const styles = {
  card: {
    border: "1px solid #e0e0e0",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "14px",
    background: "#ffffff",
    boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease"
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px"
  },

  idText: {
    fontSize: "12px",
    color: "#888"
  },

  status: (status) => ({
    fontWeight: "bold",
    fontSize: "13px",
    color: status === "COMPLETED" ? "#2e7d32" : "#ff9800"
  }),

  reward: {
    fontSize: "16px",
    fontWeight: "bold",
    marginTop: "6px"
  },

  slots: {
    fontSize: "13px",
    color: "#555",
    marginTop: "4px"
  },

  progressWrap: {
    height: "7px",
    width: "100%",
    background: "#e0e0e0",
    borderRadius: "6px",
    overflow: "hidden",
    marginTop: "8px"
  },

  progressBar: (percent) => ({
    height: "100%",
    width: `${percent}%`,
    background:
      percent === 100 ? "#4caf50" : "#6A1BFF",
    transition: "width 0.4s ease"
  }),

  waiting: {
    marginTop: "10px",
    fontSize: "13px",
    color: "#ff9800"
  },

  completed: {
    marginTop: "10px",
    fontSize: "13px",
    color: "#2e7d32"
  },

  winner: {
    marginTop: "4px",
    fontSize: "13px",
    color: "#000"
  }
};

/* ================= COMPONENT ================= */

const LuckyDrawRow = ({ draw }) => {

  const percent =
    draw.totalSlots > 0
      ? Math.floor((draw.filledSlots / draw.totalSlots) * 100)
      : 0;

  return (
    <div
      style={styles.card}
      onMouseEnter={e =>
        (e.currentTarget.style.boxShadow =
          "0 8px 18px rgba(0,0,0,0.08)")
      }
      onMouseLeave={e =>
        (e.currentTarget.style.boxShadow =
          "0 4px 10px rgba(0,0,0,0.05)")
      }
    >

      {/* HEADER */}
      <div style={styles.headerRow}>
        <span style={styles.idText}>
          #{draw.id.slice(0, 6)}
        </span>
        <span style={styles.status(draw.status)}>
          {draw.status}
        </span>
      </div>

      {/* REWARD */}
      <div style={styles.reward}>
        🎁 Win {draw.rewardCoins} Coins
      </div>

      {/* SLOTS */}
      <div style={styles.slots}>
        Slots: {draw.filledSlots} / {draw.totalSlots} ({percent}%)
      </div>

      {/* PROGRESS */}
      <div style={styles.progressWrap}>
        <div style={styles.progressBar(percent)} />
      </div>

      {/* STATUS MESSAGE */}
      {draw.status === "OPEN" && (
        <div style={styles.waiting}>
          ⏳ Waiting for users to join…
        </div>
      )}

      {draw.status === "COMPLETED" && (
        <div style={styles.completed}>
          ✅ Draw Completed
          <div style={styles.winner}>
            🏆 Winner UID: <b>{draw.winnerUid || "—"}</b>
          </div>
        </div>
      )}

    </div>
  );
};

export default LuckyDrawRow