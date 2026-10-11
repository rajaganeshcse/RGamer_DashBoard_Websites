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
import "./DeleteRequests.css";

export default function DeleteRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [viewMode, setViewMode] = useState("cards"); // 'cards' | 'table'
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
      alert("Error restoring account: " + e.message);
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
      alert("Error purging account: " + e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const statusMap = {
    pending: "pending",
    deleted: "deleted",
    cancelled: "cancelled",
    all: "all"
  };

  const filtered = requests.filter((r) => {
    const s = (r.status || "").toLowerCase();
    const statusMatch =
      activeTab === "all" ? true : s === (statusMap[activeTab] || "pending");
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
    <div className="delete-container animate-fade-in">
      
      {/* ================= HEADER BANNER ================= */}
      <div className="delete-header">
        <div className="delete-header-left">
          <div className="delete-badge-row">
            <span className="delete-vault-pill">
              <span>🛡️</span> PRIVACY &amp; DATA SAFETY VAULT
            </span>
            <span className="delete-compliance-tag">
              <span className="status-pulse-dot" style={{ width: "8px", height: "8px", background: "#00F5A0", borderRadius: "50%", display: "inline-block" }}></span>
              GOOGLE PLAY CONSOLE COMPLIANT
            </span>
            <span style={{ fontSize: "12px", color: "#CBD5E1", fontWeight: "700" }}>
              7-Day Safety Grace Period Enforcement
            </span>
          </div>
          <h1 className="delete-main-title">
            <span>🗑️</span> Account Deletion &amp; Data Erasure Management
          </h1>
          <p className="delete-header-subtitle">
            Audit user erasure submissions, manage safety grace periods, restore active accounts, or permanently purge player data.
          </p>
        </div>

        <div>
          <button
            type="button"
            className="luckydraw-action-btn-secondary"
            onClick={() => navigate(-1)}
          >
            <span>←</span> Back
          </button>
        </div>
      </div>

      {/* ================= 4 OPERATIONAL KPI METRIC CARDS ================= */}
      <div className="delete-kpi-grid">
        {/* Card 1: Pending */}
        <div className="delete-kpi-card delete-kpi-gold">
          <div className="delete-kpi-icon">⏳</div>
          <div className="delete-kpi-content">
            <div className="delete-kpi-value" style={{ color: "#FFB800" }}>
              {countOf("pending")}
            </div>
            <div className="delete-kpi-label">Pending Reviews</div>
            <div className="delete-kpi-subtext">Active in 7-day grace period</div>
          </div>
        </div>

        {/* Card 2: Deleted */}
        <div className="delete-kpi-card delete-kpi-coral">
          <div className="delete-kpi-icon">🗑️</div>
          <div className="delete-kpi-content">
            <div className="delete-kpi-value" style={{ color: "#FF4B72" }}>
              {countOf("deleted")}
            </div>
            <div className="delete-kpi-label">Purged Accounts</div>
            <div className="delete-kpi-subtext">Permanently erased profiles</div>
          </div>
        </div>

        {/* Card 3: Restored */}
        <div className="delete-kpi-card delete-kpi-mint">
          <div className="delete-kpi-icon">↩️</div>
          <div className="delete-kpi-content">
            <div className="delete-kpi-value" style={{ color: "#00F5A0" }}>
              {countOf("cancelled")}
            </div>
            <div className="delete-kpi-label">Restored &amp; Retained</div>
            <div className="delete-kpi-subtext">Returned to active play</div>
          </div>
        </div>

        {/* Card 4: Total Logged */}
        <div className="delete-kpi-card delete-kpi-cyan">
          <div className="delete-kpi-icon">🛡️</div>
          <div className="delete-kpi-content">
            <div className="delete-kpi-value">
              {requests.length}
            </div>
            <div className="delete-kpi-label">Total Erasure Tickets</div>
            <div className="delete-kpi-subtext">Lifetime privacy audit records</div>
          </div>
        </div>
      </div>

      {/* ================= TOOLBAR & FILTERS ================= */}
      <div className="delete-toolbar">
        {/* Colorful Tab Group */}
        <div className="delete-tab-group">
          <button
            type="button"
            className={`delete-tab-btn tab-pending ${activeTab === "pending" ? "active" : ""}`}
            onClick={() => setActiveTab("pending")}
          >
            <span>⏳</span>
            <span>Pending Review</span>
            <span className="delete-tab-badge">{countOf("pending")}</span>
          </button>

          <button
            type="button"
            className={`delete-tab-btn tab-deleted ${activeTab === "deleted" ? "active" : ""}`}
            onClick={() => setActiveTab("deleted")}
          >
            <span>🗑️</span>
            <span>Deleted Accounts</span>
            <span className="delete-tab-badge">{countOf("deleted")}</span>
          </button>

          <button
            type="button"
            className={`delete-tab-btn tab-cancelled ${activeTab === "cancelled" ? "active" : ""}`}
            onClick={() => setActiveTab("cancelled")}
          >
            <span>↩️</span>
            <span>Restored Active</span>
            <span className="delete-tab-badge">{countOf("cancelled")}</span>
          </button>

          <button
            type="button"
            className={`delete-tab-btn tab-all ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            <span>🌐</span>
            <span>All Audit Records</span>
            <span className="delete-tab-badge">{requests.length}</span>
          </button>
        </div>

        {/* Search & View Mode Switcher */}
        <div className="delete-controls-right">
          <input
            type="text"
            className="delete-search-input"
            placeholder="Search User ID, email, name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="delete-view-switcher">
            <button
              type="button"
              className={`delete-view-btn ${viewMode === "cards" ? "active" : ""}`}
              onClick={() => setViewMode("cards")}
              title="Cards Grid View"
            >
              🎴 Cards
            </button>
            <button
              type="button"
              className={`delete-view-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
              title="Audit Table View"
            >
              📊 Table
            </button>
          </div>
        </div>
      </div>

      {/* ================= CONTENT VIEWS ================= */}
      {loading ? (
        <div className="glass-card" style={{ padding: "60px", textAlign: "center" }}>
          <div className="spinner"></div>
          <p style={{ color: "#FFFFFF", fontWeight: "800", marginTop: "14px" }}>
            Synchronizing account erasure requests...
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="glass-card"
          style={{
            padding: "50px 20px",
            textAlign: "center",
            color: "#FFFFFF",
            fontWeight: "700",
            border: "1.5px dashed rgba(255, 255, 255, 0.15)"
          }}
        >
          <div style={{ fontSize: "40px", marginBottom: "10px" }}>🛡️</div>
          <h4 style={{ margin: "0 0 6px 0", fontSize: "18px", color: "#FFFFFF" }}>
            No {activeTab} deletion requests found.
          </h4>
          <p style={{ margin: 0, fontSize: "13px", color: "#CBD5E1" }}>
            {search ? "Try clearing your search query." : "All user data compliance requests are resolved."}
          </p>
        </div>
      ) : viewMode === "cards" ? (
        /* ---------------- VIEW 1: CARDS GRID ---------------- */
        <div className="delete-cards-grid">
          {filtered.map((req) => {
            const status = (req.status || "").toLowerCase();
            const isPending = status === "pending";
            const isDeleted = status === "deleted";
            const isCancelled = status === "cancelled";
            const days = isPending ? daysRemaining(req.requestedAt) : null;
            const busy = actionLoading === req.id;

            let cardAccentClass = "card-accent-pending";
            if (isDeleted) cardAccentClass = "card-accent-deleted";
            else if (isCancelled) cardAccentClass = "card-accent-cancelled";

            return (
              <div key={req.id} className={`delete-user-card ${cardAccentClass}`}>
                <div>
                  {/* Top Bar */}
                  <div className="delete-card-topbar">
                    <div className="delete-user-profile">
                      <div className="delete-avatar-ring">
                        {(req.name || req.email || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <h4 className="delete-user-name">
                          {req.name || "Unknown User"}
                        </h4>
                        <div className="delete-user-email">
                          {req.email || "No Email Provided"}
                        </div>
                      </div>
                    </div>

                    <span className={`delete-status-pill ${isDeleted ? "status-deleted-pill" : isCancelled ? "status-cancelled-pill" : "status-pending-pill"}`}>
                      {isDeleted ? "DELETED" : isCancelled ? "RESTORED" : "PENDING"}
                    </span>
                  </div>

                  {/* Info Box */}
                  <div className="delete-specs-box">
                    <div className="delete-spec-row">
                      <span className="delete-spec-label">User ID:</span>
                      <code className="delete-uid-tag">{req.userId || req.id}</code>
                    </div>
                    <div className="delete-spec-row">
                      <span className="delete-spec-label">Requested Date:</span>
                      <span style={{ color: "#FFFFFF", fontWeight: "700" }}>{formatDate(req.requestedAt)}</span>
                    </div>
                    {req.reason && (
                      <div className="delete-spec-row" style={{ alignItems: "flex-start" }}>
                        <span className="delete-spec-label">Reason:</span>
                        <span style={{ color: "#E2E8F0", fontStyle: "italic", textAlign: "right", maxWidth: "200px" }}>
                          "{req.reason}"
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Grace Period Banner */}
                  {isPending && days !== null && (
                    <div className={`delete-countdown-banner ${days <= 1 ? "banner-urgent" : "banner-safe"}`}>
                      <span>{days <= 1 ? "⚠️" : "⏱️"}</span>
                      <span>
                        {days <= 0
                          ? "Overdue — 7-day safety grace period expired"
                          : `${days} day${days !== 1 ? "s" : ""} remaining in 7-day safety grace period`}
                      </span>
                    </div>
                  )}

                  {isDeleted && (
                    <div className="delete-countdown-banner banner-urgent" style={{ background: "rgba(239, 68, 68, 0.12)" }}>
                      <span>🚫</span>
                      <span>Account permanently purged and disabled in database</span>
                    </div>
                  )}

                  {isCancelled && (
                    <div className="delete-countdown-banner banner-done">
                      <span>✅</span>
                      <span>Account successfully restored to active play</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons for Pending */}
                {isPending && (
                  <div className="delete-card-actions">
                    <button
                      type="button"
                      className="delete-btn-restore"
                      disabled={busy}
                      onClick={() => setConfirmModal({ type: "cancel", req })}
                    >
                      <span>↩️</span> Restore Account
                    </button>

                    <button
                      type="button"
                      className="delete-btn-purge"
                      disabled={busy}
                      onClick={() => setConfirmModal({ type: "delete", req })}
                    >
                      <span>🗑️</span> Force Purge
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ---------------- VIEW 2: AUDIT TABLE VIEW ---------------- */
        <div className="delete-table-card">
          <div className="delete-table-wrap">
            <table className="delete-table">
              <thead>
                <tr>
                  <th className="delete-th">Target User</th>
                  <th className="delete-th">User ID</th>
                  <th className="delete-th">Requested At</th>
                  <th className="delete-th">Grace Period / Countdown</th>
                  <th className="delete-th">Status</th>
                  <th className="delete-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((req) => {
                  const status = (req.status || "").toLowerCase();
                  const isPending = status === "pending";
                  const isDeleted = status === "deleted";
                  const isCancelled = status === "cancelled";
                  const days = isPending ? daysRemaining(req.requestedAt) : null;
                  const busy = actionLoading === req.id;

                  return (
                    <tr key={req.id} className="delete-tr">
                      <td className="delete-td">
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: "34px",
                              height: "34px",
                              borderRadius: "10px",
                              background: "linear-gradient(135deg, #6366F1, #A855F7)",
                              color: "#FFFFFF",
                              fontWeight: "900",
                              fontSize: "14px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                          >
                            {(req.name || req.email || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: "900", color: "#FFFFFF", fontSize: "14px" }}>
                              {req.name || "Unknown User"}
                            </div>
                            <div style={{ fontSize: "12px", color: "#E2E8F0", fontWeight: "600" }}>
                              {req.email || "No Email"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="delete-td">
                        <code className="delete-uid-tag">{req.userId || req.id}</code>
                      </td>

                      <td className="delete-td">
                        <span style={{ color: "#E2E8F0", fontSize: "13px", fontWeight: "600" }}>
                          {formatDate(req.requestedAt)}
                        </span>
                      </td>

                      <td className="delete-td">
                        {isPending && days !== null ? (
                          <span
                            className="delete-status-pill"
                            style={{
                              background: days <= 1 ? "rgba(239, 68, 68, 0.18)" : "rgba(245, 158, 11, 0.18)",
                              color: days <= 1 ? "#FF4B72" : "#FFB800",
                              borderColor: days <= 1 ? "rgba(239, 68, 68, 0.5)" : "rgba(245, 158, 11, 0.5)"
                            }}
                          >
                            {days <= 0 ? "⚠️ Overdue" : `⏱️ ${days} days left`}
                          </span>
                        ) : isDeleted ? (
                          <span style={{ color: "#FF4B72", fontWeight: "700", fontSize: "12.5px" }}>
                            🚫 Purged
                          </span>
                        ) : (
                          <span style={{ color: "#00F5A0", fontWeight: "700", fontSize: "12.5px" }}>
                            ✅ Active
                          </span>
                        )}
                      </td>

                      <td className="delete-td">
                        <span className={`delete-status-pill ${isDeleted ? "status-deleted-pill" : isCancelled ? "status-cancelled-pill" : "status-pending-pill"}`}>
                          {isDeleted ? "DELETED" : isCancelled ? "RESTORED" : "PENDING"}
                        </span>
                      </td>

                      <td className="delete-td">
                        {isPending ? (
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              type="button"
                              className="delete-btn-restore"
                              disabled={busy}
                              style={{ padding: "6px 12px", fontSize: "12px" }}
                              onClick={() => setConfirmModal({ type: "cancel", req })}
                            >
                              ↩️ Restore
                            </button>
                            <button
                              type="button"
                              className="delete-btn-purge"
                              disabled={busy}
                              style={{ padding: "6px 12px", fontSize: "12px" }}
                              onClick={() => setConfirmModal({ type: "delete", req })}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "#CBD5E1", fontSize: "12px" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= CONFIRMATION MODAL ================= */}
      {confirmModal && (
        <div className="delete-modal-overlay">
          <div
            className="delete-modal-box"
            style={{
              borderColor: confirmModal.type === "delete" ? "rgba(239, 68, 68, 0.5)" : "rgba(16, 185, 129, 0.5)",
              boxShadow: confirmModal.type === "delete"
                ? "0 0 35px rgba(239, 68, 68, 0.35)"
                : "0 0 35px rgba(16, 185, 129, 0.35)"
            }}
          >
            <div className="delete-modal-icon">
              {confirmModal.type === "delete" ? "🗑️" : "↩️"}
            </div>
            <h3 className="delete-modal-title">
              {confirmModal.type === "delete" ? "Confirm Account Purge" : "Restore User Account"}
            </h3>
            <p className="delete-modal-body">
              {confirmModal.type === "delete"
                ? "Are you sure you want to permanently erase and deactivate the account for:"
                : "Cancel this erasure request and restore full active platform access to:"}
              <br />
              <strong style={{ color: "#00F2FE", display: "inline-block", marginTop: "8px", fontSize: "15px" }}>
                {confirmModal.req.name || confirmModal.req.email || confirmModal.req.userId}
              </strong>
            </p>

            <div className="delete-modal-actions">
              <button
                type="button"
                className="delete-modal-cancel"
                onClick={() => setConfirmModal(null)}
                disabled={actionLoading}
              >
                Dismiss
              </button>
              <button
                type="button"
                className={confirmModal.type === "delete" ? "delete-modal-confirm-purge" : "delete-modal-confirm-restore"}
                disabled={actionLoading}
                onClick={() =>
                  confirmModal.type === "cancel"
                    ? handleCancel(confirmModal.req)
                    : handleDelete(confirmModal.req)
                }
              >
                {actionLoading ? "Processing..." : confirmModal.type === "delete" ? "Yes, Purge Account" : "Yes, Restore User"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
