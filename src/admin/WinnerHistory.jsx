import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../Firebase";

/* ================= STYLES ================= */

const styles = {
  page: {
    padding: "24px",
    background: "#f4f6fb",
    minHeight: "100vh"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px"
  },

  title: {
    fontSize: "22px",
    fontWeight: "bold"
  },

  backBtn: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "1px solid #6A1BFF",
    background: "#fff",
    color: "#6A1BFF",
    fontWeight: "bold",
    cursor: "pointer"
  },

  table: {
    background: "#fff",
    borderRadius: "14px",
    overflow: "hidden",
    boxShadow: "0 6px 16px rgba(0,0,0,0.08)"
  },

  headRow: {
    display: "grid",
    gridTemplateColumns: "2fr 2fr 1fr 2fr 1fr",
    padding: "12px",
    background: "#f1f3f8",
    fontWeight: "bold",
    fontSize: "13px",
    color: "#444"
  },

  row: (odd) => ({
    display: "grid",
    gridTemplateColumns: "2fr 2fr 1fr 2fr 1fr",
    padding: "12px",
    background: odd ? "#fafafa" : "#ffffff",
    alignItems: "center",
    fontSize: "14px"
  }),

  drawId: {
    fontSize: "12px",
    color: "#666"
  },

  username: {
    fontWeight: "bold"
  },

  reward: {
    fontWeight: "bold",
    color: "#6A1BFF"
  },

  time: {
    fontSize: "13px",
    color: "#555"
  },

  badge: {
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "bold",
    background: "#2e7d32",
    color: "#fff",
    textAlign: "center"
  },

  empty: {
    marginTop: "20px",
    color: "#777"
  }
};

/* ================= COMPONENT ================= */

const WinnerHistory = () => {

  const [history, setHistory] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {

    const q = query(
      collection(db, "lucky_draws"),
      orderBy("completedAt", "desc")
    );

    const unsub = onSnapshot(q, async (snap) => {

      const completed = snap.docs.filter(
        d => d.data().status === "COMPLETED"
      );

      const results = [];

      for (const docSnap of completed) {

        const draw = docSnap.data();
        let username = "—";

        // 🔥 FETCH USERNAME FROM USERS COLLECTION
        if (draw.winnerUid) {
          try {
            const userSnap = await getDoc(
              doc(db, "users", draw.winnerUid)
            );
            if (userSnap.exists()) {
              username =
                userSnap.data().username ||
                userSnap.data().name ||
                "—";
            }
          } catch (e) {
            console.error("User fetch failed:", e);
          }
        }

        results.push({
          drawId: docSnap.id,
          username,
          rewardCoins: draw.rewardCoins ?? 0,
          completedAt:
            draw.completedAt?.toDate?.() || null,
          status: draw.status
        });
      }

      setHistory(results);
    });

    return () => unsub();

  }, []);

  return (
    <div style={styles.page}>

      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.title}>🏆 Winner History</div>
        <button
          style={styles.backBtn}
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
      </div>

      {/* EMPTY */}
      {history.length === 0 && (
        <p style={styles.empty}>
          No completed draws found
        </p>
      )}

      {/* TABLE */}
      {history.length > 0 && (
        <div style={styles.table}>

          {/* TABLE HEAD */}
          <div style={styles.headRow}>
            <div>Draw ID</div>
            <div>Username</div>
            <div>Reward</div>
            <div>Completed At</div>
            <div>Status</div>
          </div>

          {/* ROWS */}
          {history.map((item, i) => (
            <div key={i} style={styles.row(i % 2 === 1)}>

              <div style={styles.drawId}>
                #{item.drawId.slice(0, 6)}
              </div>

              <div style={styles.username}>
                {item.username}
              </div>

              <div style={styles.reward}>
                {item.rewardCoins} 🪙
              </div>

              <div style={styles.time}>
                {item.completedAt
                  ? item.completedAt.toLocaleString()
                  : "—"}
              </div>

              <div style={styles.badge}>
                COMPLETED
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WinnerHistory;
