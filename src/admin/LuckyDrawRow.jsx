import React from "react";
import "./LuckyDraw.css";

const LuckyDrawRow = ({ draw }) => {
  const percent =
    draw.totalSlots > 0
      ? Math.floor((draw.filledSlots / draw.totalSlots) * 100)
      : 0;

  const isCompleted = draw.status === "COMPLETED";

  return (
    <div
      className="luckydraw-event-card"
      style={{
        padding: "18px",
        marginBottom: "14px",
        borderTop: isCompleted ? "3px solid #00F5A0" : "3px solid #818CF8"
      }}
    >
      {/* HEADER */}
      <div className="luckydraw-card-topbar" style={{ marginBottom: "10px" }}>
        <span className="luckydraw-card-id">
          #{draw.id.slice(0, 8)}
        </span>
        <span className={`luckydraw-status-badge ${isCompleted ? "status-badge-open" : "status-badge-closing"}`}>
          {draw.status}
        </span>
      </div>

      {/* REWARD */}
      <div className="luckydraw-card-reward-title" style={{ fontSize: "18px", marginBottom: "8px" }}>
        <span>🎁</span> Win {Number(draw.rewardCoins || 0).toLocaleString()} Coins
      </div>

      {/* SLOTS */}
      <div className="luckydraw-progress-meta" style={{ marginBottom: "6px" }}>
        <span className="luckydraw-progress-label">
          Enrolled: <strong>{draw.filledSlots}</strong> / {draw.totalSlots}
        </span>
        <span className="luckydraw-progress-pct">{percent}%</span>
      </div>

      {/* PROGRESS BAR */}
      <div className="luckydraw-progress-track">
        <div
          className="luckydraw-progress-fill"
          style={{
            width: `${percent}%`,
            background: isCompleted
              ? "linear-gradient(90deg, #10B981, #00F5A0)"
              : "linear-gradient(90deg, #6366F1, #C084FC)"
          }}
        />
      </div>

      {/* STATUS FOOTER */}
      {draw.status === "OPEN" && (
        <div style={{ marginTop: "12px", fontSize: "12px", color: "#FFB800", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
          <span>⏳</span> Open for participant entries…
        </div>
      )}

      {isCompleted && (
        <div style={{ marginTop: "12px", fontSize: "12px", color: "#00F5A0", fontWeight: "700" }}>
          <div>✅ Event Finalized &amp; Reward Credited</div>
          <div style={{ color: "#CBD5E1", marginTop: "4px", fontSize: "11px", fontFamily: "monospace" }}>
            🏆 Winner: {draw.winnerUid || "—"}
          </div>
        </div>
      )}
    </div>
  );
};

export default LuckyDrawRow;