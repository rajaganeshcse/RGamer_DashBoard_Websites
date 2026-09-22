import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../Firebase";

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

  return (
    <div style={{ padding: "28px", maxWidth: "1200px", margin: "0 auto" }} className="animate-fade-in">
      
      {/* HEADER BANNER */}
      <div
        className="glass-card"
        style={{
          padding: "24px 28px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            className="btn-secondary"
            onClick={() => navigate("/admin/LuckyDrawAdmin")}
            style={{ padding: "8px 14px", fontSize: "13px" }}
          >
            ← Back to Draws
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: "#F8FAFC" }}>
              👥 Lucky Draw Participants
            </h2>
            <div style={{ fontSize: "13px", color: "#94A3B8", marginTop: "4px" }}>
              Event #{drawId?.slice(0, 10)} {draw && `• Win ${draw.rewardCoins} Coins (${draw.filledSlots}/${draw.totalSlots} Slots)`}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span className="badge badge-info">{users.length} Participants Enrolled</span>
          <input
            type="text"
            className="form-input"
            placeholder="Search participant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "220px" }}
          />
        </div>
      </div>

      {/* PARTICIPANTS TABLE */}
      <div className="table-card glass-card">
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div className="spinner"></div>
            <p style={{ color: "#94A3B8" }}>Loading enrolled participants...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 20px", color: "#64748B" }}>
            No participants joined this lucky draw yet.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="user-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Email</th>
                  <th>Firestore UID</th>
                  <th>Joined Date</th>
                  <th>Event Outcome</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isWinner = winnerUid === u.uid;
                  return (
                    <tr
                      key={u.uid}
                      className="table-row"
                      style={{
                        background: isWinner ? "rgba(16, 185, 129, 0.08)" : undefined
                      }}
                    >
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <img
                            src={u.profilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`}
                            alt="avatar"
                            className="user-avatar"
                            style={{ width: "36px", height: "36px" }}
                          />
                          <span style={{ fontWeight: "700", color: "#F8FAFC" }}>{u.name}</span>
                        </div>
                      </td>
                      <td className="email-cell">{u.email}</td>
                      <td>
                        <code style={{ fontSize: "11px", color: "#94A3B8", background: "rgba(255,255,255,0.05)", padding: "3px 6px", borderRadius: "4px" }}>
                          {u.uid}
                        </code>
                      </td>
                      <td className="date-cell">
                        {u.joinedAt?.seconds
                          ? new Date(u.joinedAt.seconds * 1000).toLocaleString("en-IN")
                          : "—"}
                      </td>
                      <td>
                        {isWinner ? (
                          <span className="badge badge-success">
                            🏆 WINNER ({draw?.rewardCoins} COINS)
                          </span>
                        ) : (
                          <span className="badge badge-info">
                            🎟️ Participant
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
