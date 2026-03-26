import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  deleteDoc,
  doc
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
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px"
  },

  title: {
    fontSize: "22px",
    fontWeight: "bold"
  },

  actions: {
    display: "flex",
    gap: "12px"
  },

  btnPrimary: {
    padding: "10px 16px",
    borderRadius: "8px",
    border: "none",
    background: "#6A1BFF",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer"
  },

  btnOutline: {
    padding: "10px 16px",
    borderRadius: "8px",
    border: "1px solid #6A1BFF",
    background: "#fff",
    color: "#6A1BFF",
    fontWeight: "bold",
    cursor: "pointer"
  },

  sectionTitle: {
    marginTop: "24px",
    marginBottom: "10px",
    fontSize: "16px",
    fontWeight: "bold",
    color: "#444"
  },

  card: {
    background: "#ffffff",
    borderRadius: "14px",
    padding: "16px",
    marginBottom: "14px",
    boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    cursor: "pointer"
  },

  cardHover: {
    transform: "translateY(-2px)",
    boxShadow: "0 10px 22px rgba(0,0,0,0.12)"
  },

  rowTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },

  id: {
    fontSize: "12px",
    color: "#888"
  },

  status: (status) => ({
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "bold",
    color: "#fff",
    background:
      status === "COMPLETED" ? "#2e7d32" : "#ff9800"
  }),

  deleteBtn: {
    padding: "6px 10px",
    borderRadius: "6px",
    border: "none",
    background: "#e53935",
    color: "#fff",
    fontSize: "12px",
    fontWeight: "bold",
    cursor: "pointer"
  },

  reward: {
    marginTop: "8px",
    fontSize: "16px",
    fontWeight: "bold"
  },

  slots: {
    marginTop: "4px",
    fontSize: "13px",
    color: "#555"
  },

  progressWrap: {
    marginTop: "8px",
    height: "8px",
    background: "#e0e0e0",
    borderRadius: "6px",
    overflow: "hidden"
  },

  progress: (percent) => ({
    height: "100%",
    width: `${percent}%`,
    background:
      percent === 100 ? "#4caf50" : "#6A1BFF",
    transition: "width 0.4s ease"
  }),

  waiting: {
    marginTop: "10px",
    color: "#ff9800",
    fontSize: "13px"
  },

  completed: {
    marginTop: "10px",
    color: "#2e7d32",
    fontSize: "13px"
  }
};

/* ================= COMPONENT ================= */

const LuckyDrawAdmin = () => {

  const [openDraws, setOpenDraws] = useState([]);
  const [completedDraws, setCompletedDraws] = useState([]);
  const [hoverId, setHoverId] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  /* ===== LOAD DRAWS (LATEST FIRST) ===== */

  useEffect(() => {

    const q = query(
      collection(db, "lucky_draws"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {

      const open = [];
      const completed = [];

      snap.docs.forEach(docSnap => {
        const d = docSnap.data();

        const item = {
          id: docSnap.id,
          status: d.status,
          rewardCoins: d.rewardCoins ?? 0,
          filledSlots: d.filledSlots ?? 0,
          totalSlots: d.totalSlots ?? 0,
          winnerUid: d.winnerUid || null
        };

        if (item.status === "COMPLETED") {
          completed.push(item);
        } else {
          open.push(item);
        }
      });

      setOpenDraws(open);
      setCompletedDraws(completed);
      setLoading(false);
    });

    return () => unsub();

  }, []);

  /* ===== DELETE HANDLER ===== */

  const handleDelete = async (e, drawId) => {
    e.stopPropagation();

    const ok = window.confirm(
      "Are you sure you want to delete this Lucky Draw?\n\nThis action cannot be undone."
    );

    if (!ok) return;

    try {
      await deleteDoc(doc(db, "lucky_draws", drawId));
      alert("Lucky Draw deleted successfully");
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete draw");
    }
  };

  if (loading) {
    return <p style={{ padding: 20 }}>Loading Lucky Draws…</p>;
  }

  /* ===== DRAW CARD ===== */

  const renderCard = (draw) => {

    const percent =
      draw.totalSlots > 0
        ? Math.floor((draw.filledSlots / draw.totalSlots) * 100)
        : 0;

    return (
      <div
        key={draw.id}
        style={{
          ...styles.card,
          ...(hoverId === draw.id ? styles.cardHover : {})
        }}
        onMouseEnter={() => setHoverId(draw.id)}
        onMouseLeave={() => setHoverId(null)}
        onClick={() =>
          navigate(`/admin/lucky-draw/${draw.id}`)
        }
      >
        <div style={styles.rowTop}>
          <span style={styles.id}>#{draw.id.slice(0, 6)}</span>

          <div style={{ display: "flex", gap: "8px" }}>
            <span style={styles.status(draw.status)}>
              {draw.status}
            </span>

            <button
              style={styles.deleteBtn}
              onClick={(e) => handleDelete(e, draw.id)}
            >
              🗑 Delete
            </button>
          </div>
        </div>

        <div style={styles.reward}>
          🎁 Win {draw.rewardCoins} Coins
        </div>

        <div style={styles.slots}>
          Slots: {draw.filledSlots} / {draw.totalSlots} ({percent}%)
        </div>

        <div style={styles.progressWrap}>
          <div style={styles.progress(percent)} />
        </div>

        {draw.status === "OPEN" && (
          <div style={styles.waiting}>
            ⏳ Waiting for users to join…
          </div>
        )}

        {draw.status === "COMPLETED" && (
          <div style={styles.completed}>
            ✅ Winner: <b>{draw.winnerUid || "—"}</b>
          </div>
        )}
      </div>
    );
  };

  /* ===== UI ===== */

  return (
    <div style={styles.page}>

      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.title}>🎯 Lucky Draw Admin</div>

        <div style={styles.actions}>
          <button
            style={styles.btnPrimary}
            onClick={() => navigate("/admin/createluckydraw")}
          >
            ➕ Create Draw
          </button>

          <button
            style={styles.btnOutline}
            onClick={() => navigate("/admin/winner-history")}
          >
            🏆 Winner History
          </button>
        </div>
      </div>

      {/* OPEN */}
      <div style={styles.sectionTitle}>🔓 Open Draws</div>
      {openDraws.length === 0 && <p>No open draws</p>}
      {openDraws.map(renderCard)}

      {/* COMPLETED */}
      <div style={styles.sectionTitle}>📜 Completed Draws</div>
      {completedDraws.length === 0 && <p>No completed draws</p>}
      {completedDraws.map(renderCard)}

    </div>
  );
};

export default LuckyDrawAdmin;
