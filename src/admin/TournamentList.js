import React, { useEffect, useState } from "react";
import { collection, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "../Firebase";

export default function TournamentList() {
  const [list, setList] = useState([]);
  const [editRoom, setEditRoom] = useState({});
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [savingId, setSavingId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "tournaments"), (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));
      data.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
      setList(data);
    });
    return () => unsub();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, "tournaments", id), { status });
      showToast(`Tournament status updated to ${status.toUpperCase()}`);
    } catch (e) {
      showToast("Error updating status: " + e.message, "error");
    }
  };

  const saveRoomDetails = async (id) => {
    try {
      setSavingId(id);
      const data = editRoom[id] || {};
      const updates = {};
      if (data.roomId !== undefined) updates.roomId = data.roomId || null;
      if (data.roomPassword !== undefined) updates.roomPassword = data.roomPassword || null;

      await updateDoc(doc(db, "tournaments", id), updates);
      showToast("✅ Room credentials updated successfully!");
    } catch (e) {
      showToast("Failed to save room details: " + e.message, "error");
    } finally {
      setSavingId(null);
    }
  };

  const filteredList = list.filter((t) => {
    if (statusFilter === "ALL") return true;
    return (t.status || "scheduled").toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* FLOATING TOAST */}
      {toast && (
        <div className={`floating-toast ${toast.type === "error" ? "toast-error" : "toast-success"}`}>
          {toast.message}
        </div>
      )}

      {/* FILTER TABS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", background: "rgba(15, 23, 42, 0.8)", padding: "4px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
          {["ALL", "SCHEDULED", "ONGOING", "PROCESSING", "COMPLETED"].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              style={{
                background: statusFilter === tab ? "#6366F1" : "transparent",
                color: statusFilter === tab ? "#FFFFFF" : "#94A3B8",
                border: "none",
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <span style={{ fontSize: "13px", color: "#94A3B8" }}>
          Showing <strong>{filteredList.length}</strong> matches
        </span>
      </div>

      {filteredList.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
          No tournaments matching "{statusFilter}" status.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "20px" }}>
          {filteredList.map((t) => {
            const joined = Number(t.joinedSlots) || 0;
            const total = Number(t.totalSlots) || 1;
            const percent = Math.min(100, Math.floor((joined / total) * 100));
            const status = (t.status || "scheduled").toLowerCase();

            return (
              <div
                key={t.id}
                className="glass-card"
                style={{
                  padding: "22px",
                  borderTop:
                    status === "ongoing"
                      ? "3px solid #10B981"
                      : status === "completed"
                      ? "3px solid #EF4444"
                      : status === "processing"
                      ? "3px solid #F59E0B"
                      : "3px solid #6366F1"
                }}
              >
                {/* MATCH HEADER */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#F8FAFC" }}>
                      🎮 {(t.game || "FREE FIRE").toUpperCase()}
                    </h3>
                    <div style={{ fontSize: "11px", color: "#94A3B8", fontFamily: "monospace" }}>
                      ID: #{t.id.slice(0, 8)}
                    </div>
                  </div>

                  <span
                    className={`badge ${
                      status === "ongoing"
                        ? "badge-success"
                        : status === "completed"
                        ? "badge-danger"
                        : status === "processing"
                        ? "badge-pending"
                        : "badge-info"
                    }`}
                  >
                    {status.toUpperCase()}
                  </span>
                </div>

                {/* DETAILS METRICS GRID */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                  <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", fontWeight: "700" }}>Prize Pool</div>
                    <div style={{ fontSize: "15px", fontWeight: "700", color: "#FBBF24", marginTop: "2px" }}>
                      🪙 {t.coin ?? t.prize ?? 0} Coins
                    </div>
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", fontWeight: "700" }}>Entry Type</div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#60A5FA", marginTop: "2px" }}>
                      {t.freeAdEntry ? "📺 Watch Ad" : `🎟️ ${t.entryTickets ?? 0} Tickets`}
                    </div>
                  </div>
                </div>

                {/* SLOTS OCCUPANCY PROGRESS */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#CBD5E1", marginBottom: "6px" }}>
                    <span>Slots Filled: <strong>{joined}</strong> / {total}</span>
                    <span style={{ color: "#818CF8", fontWeight: "700" }}>{percent}%</span>
                  </div>
                  <div style={{ height: "6px", width: "100%", background: "rgba(255,255,255,0.06)", borderRadius: "6px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${percent}%`,
                        background: "linear-gradient(90deg, #6366F1, #06B6D4)",
                        transition: "width 0.4s ease"
                      }}
                    />
                  </div>
                </div>

                {/* START TIME */}
                {t.startTimeMillis && (
                  <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>⏰</span> Match Time: {new Date(t.startTimeMillis).toLocaleString("en-IN")}
                  </div>
                )}

                {/* ROOM CREDENTIALS EDIT */}
                <div style={{ background: "rgba(15, 23, 42, 0.8)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "16px" }}>
                  <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", fontWeight: "700", marginBottom: "8px" }}>
                    🔑 Room Credentials (Sent to Players):
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Room ID"
                      defaultValue={t.roomId || ""}
                      onChange={(e) =>
                        setEditRoom((prev) => ({
                          ...prev,
                          [t.id]: { ...prev[t.id], roomId: e.target.value }
                        }))
                      }
                      style={{ fontSize: "12px", padding: "8px 10px" }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Password"
                      defaultValue={t.roomPassword || ""}
                      onChange={(e) =>
                        setEditRoom((prev) => ({
                          ...prev,
                          [t.id]: { ...prev[t.id], roomPassword: e.target.value }
                        }))
                      }
                      style={{ fontSize: "12px", padding: "8px 10px" }}
                    />
                  </div>
                  <button
                    className="btn-secondary"
                    style={{ width: "100%", justifyContent: "center", fontSize: "12px", padding: "6px" }}
                    onClick={() => saveRoomDetails(t.id)}
                    disabled={savingId === t.id}
                  >
                    {savingId === t.id ? "Saving..." : "Save Room Credentials"}
                  </button>
                </div>

                {/* STATUS ACTIONS BAR */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <button
                    className="btn-action-sm"
                    style={{ background: "rgba(255,255,255,0.05)", color: "#CBD5E1" }}
                    onClick={() => updateStatus(t.id, "scheduled")}
                  >
                    Scheduled
                  </button>
                  <button
                    className="btn-action-sm btn-unban"
                    onClick={() => updateStatus(t.id, "ongoing")}
                  >
                    Ongoing
                  </button>
                  <button
                    className="btn-action-sm btn-adjust"
                    onClick={() => updateStatus(t.id, "processing")}
                  >
                    Processing
                  </button>
                  <button
                    className="btn-action-sm btn-ban"
                    onClick={() => updateStatus(t.id, "completed")}
                  >
                    Completed
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
