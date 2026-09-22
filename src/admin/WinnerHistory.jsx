import React, { useEffect, useState } from "react";
import { collection, doc, getDoc, onSnapshot, orderBy, query } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../Firebase";

const WinnerHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, "lucky_draws"), orderBy("completedAt", "desc"));

    const unsub = onSnapshot(
      q,
      async (snap) => {
        const completed = snap.docs.filter((d) => d.data().status === "COMPLETED");

        try {
          const promises = completed.map(async (docSnap) => {
            const draw = docSnap.data();
            let username = "Anonymous Player";
            let email = "—";

            if (draw.winnerUid) {
              try {
                const userSnap = await getDoc(doc(db, "users", draw.winnerUid));
                if (userSnap.exists()) {
                  const u = userSnap.data();
                  username = u.name || u.username || "Anonymous Player";
                  email = u.email || "—";
                }
              } catch (e) {
                console.error("Winner lookup error:", e);
              }
            }

            return {
              drawId: docSnap.id,
              winnerUid: draw.winnerUid || "—",
              username,
              email,
              rewardCoins: draw.rewardCoins ?? 0,
              totalSlots: draw.totalSlots ?? 0,
              completedAt: draw.completedAt?.toDate?.() || null,
              status: draw.status
            };
          });

          const results = await Promise.all(promises);
          setHistory(results);
        } catch (err) {
          console.error("Winner history load failed:", err);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error("Firestore history error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const filteredHistory = history.filter((h) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      h.username.toLowerCase().includes(q) ||
      h.winnerUid.toLowerCase().includes(q) ||
      h.drawId.toLowerCase().includes(q) ||
      h.email.toLowerCase().includes(q)
    );
  });

  const totalPrizeDistributed = history.reduce((acc, h) => acc + (Number(h.rewardCoins) || 0), 0);

  return (
    <div style={{ padding: "28px", maxWidth: "1280px", margin: "0 auto" }} className="animate-fade-in">
      
      {/* STATS STRIP */}
      <div className="stats-grid" style={{ marginBottom: "24px" }}>
        <div className="stat-card glass-card">
          <div className="stat-icon" style={{ color: "#F59E0B" }}>🏆</div>
          <div>
            <div className="stat-value">{history.length}</div>
            <div className="stat-label">Verified Winners Crowned</div>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon" style={{ color: "#10B981" }}>💰</div>
          <div>
            <div className="stat-value" style={{ color: "#FBBF24" }}>
              {totalPrizeDistributed.toLocaleString()}
            </div>
            <div className="stat-label">Total Coins Won in Lucky Draws</div>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div
        className="glass-card"
        style={{
          padding: "20px 24px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button className="btn-secondary" onClick={() => navigate("/admin/LuckyDrawAdmin")}>
            ← Lucky Draws
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#F8FAFC" }}>
              🏅 Official Winner Records &amp; Payout Audit
            </h2>
            <div style={{ fontSize: "12px", color: "#94A3B8" }}>
              Immutable log of completed lottery drawings and awarded prizes
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search winner name, UID, draw..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "260px" }}
          />
        </div>
      </div>

      {/* WINNERS TABLE */}
      <div className="table-card glass-card">
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div className="spinner"></div>
            <p style={{ color: "#94A3B8" }}>Loading Winner Audit Records...</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 20px", color: "#64748B" }}>
            No winner records found matching your query.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="user-table">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Winner Details</th>
                  <th>Prize Coins</th>
                  <th>Slots</th>
                  <th>Finalized Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => (
                  <tr key={item.drawId} className="table-row">
                    <td>
                      <code style={{ fontSize: "12px", color: "#38BDF8", background: "rgba(56, 189, 248, 0.1)", padding: "4px 8px", borderRadius: "6px" }}>
                        #{item.drawId.slice(0, 8)}
                      </code>
                    </td>
                    <td>
                      <div style={{ fontWeight: "700", color: "#F8FAFC" }}>{item.username}</div>
                      <div style={{ fontSize: "11px", color: "#94A3B8", fontFamily: "monospace" }}>
                        UID: {item.winnerUid}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-pending" style={{ fontSize: "13px" }}>
                        🪙 {Number(item.rewardCoins).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "13px", color: "#CBD5E1" }}>
                        {item.totalSlots} Slots
                      </span>
                    </td>
                    <td className="date-cell">
                      {item.completedAt
                        ? item.completedAt.toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })
                        : "—"}
                    </td>
                    <td>
                      <span className="badge badge-success">
                        ✅ CREDITED
                      </span>
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
};

export default WinnerHistory;
