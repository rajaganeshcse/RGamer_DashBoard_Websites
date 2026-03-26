import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  getDoc
} from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
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
    marginBottom: "20px"
  },

  back: {
    marginRight: "12px",
    cursor: "pointer",
    color: "#6A1BFF",
    fontWeight: "bold"
  },

  title: {
    fontSize: "20px",
    fontWeight: "bold"
  },

  table: {
    background: "#fff",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 6px 14px rgba(0,0,0,0.08)"
  },

  headRow: {
    display: "grid",
    gridTemplateColumns: "2fr 2fr 2fr 1fr",
    padding: "12px",
    background: "#f1f3f8",
    fontWeight: "bold",
    fontSize: "13px",
    color: "#444"
  },

  row: (odd) => ({
    display: "grid",
    gridTemplateColumns: "2fr 2fr 2fr 1fr",
    padding: "12px",
    background: odd ? "#fafafa" : "#ffffff",
    alignItems: "center",
    transition: "background 0.2s ease"
  }),

  userBox: {
    display: "flex",
    flexDirection: "column"
  },

  name: {
    fontWeight: "bold",
    fontSize: "14px"
  },

  uid: {
    fontSize: "11px",
    color: "#777"
  },

  email: {
    fontSize: "13px",
    color: "#555"
  },

  joined: {
    fontSize: "13px",
    color: "#555"
  },

  winner: {
    background: "#4caf50",
    color: "#fff",
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "bold",
    textAlign: "center"
  },

  normal: {
    fontSize: "12px",
    color: "#888",
    textAlign: "center"
  },

  empty: {
    marginTop: "20px",
    color: "#777"
  }
};

/* ================= COMPONENT ================= */

const LuckyDrawUsers = () => {

  const { drawId } = useParams();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [winnerUid, setWinnerUid] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ===== LOAD WINNER UID ===== */

  useEffect(() => {
    getDoc(doc(db, "lucky_draws", drawId))
      .then(snap => {
        if (snap.exists()) {
          setWinnerUid(snap.data().winnerUid || null);
        }
      });
  }, [drawId]);

  /* ===== LOAD PARTICIPANTS ===== */

  useEffect(() => {

    const ref = collection(
      db,
      "lucky_draw_entries",
      drawId,
      "users"
    );

    const unsub = onSnapshot(ref, async (snap) => {

      const list = [];

      for (const d of snap.docs) {
        const uid = d.id;
        const entry = d.data();

        const userSnap = await getDoc(doc(db, "users", uid));
        const user = userSnap.exists()
          ? userSnap.data()
          : {};

        list.push({
          uid,
          joinedAt: entry.joinedAt,
          name: user.username || user.name || "Unknown",
          email: user.email || "—"
        });
      }

      setUsers(list);
      setLoading(false);
    });

    return () => unsub();

  }, [drawId]);

  return (
    <div style={styles.page}>

      {/* HEADER */}
      <div style={styles.header}>
        <span style={styles.back} onClick={() => navigate(-1)}>
          ← Back
        </span>
        <div style={styles.title}>
          👥 Joined Users ({users.length})
        </div>
      </div>

      {loading && <p>Loading users…</p>}

      {!loading && users.length === 0 && (
        <p style={styles.empty}>No users joined yet</p>
      )}

      {!loading && users.length > 0 && (
        <div style={styles.table}>

          {/* TABLE HEAD */}
          <div style={styles.headRow}>
            <div>User</div>
            <div>Email</div>
            <div>Joined At</div>
            <div>Status</div>
          </div>

          {/* ROWS */}
          {users.map((u, i) => (
            <div key={u.uid} style={styles.row(i % 2 === 1)}>

              <div style={styles.userBox}>
                <span style={styles.name}>{u.name}</span>
                <span style={styles.uid}>{u.uid}</span>
              </div>

              <div style={styles.email}>{u.email}</div>

              <div style={styles.joined}>
                {u.joinedAt?.seconds
                  ? new Date(
                      u.joinedAt.seconds * 1000
                    ).toLocaleString()
                  : "—"}
              </div>

              {winnerUid === u.uid ? (
                <div style={styles.winner}>🏆 WINNER</div>
              ) : (
                <div style={styles.normal}>Participant</div>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LuckyDrawUsers;
