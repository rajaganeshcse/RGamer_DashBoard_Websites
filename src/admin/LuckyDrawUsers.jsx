import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../Firebase";
import "./LuckyDraw.css";

const LuckyDrawUsers = () => {
  const { drawId } = useParams();
  const navigate = useNavigate();

  const [draw, setDraw] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [winnerUid, setWinnerUid] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Load Draw Details
  useEffect(() => {
    getDoc(doc(db, "lucky_draws", drawId)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setDraw({ id: snap.id, ...data });
        setWinnerUid(data.winnerUid || null);
      }
    });
  }, [drawId]);

  // 2. Load Participants (Parallel fetch)
  useEffect(() => {
    const ref = collection(db, "lucky_draw_entries", drawId, "users");

    const unsub = onSnapshot(ref, async (snap) => {
      try {
        const promises = snap.docs.map(async (d) => {
          const uid = d.id;
          const entry = d.data();
          let name = "Anonymous Player";
          let email = "—";
          let profilePic = null;

          try {
            const userSnap = await getDoc(doc(db, "users", uid));
            if (userSnap.exists()) {
              const uData = userSnap.data();
              name = uData.name || uData.username || "Anonymous Player";
              email = uData.email || "—";
              profilePic = uData.profile_pic || uData.profile_image || null;
            }
          } catch (e) {
            console.error("User fetch error:", e);
          }

          return {
            uid,
            joinedAt: entry.joinedAt,
            name,
            email,
            profilePic
          };
        });

        const list = await Promise.all(promises);
        setUsers(list);
      } catch (err) {
        console.error("Participants load error:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [drawId]);

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.uid.toLowerCase().includes(q)
    );
  });

  const totalSlots = draw?.participationLimit || draw?.totalSlots || 10;
  const currentSlots = users.length;
  const fillPct = totalSlots > 0 ? Math.min(100, Math.floor((currentSlots / totalSlots) * 100)) : 0;

  return (
    <div className="luckydraw-container animate-fade-in">
      
      {/* HEADER BANNER */}
      <div className="luckydraw-header">
        <div className="luckydraw-header-left">
          <div className="luckydraw-badge-row">
            <span className="luckydraw-engine-pill">
              <span>👥</span> PARTICIPANT ROSTER
            </span>
            <span className="luckydraw-id-tag">
              #{drawId?.slice(0, 10)}
            </span>
            {draw?.status && (
              <span className={`luckydraw-status-badge ${draw.status === "COMPLETED" ? "status-badge-open" : "status-badge-closing"}`}>
                {draw.status}
              </span>
            )}
          </div>
          <h1 className="luckydraw-main-title">
            <span>🎟️</span> Enrolled Entrants for Lucky Draw
          </h1>
          <p className="luckydraw-header-subtitle">
            Auditing tickets and participant roster for Draw #{drawId?.slice(0, 8)} • Prize Pool: {Number(draw?.rewardCoins || 0).toLocaleString()} Coins
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

      {/* QUICK EVENT STATS STRIP */}
      <div className="luckydraw-kpi-grid" style={{ marginBottom: "24px" }}>
        <div className="luckydraw-kpi-card kpi-variant-violet">
          <div className="luckydraw-kpi-icon">🎁</div>
          <div className="luckydraw-kpi-content">
            <div className="luckydraw-kpi-value" style={{ color: "#FFB800" }}>
              {Number(draw?.rewardCoins || 0).toLocaleString()}
            </div>
            <div className="luckydraw-kpi-label">Reward Prize</div>
            <div className="luckydraw-kpi-subtext">Coins awarded to winner</div>
          </div>
        </div>

        <div className="luckydraw-kpi-card kpi-variant-cyan">
          <div className="luckydraw-kpi-icon">👥</div>
          <div className="luckydraw-kpi-content">
            <div className="luckydraw-kpi-value">
              {currentSlots} / {totalSlots}
            </div>
            <div className="luckydraw-kpi-label">Filled Capacity</div>
            <div className="luckydraw-kpi-subtext">{fillPct}% slots occupied</div>
          </div>
        </div>

        <div className="luckydraw-kpi-card kpi-variant-gold">
          <div className="luckydraw-kpi-icon">🎟️</div>
          <div className="luckydraw-kpi-content">
            <div className="luckydraw-kpi-value">
              {draw?.ticketCost || 1}
            </div>
            <div className="luckydraw-kpi-label">Entry Cost</div>
            <div className="luckydraw-kpi-subtext">Tickets per participant</div>
          </div>
        </div>

        <div className="luckydraw-kpi-card kpi-variant-mint">
          <div className="luckydraw-kpi-icon">🏆</div>
          <div className="luckydraw-kpi-content">
            <div className="luckydraw-kpi-value" style={{ fontSize: "16px", wordBreak: "break-all" }}>
              {winnerUid ? `#${winnerUid.slice(0, 8)}` : "Pending Draw"}
            </div>
            <div className="luckydraw-kpi-label">Event Outcome</div>
            <div className="luckydraw-kpi-subtext">
              {winnerUid ? "Winner selected & rewarded" : "Draw in active progress"}
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
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
            Enrolled Players:
          </span>
          <span className="luckydraw-count-chip">
            {filteredUsers.length} of {users.length}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <input
            type="text"
            className="luckydraw-input"
            placeholder="Search participant name, email, UID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "280px", padding: "10px 14px", fontSize: "13px" }}
          />
        </div>
      </div>

      {/* PARTICIPANTS TABLE */}
      <div className="luckydraw-history-box">
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div className="spinner"></div>
            <p style={{ color: "#FFFFFF", fontWeight: "800", marginTop: "14px" }}>
              Fetching enrolled participant profiles...
            </p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 20px", color: "#FFFFFF", fontWeight: "700" }}>
            {search ? "No participants match your search query." : "No participants have joined this lucky draw yet."}
          </div>
        ) : (
          <div className="luckydraw-table-wrap">
            <table className="luckydraw-table">
              <thead>
                <tr>
                  <th>Player Profile</th>
                  <th>Email Address</th>
                  <th>Player UID</th>
                  <th>Joined Date</th>
                  <th>Lottery Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isWinner = winnerUid === u.uid;
                  return (
                    <tr
                      key={u.uid}
                      style={{
                        background: isWinner ? "rgba(16, 185, 129, 0.12)" : undefined
                      }}
                    >
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <img
                            src={u.profilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`}
                            alt="avatar"
                            style={{
                              width: "38px",
                              height: "38px",
                              borderRadius: "10px",
                              border: isWinner ? "2px solid #00F5A0" : "1.5px solid rgba(255, 255, 255, 0.12)",
                              background: "#0F172A"
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: "800", color: "#FFFFFF", fontSize: "14px" }}>
                              {u.name}
                            </div>
                            {isWinner && (
                              <div style={{ fontSize: "11px", color: "#00F5A0", fontWeight: "800" }}>
                                👑 OFFICIAL WINNER
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ color: "#E2E8F0", fontSize: "13px", fontWeight: "600" }}>
                          {u.email}
                        </span>
                      </td>
                      <td>
                        <span className="luckydraw-id-tag">
                          {u.uid}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: "#CBD5E1", fontSize: "12.5px", fontWeight: "600" }}>
                          {u.joinedAt?.seconds
                            ? new Date(u.joinedAt.seconds * 1000).toLocaleString("en-IN")
                            : "—"}
                        </span>
                      </td>
                      <td>
                        {isWinner ? (
                          <span className="luckydraw-status-badge status-badge-open" style={{ background: "rgba(16, 185, 129, 0.25)", color: "#00F5A0", borderColor: "#00F5A0" }}>
                            🏆 WINNER ({draw?.rewardCoins} COINS)
                          </span>
                        ) : (
                          <span className="luckydraw-preset-tag" style={{ color: "#00F2FE", borderColor: "rgba(6, 182, 212, 0.4)" }}>
                            🎟️ Enrolled Ticket
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default LuckyDrawUsers;
