import { collection, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from '../Firebase';
import { useEffect, useState } from "react";

export default function TournamentList() {

  const [list, setList] = useState([]);
  const [editRoom, setEditRoom] = useState({});

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "tournaments"),
      (snap) => {
        setList(
          snap.docs.map(d => ({
            id: d.id,
            ...d.data()
          }))
        );
      }
    );
    return () => unsub();
  }, []);

  /* ================= UPDATE STATUS ================= */

  const updateStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, "tournaments", id), { status });
    } catch (e) {
      alert(e.message);
    }
  };

  /* ================= UPDATE ROOM DETAILS ================= */

  const saveRoomDetails = async (id) => {
    try {
      const data = editRoom[id];
      await updateDoc(doc(db, "tournaments", id), {
        roomId: data.roomId || null,
        roomPassword: data.roomPassword || null
      });
      alert("✅ Room details updated");
    } catch (e) {
      alert(e.message);
    }
  };

  const badgeStyle = (status) => ({
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
    color: "#fff",
    background:
      status === "scheduled" ? "#6c757d" :
      status === "ongoing" ? "#28a745" :
      status === "processing" ? "#ffc107" :
      status === "completed" ? "#dc3545" :
      "#999"
  });

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Tournaments</h2>

      {list.length === 0 && (
        <p style={styles.empty}>No tournaments found</p>
      )}

      {list.map(t => (
        <div key={t.id} style={styles.card}>

          {/* HEADER */}
          <div style={styles.cardHeader}>
            <div>
              <h3 style={styles.game}>
                {(t.game || "unknown").toUpperCase()}
              </h3>
              <span style={badgeStyle(t.status)}>
                {t.status || "unknown"}
              </span>
            </div>

            {/* STATUS BUTTONS */}
            <div style={styles.actions}>
              <StatusBtn color="#6c757d" onClick={() => updateStatus(t.id, "scheduled")}>Scheduled</StatusBtn>
              <StatusBtn color="#28a745" onClick={() => updateStatus(t.id, "ongoing")}>Ongoing</StatusBtn>
              <StatusBtn color="#ffc107" text="#000" onClick={() => updateStatus(t.id, "processing")}>Processing</StatusBtn>
              <StatusBtn color="#dc3545" onClick={() => updateStatus(t.id, "completed")}>Completed</StatusBtn>
            </div>
          </div>

          {/* DETAILS */}
          <div style={styles.details}>
            <Detail label="Prize" value={`🪙 ${t.prize ?? 0}`} />
            <Detail label="Slots" value={`${t.joinedSlots ?? 0}/${t.totalSlots ?? 0}`} />
            <Detail label="Entry" value={t.freeAdEntry ? "Watch Ad" : `${t.entryTickets ?? 0} Tickets`} />
            <Detail
              label="Start Time"
              value={
                t.startTimeMillis
                  ? new Date(t.startTimeMillis).toLocaleString()
                  : "N/A"
              }
            />
          </div>

          {/* ROOM EDIT */}
          <div style={styles.roomBox}>
            <h4 style={styles.roomTitle}>Room Details</h4>

            <div style={styles.roomGrid}>
              <input
                type="text"
                placeholder="Room ID"
                defaultValue={t.roomId || ""}
                onChange={e =>
                  setEditRoom(prev => ({
                    ...prev,
                    [t.id]: {
                      ...prev[t.id],
                      roomId: e.target.value
                    }
                  }))
                }
              />

              <input
                type="text"
                placeholder="Room Password"
                defaultValue={t.roomPassword || ""}
                onChange={e =>
                  setEditRoom(prev => ({
                    ...prev,
                    [t.id]: {
                      ...prev[t.id],
                      roomPassword: e.target.value
                    }
                  }))
                }
              />
            </div>

            <button
              style={styles.saveBtn}
              onClick={() => saveRoomDetails(t.id)}
            >
              Save Room Details
            </button>
          </div>

        </div>
      ))}
    </div>
  );
}

/* ================= SMALL COMPONENTS ================= */

function Detail({ label, value }) {
  return (
    <div style={styles.detail}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={styles.detailValue}>{value}</span>
    </div>
  );
}

function StatusBtn({ children, onClick, color, text = "#fff" }) {
  return (
    <button
      onClick={onClick}
      style={{ ...styles.btn, background: color, color: text }}
    >
      {children}
    </button>
  );
}

/* ================= STYLES ================= */

const styles = {
  container: { display: "grid", gap: "20px" },
  heading: { fontSize: "22px", fontWeight: 600 },
  empty: { color: "#777", fontStyle: "italic" },

  card: {
    background: "#fff",
    borderRadius: "14px",
    padding: "20px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
    borderLeft: "6px solid #5b5bff"
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "15px"
  },
  game: { margin: 0, fontSize: "18px", fontWeight: 600 },
  actions: { display: "flex", gap: "8px", flexWrap: "wrap" },

  btn: {
    padding: "6px 12px",
    border: "none",
    borderRadius: "6px",
    fontSize: "12px",
    cursor: "pointer"
  },

  details: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "12px",
    marginBottom: "15px"
  },

  detail: { background: "#f4f6fb", padding: "10px", borderRadius: "8px" },
  detailLabel: { fontSize: "12px", color: "#777" },
  detailValue: { fontSize: "14px", fontWeight: 600 },

  roomBox: {
    background: "#f9fafc",
    padding: "15px",
    borderRadius: "10px"
  },
  roomTitle: { marginBottom: "10px", fontSize: "14px" },
  roomGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginBottom: "10px"
  },
  saveBtn: {
    padding: "8px",
    width: "100%",
    background: "#5b5bff",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer"
  }
};
