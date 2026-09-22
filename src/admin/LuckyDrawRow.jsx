import React from "react";

const LuckyDrawRow = ({ draw }) => {
  const percent =
    draw.totalSlots > 0
      ? Math.floor((draw.filledSlots / draw.totalSlots) * 100)
      : 0;

  const isCompleted = draw.status === "COMPLETED";

  return (
    <div
      className="glass-card"
      style={{
        padding: "18px",
        marginBottom: "14px",
        borderTop: isCompleted ? "3px solid #10B981" : "3px solid #8B5CF6",
        background: "rgba(18, 24, 39, 0.85)"
      }}
    >
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontSize: "12px", color: "#94A3B8", fontFamily: "monospace" }}>
          #{draw.id.slice(0, 8)}
        </span>
        <span className={`badge ${isCompleted ? "badge-success" : "badge-info"}`}>
          {draw.status}
        </span>
      </div>

      {/* REWARD */}
      <div style={{ fontSize: "17px", fontWeight: "700", color: "#F8FAFC", display: "flex", alignItems: "center", gap: "6px" }}>
        <span>🎁</span> Win {Number(draw.rewardCoins || 0).toLocaleString()} Coins
      </div>

      {/* SLOTS */}
      <div style={{ fontSize: "13px", color: "#94A3B8", marginTop: "6px", display: "flex", justifyContent: "space-between" }}>
        <span>Enrolled: <strong>{draw.filledSlots}</strong> / {draw.totalSlots}</span>
        <span style={{ color: "#38BDF8", fontWeight: "700" }}>{percent}%</span>
      </div>

      {/* PROGRESS BAR */}
      <div style={{ height: "6px", width: "100%", background: "rgba(255, 255, 255, 0.08)", borderRadius: "6px", overflow: "hidden", marginTop: "8px" }}>
        <div
          style={{
            height: "100%",
            width: `${percent}%`,
            background: isCompleted ? "linear-gradient(90deg, #10B981, #34D399)" : "linear-gradient(90deg, #6366F1, #8B5CF6)",
            transition: "width 0.4s ease"
          }}
        />
      </div>

      {/* STATUS FOOTER */}
      {draw.status === "OPEN" && (
        <div style={{ marginTop: "12px", fontSize: "12px", color: "#FBBF24", display: "flex", alignItems: "center", gap: "6px" }}>
          <span>⏳</span> Open for participant entries…
        </div>
      )}

      {isCompleted && (
        <div style={{ marginTop: "12px", fontSize: "12px", color: "#34D399" }}>
          <div>✅ Event Finalized &amp; Reward Credited</div>
          <div style={{ color: "#F8FAFC", marginTop: "4px", fontSize: "11px", fontFamily: "monospace" }}>
            🏆 Winner: {draw.winnerUid || "—"}
          </div>
        </div>
      )}
    </div>
  );
};

export default LuckyDrawRow;