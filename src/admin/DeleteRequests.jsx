import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../Firebase";

export default function DeleteRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, "account_delete_requests"),
      orderBy("requestedAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRequests(list);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const handleCancel = async (req) => {
    setActionLoading(req.id);
    try {
      await updateDoc(doc(db, "account_delete_requests", req.id), {
        status: "Cancelled",
        cancelledAt: serverTimestamp(),
        cancelledBy: "admin",
      });

      if (req.userId) {
        await updateDoc(doc(db, "users", req.userId), {
          account: "Active",
        });
      }

      setConfirmModal(null);
    } catch (e) {
      console.error("Cancel failed:", e);
      alert("Error cancelling request: " + e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (req) => {
    setActionLoading(req.id);
    try {
      await updateDoc(doc(db, "account_delete_requests", req.id), {
        status: "Deleted",
        deletedAt: serverTimestamp(),
        deletedBy: "admin",
      });

      if (req.userId) {
        await updateDoc(doc(db, "users", req.userId), {
          account: "Deleted",
        });
      }

      setConfirmModal(null);
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Error deleting account: " + e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const statusMap = {
    pending: "pending",
    deleted: "deleted",
    cancelled: "cancelled",
  };

  const filtered = requests.filter((r) => {
    const s = (r.status || "").toLowerCase();
    const statusMatch = s === (statusMap[activeTab] || "pending");
    const term = search.toLowerCase();
    const searchMatch =
      !term ||
      (r.userId || "").toLowerCase().includes(term) ||
      (r.email || "").toLowerCase().includes(term) ||
      (r.name || "").toLowerCase().includes(term);
    return statusMatch && searchMatch;
  });

  const countOf = (status) =>
    requests.filter((r) => (r.status || "").toLowerCase() === status).length;

  const formatDate = (val) => {
    if (!val) return "—";
    const d = val?.toDate ? val.toDate() : new Date(val);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const daysRemaining = (val) => {
    if (!val) return null;
    const submitted = val?.toDate ? val.toDate() : new Date(val);
    const deleteOn = new Date(submitted.getTime() + 7 * 24 * 60 * 60 * 1000);
    return Math.ceil((deleteOn - new Date()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }} className="animate-fade-in">
      
      {/* HEADER */}
      <div className="glass-card" style={{ padding: "20px 24px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button className="btn-secondary" onClick={() => navigate(-1)} style={{ padding: "8px 14px" }}>
            ← Back
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#F8FAFC" }}>
              🗑️ Account Deletion Requests
            </h2>
            <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#94A3B8" }}>
              Approve, cancel, or audit user account deletion requests.
            </p>
          </div>
        </div>

        {/* SEARCH */}
        <input
          className="form-input"
          placeholder="Search by User ID, email, or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "300px" }}
        />
      </div>

      {/* STAT CARDS */}
      <div className="stats-grid" style={{ marginBottom: "24px" }}>
        <div className="stat-card glass-card" style={{ borderTop: "3px solid #F59E0B" }}>
          <div className="stat-icon" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#F59E0B" }}>⏳</div>
          <div>
            <div className="stat-value" style={{ color: "#F59E0B" }}>{countOf("pending")}</div>
            <div className="stat-label">Pending Reviews</div>
          </div>
        </div>
        <div className="stat-card glass-card" style={{ borderTop: "3px solid #EF4444" }}>
          <div className="stat-icon" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#EF4444" }}>🗑️</div>
          <div>
            <div className="stat-value" style={{ color: "#EF4444" }}>{countOf("deleted")}</div>
            <div className="stat-label">Deleted Accounts</div>
          </div>
        </div>
        <div className="stat-card glass-card" style={{ borderTop: "3px solid #10B981" }}>
          <div className="stat-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10B981" }}>↩️</div>
          <div>
            <div className="stat-value" style={{ color: "#10B981" }}>{countOf("cancelled")}</div>
            <div className="stat-label">Restored Active Accounts</div>
          </div>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        {[
          { key: "pending", label: `⏳ Pending (${countOf("pending")})`, color: "#F59E0B" },
          { key: "deleted", label: `🗑️ Deleted (${countOf("deleted")})`, color: "#EF4444" },
          { key: "cancelled", label: `↩️ Restored (${countOf("cancelled")})`, color: "#10B981" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: activeTab === tab.key ? tab.color : "rgba(255, 255, 255, 0.05)",
              color: activeTab === tab.key ? "#FFFFFF" : "#94A3B8",
              border: `1px solid ${activeTab === tab.key ? tab.color : "rgba(255, 255, 255, 0.1)"}`,
              padding: "8px 16px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* REQUEST LIST */}
      {loading ? (
        <div className="glass-card" style={{ padding: "50px", textAlign: "center" }}>
          <div className="spinner"></div>
          <p style={{ color: "#94A3B8" }}>Loading Deletion Requests...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card" style={{ padding: "50px", textAlign: "center", color: "#94A3B8" }}>
          No {activeTab} requests found.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "20px" }}>
          {filtered.map((req) => {
            const status = (req.status || "").toLowerCase();
            const isPending = status === "pending";
            const isDeleted = status === "deleted";
            const isCancelled = status === "cancelled";
            const days = isPending ? daysRemaining(req.requestedAt) : null;
            const busy = actionLoading === req.id;

            return (
              <div key={req.id} className="glass-card" style={{ padding: "22px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #6366F1, #4F46E5)",
                          color: "#FFF",
                          fontSize: "18px",
                          fontWeight: "700",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        {(req.name || req.email || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#F8FAFC" }}>
                          {req.name || "Unknown User"}
                        </h4>
                        <div style={{ fontSize: "12px", color: "#94A3B8" }}>{req.email || "No Email"}</div>
                      </div>
                    </div>

                    <span className={isDeleted ? "badge badge-danger" : isCancelled ? "badge badge-success" : "badge badge-pending"}>
                      {isDeleted ? "DELETED" : isCancelled ? "ACTIVE" : "PENDING"}
                    </span>
                  </div>

                  {/* INFO CONTAINER */}
                  <div style={{ background: "rgba(15, 23, 42, 0.8)", padding: "12px 16px", borderRadius: "10px", marginBottom: "14px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "12px" }}>
                      <span style={{ color: "#64748B", fontWeight: "600" }}>USER ID:</span>
                      <code style={{ color: "#38BDF8" }}>{req.userId || req.id}</code>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                      <span style={{ color: "#64748B", fontWeight: "600" }}>REQUESTED:</span>
                      <span style={{ color: "#CBD5E1" }}>{formatDate(req.requestedAt)}</span>
                    </div>
                  </div>

                  {/* COUNTDOWN FOR PENDING */}
                  {isPending && days !== null && (
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "600",
                        marginBottom: "14px",
                        background: days <= 1 ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                        color: days <= 1 ? "#F87171" : "#FBBF24",
                        border: `1px solid ${days <= 1 ? "rgba(239, 68, 68, 0.3)" : "rgba(245, 158, 11, 0.3)"}`
                      }}
                    >
                      {days <= 0
                        ? "⚠️ Overdue — 7-day review period expired"
                        : `⏱️ ${days} day${days !== 1 ? "s" : ""} remaining in 7-day review period`}
                    </div>
                  )}
                </div>

                {/* ACTION BUTTONS */}
                {isPending && (
                  <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                    <button
                      className="btn-secondary"
                      disabled={busy}
                      onClick={() => setConfirmModal({ type: "cancel", req })}
                      style={{ flex: 1, color: "#34D399", borderColor: "rgba(16, 185, 129, 0.3)" }}
                    >
                      ↩️ Restore Account
                    </button>

                    <button
                      className="btn-secondary"
                      disabled={busy}
                      onClick={() => setConfirmModal({ type: "delete", req })}
                      style={{ flex: 1, color: "#F87171", borderColor: "rgba(239, 68, 68, 0.3)" }}
                    >
                      🗑️ Force Delete
                    </button>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* CONFIRM MODAL */}
      {confirmModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div className="glass-card" style={{ padding: "28px", width: "100%", maxWidth: "420px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>
              {confirmModal.type === "delete" ? "🗑️" : "↩️"}
            </div>
            <h3 style={{ margin: "0 0 8px 0", color: "#F8FAFC", fontSize: "18px" }}>
              {confirmModal.type === "delete" ? "Confirm Account Deletion" : "Restore User Account"}
            </h3>
            <p style={{ fontSize: "13px", color: "#94A3B8", margin: "0 0 16px 0" }}>
              Target User: <strong style={{ color: "#F8FAFC" }}>{confirmModal.req.name || confirmModal.req.email || confirmModal.req.userId}</strong>
            </p>

            <div style={{ display: "flex", gap: "12px" }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmModal(null)} disabled={actionLoading}>
                Cancel
              </button>
              <button
                className="btn-glow"
                style={{ flex: 1, background: confirmModal.type === "delete" ? "#EF4444" : "#10B981", justifyContent: "center" }}
                disabled={actionLoading}
                onClick={() =>
                  confirmModal.type === "cancel"
                    ? handleCancel(confirmModal.req)
                    : handleDelete(confirmModal.req)
                }
              >
                {actionLoading ? "Processing..." : "Confirm Action"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
