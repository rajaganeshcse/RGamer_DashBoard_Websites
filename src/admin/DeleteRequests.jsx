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

/* =========================================================
   DELETE REQUESTS ADMIN PAGE
   Reads from Firestore: account_delete_requests
   Admin can:
     - Cancel → sets status = "Cancelled", updates users/{uid}.account = "Active"
     - Delete  → sets status = "Deleted",    updates users/{uid}.account = "Deleted"
   ========================================================= */

export default function DeleteRequests() {
  const navigate = useNavigate();
  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState("pending"); // "pending" | "deleted" | "cancelled"
  const [search, setSearch]       = useState("");
  const [actionLoading, setActionLoading] = useState(null); // holds request id being acted on
  const [confirmModal, setConfirmModal]   = useState(null); // { type:"cancel"|"delete", req }

  /* ── Firestore real-time listener ── */
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

  /* ── CANCEL REQUEST ── */
  const handleCancel = async (req) => {
    setActionLoading(req.id);
    try {
      // 1. Update the delete-request doc
      await updateDoc(doc(db, "account_delete_requests", req.id), {
        status: "Cancelled",
        cancelledAt: serverTimestamp(),
        cancelledBy: "admin",
      });

      // 2. Restore user account field in users collection
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

  /* ── FORCE DELETE ── */
  const handleDelete = async (req) => {
    setActionLoading(req.id);
    try {
      // 1. Update the delete-request doc to Deleted
      await updateDoc(doc(db, "account_delete_requests", req.id), {
        status: "Deleted",
        deletedAt: serverTimestamp(),
        deletedBy: "admin",
      });

      // 2. Mark the user account as Deleted in users collection
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

  /* ── Filter ── */
  const statusMap = {
    pending:   "pending",
    deleted:   "deleted",
    cancelled: "cancelled",
  };

  const filtered = requests.filter((r) => {
    const s = (r.status || "").toLowerCase();
    const statusMatch = s === (statusMap[activeTab] || "pending");
    const term = search.toLowerCase();
    const searchMatch =
      !term ||
      (r.userId || "").toLowerCase().includes(term) ||
      (r.email  || "").toLowerCase().includes(term) ||
      (r.name   || "").toLowerCase().includes(term);
    return statusMatch && searchMatch;
  });

  const countOf = (status) =>
    requests.filter((r) => (r.status || "").toLowerCase() === status).length;

  /* ── Helpers ── */
  const formatDate = (val) => {
    if (!val) return "—";
    const d = val?.toDate ? val.toDate() : new Date(val);
    return d.toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const daysRemaining = (val) => {
    if (!val) return null;
    const submitted  = val?.toDate ? val.toDate() : new Date(val);
    const deleteOn   = new Date(submitted.getTime() + 7 * 24 * 60 * 60 * 1000);
    return Math.ceil((deleteOn - new Date()) / (1000 * 60 * 60 * 24));
  };

  /* ── Render ── */
  return (
    <div style={styles.page}>

      {/* ── HEADER ── */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>← Back</button>
        <div>
          <h2 style={styles.pageTitle}>🗑️ Account Deletion Requests</h2>
          <p style={styles.pageSubtitle}>
            Cancel or approve pending deletion requests · View deleted accounts
          </p>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div style={styles.statsRow}>
        {[
          { label: "⏳ Pending",    count: countOf("pending"),   color: "#F59E0B" },
          { label: "🗑️ Deleted",   count: countOf("deleted"),   color: "#EF4444" },
          { label: "↩️ Cancelled", count: countOf("cancelled"), color: "#10B981" },
          { label: "📋 Total",      count: requests.length,      color: "#6366F1" },
        ].map((s) => (
          <div key={s.label} style={{ ...styles.statCard, borderTop: `4px solid ${s.color}` }}>
            <div style={{ ...styles.statNumber, color: s.color }}>{s.count}</div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── TABS ── */}
      <div style={styles.tabRow}>
        {[
          { key: "pending",   label: `⏳ Pending (${countOf("pending")})`,     activeColor: "#F59E0B", activeBg: "#FEF3C7", activeText: "#92400E" },
          { key: "deleted",   label: `🗑️ Deleted (${countOf("deleted")})`,    activeColor: "#EF4444", activeBg: "#FEE2E2", activeText: "#991B1B" },
          { key: "cancelled", label: `↩️ Cancelled (${countOf("cancelled")})`,activeColor: "#10B981", activeBg: "#D1FAE5", activeText: "#065F46" },
        ].map((tab) => (
          <button
            key={tab.key}
            style={{
              ...styles.tab,
              ...(activeTab === tab.key
                ? { border: `2px solid ${tab.activeColor}`, background: tab.activeBg, color: tab.activeText }
                : {}),
            }}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── SEARCH ── */}
      <div style={styles.searchWrap}>
        <input
          style={styles.searchInput}
          placeholder="🔍  Search by User ID, email or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── LIST ── */}
      {loading ? (
        <div style={styles.emptyBox}>
          <div style={styles.spinner} />
          <p style={{ color: "#888", marginTop: 12 }}>Loading requests…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={styles.emptyBox}>
          <span style={{ fontSize: 44 }}>
            {activeTab === "pending" ? "⏳" : activeTab === "deleted" ? "🗑️" : "↩️"}
          </span>
          <p style={{ color: "#888", marginTop: 10 }}>No {activeTab} requests found</p>
        </div>
      ) : (
        <div style={styles.list}>
          {filtered.map((req) => {
            const status  = (req.status || "").toLowerCase();
            const isPending   = status === "pending";
            const isDeleted   = status === "deleted";
            const isCancelled = status === "cancelled";
            const days = isPending ? daysRemaining(req.requestedAt) : null;
            const busy = actionLoading === req.id;

            return (
              <div key={req.id} style={styles.card}>

                {/* Card Header */}
                <div style={styles.cardHeader}>
                  <div style={styles.avatarCircle}>
                    {(req.name || req.email || "?")[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.userName}>{req.name || "Unknown User"}</div>
                    <div style={styles.userEmail}>{req.email || "No email"}</div>
                  </div>
                  <StatusBadge status={req.status} />
                </div>

                {/* Info Grid */}
                <div style={styles.infoGrid}>
                  <InfoRow label="User ID"      value={req.userId || req.id} mono />
                  <InfoRow label="Requested At" value={formatDate(req.requestedAt)} />
                  {req.deletedAt   && <InfoRow label="Deleted At"   value={formatDate(req.deletedAt)} />}
                  {req.cancelledAt && <InfoRow label="Cancelled At" value={formatDate(req.cancelledAt)} />}
                  {req.cancelledBy && <InfoRow label="Cancelled By" value={req.cancelledBy} />}
                  {req.deletedBy   && <InfoRow label="Deleted By"   value={req.deletedBy} />}
                  {req.email       && <InfoRow label="Email"        value={req.email} />}
                </div>

                {/* Countdown for pending */}
                {isPending && days !== null && (
                  <div style={{
                    ...styles.countdownBar,
                    background:  days <= 1 ? "#FEE2E2" : "#FEF3C7",
                    borderLeft: `4px solid ${days <= 1 ? "#EF4444" : "#F59E0B"}`,
                    marginBottom: 12,
                  }}>
                    <span style={{ fontWeight: 600, color: days <= 1 ? "#991B1B" : "#92400E" }}>
                      {days <= 0
                        ? "⚠️ Overdue — account should be deleted"
                        : `⏱️ ${days} day${days !== 1 ? "s" : ""} remaining before automatic deletion`}
                    </span>
                  </div>
                )}

                {/* Deleted note */}
                {isDeleted && (
                  <div style={{ ...styles.statusNote, background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B" }}>
                    🗑️ Account permanently deleted. All user data, coins, tickets and history have been removed.
                  </div>
                )}

                {/* Cancelled note */}
                {isCancelled && (
                  <div style={{ ...styles.statusNote, background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#166534" }}>
                    ✅ Deletion request cancelled. Account has been restored to Active status.
                  </div>
                )}

                {/* ── ADMIN ACTION BUTTONS (only for pending) ── */}
                {isPending && (
                  <div style={styles.actionRow}>
                    {/* CANCEL button */}
                    <button
                      style={{ ...styles.actionBtn, ...styles.cancelBtn }}
                      disabled={busy}
                      onClick={() => setConfirmModal({ type: "cancel", req })}
                    >
                      {busy && actionLoading === req.id ? "…" : "↩️ Cancel Request"}
                    </button>

                    {/* DELETE button */}
                    <button
                      style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                      disabled={busy}
                      onClick={() => setConfirmModal({ type: "delete", req })}
                    >
                      {busy && actionLoading === req.id ? "…" : "🗑️ Delete Now"}
                    </button>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* ── CONFIRM MODAL ── */}
      {confirmModal && (
        <ConfirmModal
          type={confirmModal.type}
          req={confirmModal.req}
          loading={actionLoading === confirmModal.req.id}
          onCancel={() => setConfirmModal(null)}
          onConfirm={() =>
            confirmModal.type === "cancel"
              ? handleCancel(confirmModal.req)
              : handleDelete(confirmModal.req)
          }
        />
      )}
    </div>
  );
}

/* =========================================================
   SUB-COMPONENTS
   ========================================================= */

function StatusBadge({ status }) {
  const s = (status || "").toLowerCase();
  const map = {
    pending:   { bg: "#FEF3C7", color: "#92400E", border: "#FCD34D", label: "⏳ Pending" },
    deleted:   { bg: "#FEE2E2", color: "#991B1B", border: "#FCA5A5", label: "🗑️ Deleted" },
    cancelled: { bg: "#D1FAE5", color: "#065F46", border: "#6EE7B7", label: "↩️ Cancelled" },
  };
  const style = map[s] || map.pending;
  return (
    <div style={{
      padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
      whiteSpace: "nowrap", background: style.bg, color: style.color,
      border: `1px solid ${style.border}`,
    }}>
      {style.label}
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "6px 0", borderBottom: "1px solid #F3F4F6",
    }}>
      <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </span>
      <span style={{
        fontSize: 13, color: "#1F2937", fontWeight: 500,
        wordBreak: "break-all", textAlign: "right", maxWidth: "60%",
        fontFamily: mono ? "monospace" : "inherit",
      }}>
        {value}
      </span>
    </div>
  );
}

function ConfirmModal({ type, req, loading, onCancel, onConfirm }) {
  const isDelete = type === "delete";
  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.box}>
        <div style={{ fontSize: 44, textAlign: "center", marginBottom: 12 }}>
          {isDelete ? "🗑️" : "↩️"}
        </div>
        <h3 style={{ margin: "0 0 8px", textAlign: "center", color: isDelete ? "#991B1B" : "#065F46" }}>
          {isDelete ? "Confirm Deletion" : "Cancel Delete Request"}
        </h3>
        <p style={{ textAlign: "center", color: "#4B5563", fontSize: 14, margin: "0 0 6px" }}>
          {isDelete
            ? "Are you sure you want to permanently delete this account?"
            : "Are you sure you want to cancel this deletion request?"}
        </p>
        <div style={modalStyles.infoChip}>
          <strong>User:</strong> {req.name || req.email || req.userId}
        </div>
        {isDelete && (
          <div style={modalStyles.warningBox}>
            ⚠️ This will set the account status to <strong>Deleted</strong>. The user will not be able to log in.
          </div>
        )}
        {!isDelete && (
          <div style={modalStyles.infoBox}>
            ✅ This will set the account status back to <strong>Active</strong>.
          </div>
        )}
        <div style={modalStyles.btnRow}>
          <button style={modalStyles.btnNo} onClick={onCancel} disabled={loading}>
            No, Go Back
          </button>
          <button
            style={isDelete ? modalStyles.btnDeleteConfirm : modalStyles.btnCancelConfirm}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading
              ? "Processing…"
              : isDelete
              ? "Yes, Delete Account"
              : "Yes, Cancel Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   STYLES
   ========================================================= */
const styles = {
  page: {
    minHeight: "100vh", background: "#F4F6FB", padding: "28px 24px",
    fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
  },
  header: { display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24 },
  backBtn: {
    padding: "8px 16px", borderRadius: 8, border: "1px solid #D1D5DB",
    background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13,
    color: "#374151", whiteSpace: "nowrap",
  },
  pageTitle:    { margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" },
  pageSubtitle: { margin: "4px 0 0", fontSize: 13, color: "#6B7280" },
  statsRow: { display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" },
  statCard: {
    flex: "1 1 140px", background: "#fff", borderRadius: 12,
    padding: "16px 18px", boxShadow: "0 4px 14px rgba(0,0,0,0.07)",
  },
  statNumber: { fontSize: 30, fontWeight: 800, lineHeight: 1 },
  statLabel:  { fontSize: 12, color: "#6B7280", marginTop: 6, fontWeight: 600 },
  tabRow: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  tab: {
    padding: "10px 18px", borderRadius: 8, border: "2px solid #E5E7EB",
    background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13, color: "#6B7280",
  },
  searchWrap: { marginBottom: 20 },
  searchInput: {
    width: "100%", padding: "11px 16px", borderRadius: 10,
    border: "1.5px solid #E5E7EB", fontSize: 14, outline: "none",
    boxSizing: "border-box", background: "#fff",
  },
  list: { display: "flex", flexDirection: "column", gap: 14 },
  card: {
    background: "#fff", borderRadius: 14, padding: "18px 20px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.07)",
  },
  cardHeader: { display: "flex", alignItems: "center", gap: 14, marginBottom: 14 },
  avatarCircle: {
    width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
    background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
    color: "#fff", fontSize: 20, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  userName:    { fontSize: 15, fontWeight: 700, color: "#111827" },
  userEmail:   { fontSize: 12, color: "#6B7280", marginTop: 2 },
  infoGrid:    { background: "#F9FAFB", borderRadius: 10, padding: "10px 14px", marginBottom: 12 },
  countdownBar:{ borderRadius: 8, padding: "10px 14px", fontSize: 13 },
  statusNote:  { borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 500 },
  actionRow:   { display: "flex", gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1, padding: "11px 0", borderRadius: 10, border: "none",
    fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "opacity 0.2s",
  },
  cancelBtn: { background: "#D1FAE5", color: "#065F46" },
  deleteBtn:  { background: "#FEE2E2", color: "#991B1B" },
  emptyBox: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: "60px 20px",
    background: "#fff", borderRadius: 14, boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
  },
  spinner: {
    width: 36, height: 36, border: "4px solid #E5E7EB",
    borderTop: "4px solid #6366F1", borderRadius: "50%",
  },
};

const modalStyles = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
  },
  box: {
    background: "#fff", borderRadius: 16, padding: "28px 28px 24px",
    width: "100%", maxWidth: 420, boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
  },
  infoChip: {
    background: "#F3F4F6", borderRadius: 8, padding: "8px 14px",
    fontSize: 13, color: "#374151", marginBottom: 12, textAlign: "center",
  },
  warningBox: {
    background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8,
    padding: "10px 14px", fontSize: 13, color: "#991B1B",
    marginBottom: 18, lineHeight: 1.5,
  },
  infoBox: {
    background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8,
    padding: "10px 14px", fontSize: 13, color: "#166534",
    marginBottom: 18, lineHeight: 1.5,
  },
  btnRow: { display: "flex", gap: 10 },
  btnNo: {
    flex: 1, padding: "11px 0", borderRadius: 10, border: "1.5px solid #E5E7EB",
    background: "#fff", color: "#374151", fontWeight: 700, fontSize: 14, cursor: "pointer",
  },
  btnDeleteConfirm: {
    flex: 1, padding: "11px 0", borderRadius: 10, border: "none",
    background: "#EF4444", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
  },
  btnCancelConfirm: {
    flex: 1, padding: "11px 0", borderRadius: 10, border: "none",
    background: "#10B981", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
  },
};
