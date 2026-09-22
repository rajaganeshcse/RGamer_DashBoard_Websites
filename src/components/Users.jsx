import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
  increment,
  addDoc
} from "firebase/firestore";
import { db } from "../Firebase";
import "./User.css";

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState("NEWEST");
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState(null);
  const [toast, setToast] = useState(null);

  // Modals state
  const [selectedUser, setSelectedUser] = useState(null);
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustData, setAdjustData] = useState({
    type: "ADD", // "ADD" or "DEDUCT"
    asset: "COINS", // "COINS" or "TICKETS"
    amount: "",
    reason: ""
  });
  const [adjusting, setAdjusting] = useState(false);

  const ITEMS_PER_PAGE = 12;

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        setUsers(list);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore error:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Filter & Search Logic
  const filteredUsers = users
    .filter((u) => {
      // Status filter
      const isBanned = (u.status || "").toUpperCase() === "BANNED" || (u.account || "").toLowerCase() === "suspended";
      if (filterStatus === "ACTIVE" && isBanned) return false;
      if (filterStatus === "BANNED" && !isBanned) return false;
      if (filterStatus === "HIGH_BALANCE" && (Number(u.coins) || 0) < 5000) return false;

      // Search query
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.referralCode && u.referralCode.toLowerCase().includes(q)) ||
        (u.id && u.id.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === "NEWEST") {
        const t1 = a.created_at || 0;
        const t2 = b.created_at || 0;
        return (t2?.toDate ? t2.toDate().getTime() : t2) - (t1?.toDate ? t1.toDate().getTime() : t1);
      }
      if (sortBy === "OLDEST") {
        const t1 = a.created_at || 0;
        const t2 = b.created_at || 0;
        return (t1?.toDate ? t1.toDate().getTime() : t1) - (t2?.toDate ? t2.toDate().getTime() : t2);
      }
      if (sortBy === "COINS_HIGH") return (Number(b.coins) || 0) - (Number(a.coins) || 0);
      if (sortBy === "TICKETS_HIGH") return (Number(b.tickets) || 0) - (Number(a.tickets) || 0);
      if (sortBy === "NAME") return (a.name || "").localeCompare(b.name || "");
      return 0;
    });

  // Aggregated Stats
  const totalCoins = users.reduce((acc, u) => acc + (Number(u.coins) || 0), 0);
  const totalTickets = users.reduce((acc, u) => acc + (Number(u.tickets) || 0), 0);
  const bannedCount = users.filter((u) => (u.status || "").toUpperCase() === "BANNED" || (u.account || "").toLowerCase() === "suspended").length;

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) || 1;
  const paginatedUsers = filteredUsers.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast("📋 Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    if (timestamp?.toDate) {
      return timestamp.toDate().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    }
    if (typeof timestamp === "number") {
      return new Date(timestamp).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    }
    return String(timestamp);
  };

  // 1. Balance Adjustment (Coins & Tickets)
  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    if (!selectedUser || !adjustData.amount || Number(adjustData.amount) <= 0) {
      alert("Please enter a valid amount greater than 0");
      return;
    }

    const delta = adjustData.type === "ADD" ? Number(adjustData.amount) : -Number(adjustData.amount);
    const field = adjustData.asset === "COINS" ? "coins" : "tickets";

    setAdjusting(true);
    try {
      const userRef = doc(db, "users", selectedUser.id);

      // Safe update
      await updateDoc(userRef, {
        [field]: increment(delta),
        updated_at: serverTimestamp()
      });

      // Write to ledger
      await addDoc(collection(db, "users", selectedUser.id, "coin_details"), {
        amount: delta,
        field: adjustData.asset,
        type: "ADMIN_ADJUSTMENT",
        description: adjustData.reason || `Admin balance ${adjustData.type.toLowerCase()}`,
        adminAdjustment: true,
        created_at: Date.now()
      });

      showToast(`✅ Successfully ${adjustData.type === "ADD" ? "added" : "deducted"} ${adjustData.amount} ${adjustData.asset.toLowerCase()}`);
      setShowAdjustModal(false);
      setAdjustData({ type: "ADD", asset: "COINS", amount: "", reason: "" });
    } catch (err) {
      console.error("Balance adjust failed:", err);
      showToast("❌ Failed to adjust balance: " + err.message, "error");
    } finally {
      setAdjusting(false);
    }
  };

  // 2. Ban / Unban Toggle
  const handleToggleBan = async (user) => {
    const isBanned = (user.status || "").toUpperCase() === "BANNED" || (user.account || "").toLowerCase() === "suspended";
    const confirmMsg = isBanned
      ? `Are you sure you want to UNBAN user "${user.name || user.id}"?`
      : `Are you sure you want to BAN user "${user.name || user.id}"? They will lose access to withdrawals and rewards.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const userRef = doc(db, "users", user.id);
      await updateDoc(userRef, {
        status: isBanned ? "ACTIVE" : "BANNED",
        account: isBanned ? "Active" : "Suspended",
        bannedAt: isBanned ? null : serverTimestamp()
      });

      showToast(isBanned ? `🟢 User ${user.name || "account"} unbanned` : `🔴 User ${user.name || "account"} banned!`);
      if (selectedUser?.id === user.id) {
        setSelectedUser((prev) => ({ ...prev, status: isBanned ? "ACTIVE" : "BANNED" }));
      }
    } catch (err) {
      console.error("Ban toggle failed:", err);
      showToast("❌ Failed to update user status", "error");
    }
  };

  // 3. Export to CSV
  const handleExportCSV = () => {
    if (filteredUsers.length === 0) {
      alert("No users to export!");
      return;
    }

    const headers = ["UID", "Name", "Email", "Coins", "Tickets", "ReferralCode", "Status", "JoinedDate"];
    const rows = filteredUsers.map((u) => [
      `"${u.id || ""}"`,
      `"${(u.name || "").replace(/"/g, '""')}"`,
      `"${(u.email || "").replace(/"/g, '""')}"`,
      u.coins || 0,
      u.tickets || 0,
      `"${u.referralCode || ""}"`,
      `"${(u.status || "ACTIVE").toUpperCase()}"`,
      `"${formatDate(u.created_at)}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `rgamer_users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`📊 Exported ${filteredUsers.length} users to CSV`);
  };

  if (loading) {
    return (
      <div className="users-loading animate-fade-in">
        <div className="spinner"></div>
        <p>Loading Users Database...</p>
      </div>
    );
  }

  return (
    <div className="users-container animate-fade-in">
      
      {/* FLOATING TOAST */}
      {toast && (
        <div className={`floating-toast ${toast.type === "error" ? "toast-error" : "toast-success"}`}>
          {toast.message}
        </div>
      )}

      {/* STATS HEADER CARDS */}
      <div className="stats-grid">
        <div className="stat-card glass-card">
          <div className="stat-icon">👥</div>
          <div>
            <div className="stat-value">{users.length.toLocaleString()}</div>
            <div className="stat-label">Total Players ({bannedCount} Banned)</div>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon">💰</div>
          <div>
            <div className="stat-value" style={{ color: "#F59E0B" }}>
              {totalCoins.toLocaleString()}
            </div>
            <div className="stat-label">Total Circulating Coins</div>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon">🎟️</div>
          <div>
            <div className="stat-value" style={{ color: "#3B82F6" }}>
              {totalTickets.toLocaleString()}
            </div>
            <div className="stat-label">Active User Tickets</div>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="users-toolbar glass-card">
        <div className="toolbar-left">
          <h2 className="toolbar-title">Player Directory & Controls</h2>
          <span className="user-count-badge">{filteredUsers.length} Users</span>
        </div>

        <div className="toolbar-actions">
          {/* Search Box */}
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="form-input search-input"
              placeholder="Search name, email, referral, UID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search && (
              <button className="clear-btn" onClick={() => setSearch("")}>
                ✕
              </button>
            )}
          </div>

          {/* Filter Status */}
          <select
            className="select-input"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All Accounts</option>
            <option value="ACTIVE">Active Only</option>
            <option value="BANNED">Banned Only</option>
            <option value="HIGH_BALANCE">High Balance (&gt;5k)</option>
          </select>

          {/* Sort By */}
          <select
            className="select-input"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="NEWEST">Joined: Newest First</option>
            <option value="OLDEST">Joined: Oldest First</option>
            <option value="COINS_HIGH">Coins: Highest First</option>
            <option value="TICKETS_HIGH">Tickets: Highest First</option>
            <option value="NAME">Name: A to Z</option>
          </select>

          {/* Export CSV Button */}
          <button className="btn-csv" onClick={handleExportCSV} title="Export filtered users to CSV">
            <span>📥</span> CSV
          </button>
        </div>
      </div>

      {/* USERS TABLE */}
      <div className="table-card glass-card">
        <div className="table-responsive">
          <table className="user-table">
            <thead>
              <tr>
                <th>Profile</th>
                <th>Name & UID</th>
                <th>Email Address</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Referral</th>
                <th>Joined</th>
                <th>Management Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-table">
                    No users matching your search and filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const isBanned = (user.status || "").toUpperCase() === "BANNED" || (user.account || "").toLowerCase() === "suspended";
                  return (
                    <tr key={user.id} className="table-row">
                      <td>
                        <img
                          src={user.profile_pic || user.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                          alt="avatar"
                          className="user-avatar"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`;
                          }}
                        />
                      </td>
                      <td>
                        <div className="user-name-text">{user.name || "Anonymous Player"}</div>
                        <div className="user-id-text" title={user.id}>
                          ID: {user.id ? user.id.substring(0, 10) + "..." : "N/A"}
                        </div>
                      </td>
                      <td className="email-cell">{user.email || "No Email"}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          <span className="badge badge-pending">
                            🪙 {Number(user.coins || 0).toLocaleString()}
                          </span>
                          <span className="badge badge-info" style={{ fontSize: "10px" }}>
                            🎟️ {Number(user.tickets || 0)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${isBanned ? "badge-danger" : "badge-success"}`}>
                          {isBanned ? "BANNED" : "ACTIVE"}
                        </span>
                      </td>
                      <td>
                        <code className="referral-tag">
                          {user.referralCode || "NONE"}
                        </code>
                      </td>
                      <td className="date-cell">{formatDate(user.created_at)}</td>
                      <td>
                        <div className="action-btn-group">
                          {/* Inspect Profile */}
                          <button
                            className="btn-action-sm btn-inspect"
                            title="Inspect complete profile"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowInspectModal(true);
                            }}
                          >
                            👁️ View
                          </button>

                          {/* Adjust Balance */}
                          <button
                            className="btn-action-sm btn-adjust"
                            title="Add or deduct coins/tickets"
                            onClick={() => {
                              setSelectedUser(user);
                              setAdjustData({ type: "ADD", asset: "COINS", amount: "", reason: "" });
                              setShowAdjustModal(true);
                            }}
                          >
                            ⚖️ Adjust
                          </button>

                          {/* Ban / Unban */}
                          <button
                            className={`btn-action-sm ${isBanned ? "btn-unban" : "btn-ban"}`}
                            title={isBanned ? "Unban account" : "Ban account"}
                            onClick={() => handleToggleBan(user)}
                          >
                            {isBanned ? "🔓 Unban" : "🚫 Ban"}
                          </button>

                          {/* Copy UID */}
                          <button
                            className="copy-btn"
                            title="Copy UID"
                            onClick={() => handleCopy(user.id, user.id)}
                          >
                            {copiedId === user.id ? "✓" : "📋"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        {totalPages > 1 && (
          <div className="pagination-bar">
            <button
              className="pagination-btn"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
            >
              ← Previous
            </button>

            <span className="pagination-info">
              Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({filteredUsers.length} total)
            </span>

            <button
              className="pagination-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ── MODAL 1: INSPECT USER PROFILE ── */}
      {showInspectModal && selectedUser && (
        <div className="modal-backdrop" onClick={() => setShowInspectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: "18px", color: "#F8FAFC", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>👤</span> Player Account Profile
              </h3>
              <button className="modal-close-btn" onClick={() => setShowInspectModal(false)}>✕</button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
              <img
                src={selectedUser.profile_pic || selectedUser.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.id}`}
                alt="avatar"
                style={{ width: "64px", height: "64px", borderRadius: "50%", border: "2px solid #6366F1" }}
              />
              <div>
                <h4 style={{ margin: 0, fontSize: "18px", color: "#F8FAFC" }}>
                  {selectedUser.name || "Anonymous Player"}
                </h4>
                <div style={{ fontSize: "13px", color: "#94A3B8", marginTop: "2px" }}>
                  {selectedUser.email || "No Email Registered"}
                </div>
                <div style={{ marginTop: "6px" }}>
                  <span className={`badge ${(selectedUser.status || "").toUpperCase() === "BANNED" ? "badge-danger" : "badge-success"}`}>
                    {(selectedUser.status || "").toUpperCase() === "BANNED" ? "BANNED" : "ACTIVE"}
                  </span>
                </div>
              </div>
            </div>

            <div className="profile-detail-grid">
              <div className="profile-detail-box">
                <div className="profile-detail-label">Full Firestore UID</div>
                <div className="profile-detail-val" style={{ fontSize: "12px", fontFamily: "monospace" }}>
                  {selectedUser.id}
                </div>
              </div>

              <div className="profile-detail-box">
                <div className="profile-detail-label">Referral Code</div>
                <div className="profile-detail-val" style={{ color: "#38BDF8" }}>
                  {selectedUser.referralCode || "NONE"}
                </div>
              </div>

              <div className="profile-detail-box">
                <div className="profile-detail-label">Coin Balance</div>
                <div className="profile-detail-val" style={{ color: "#FBBF24" }}>
                  🪙 {Number(selectedUser.coins || 0).toLocaleString()}
                </div>
              </div>

              <div className="profile-detail-box">
                <div className="profile-detail-label">Tickets Available</div>
                <div className="profile-detail-val" style={{ color: "#60A5FA" }}>
                  🎟️ {Number(selectedUser.tickets || 0).toLocaleString()}
                </div>
              </div>

              <div className="profile-detail-box">
                <div className="profile-detail-label">Account Joined</div>
                <div className="profile-detail-val">
                  {formatDate(selectedUser.created_at)}
                </div>
              </div>

              <div className="profile-detail-box">
                <div className="profile-detail-label">FCM Token Status</div>
                <div className="profile-detail-val" style={{ fontSize: "12px" }}>
                  {selectedUser.fcmToken ? "🟢 Registered" : "⚪ Not Registered"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                className="btn-glow"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => {
                  setShowInspectModal(false);
                  setAdjustData({ type: "ADD", asset: "COINS", amount: "", reason: "" });
                  setShowAdjustModal(true);
                }}
              >
                ⚖️ Adjust Balance
              </button>
              <button
                className={(selectedUser.status || "").toUpperCase() === "BANNED" ? "btn-success" : "btn-danger"}
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => handleToggleBan(selectedUser)}
              >
                {(selectedUser.status || "").toUpperCase() === "BANNED" ? "🔓 Unban Account" : "🚫 Ban Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ADJUST BALANCE ── */}
      {showAdjustModal && selectedUser && (
        <div className="modal-backdrop" onClick={() => setShowAdjustModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: "18px", color: "#F8FAFC", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>⚖️</span> Adjust Player Balance
              </h3>
              <button className="modal-close-btn" onClick={() => setShowAdjustModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveAdjustment}>
              <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "12px", borderRadius: "8px", marginBottom: "18px" }}>
                <div style={{ fontSize: "13px", color: "#94A3B8" }}>Target Player:</div>
                <div style={{ fontWeight: "700", color: "#F8FAFC", fontSize: "15px" }}>
                  {selectedUser.name || "Anonymous Player"} ({selectedUser.email || selectedUser.id})
                </div>
                <div style={{ fontSize: "12px", color: "#FBBF24", marginTop: "4px" }}>
                  Current: 🪙 {Number(selectedUser.coins || 0).toLocaleString()} coins • 🎟️ {Number(selectedUser.tickets || 0)} tickets
                </div>
              </div>

              {/* Action Type & Asset Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#94A3B8", marginBottom: "6px" }}>
                    OPERATION
                  </label>
                  <select
                    className="select-input"
                    style={{ width: "100%" }}
                    value={adjustData.type}
                    onChange={(e) => setAdjustData({ ...adjustData, type: e.target.value })}
                  >
                    <option value="ADD">➕ Add (+)</option>
                    <option value="DEDUCT">➖ Deduct (-)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#94A3B8", marginBottom: "6px" }}>
                    BALANCE ASSET
                  </label>
                  <select
                    className="select-input"
                    style={{ width: "100%" }}
                    value={adjustData.asset}
                    onChange={(e) => setAdjustData({ ...adjustData, asset: e.target.value })}
                  >
                    <option value="COINS">🪙 Coins</option>
                    <option value="TICKETS">🎟️ Tickets</option>
                  </select>
                </div>
              </div>

              {/* Amount */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#94A3B8", marginBottom: "6px" }}>
                  AMOUNT
                </label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  placeholder="e.g. 500"
                  required
                  value={adjustData.amount}
                  onChange={(e) => setAdjustData({ ...adjustData, amount: e.target.value })}
                />
              </div>

              {/* Reason */}
              <div style={{ marginBottom: "22px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#94A3B8", marginBottom: "6px" }}>
                  AUDIT REASON (SAVED TO LEDGER)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Tournament Prize, Missing Bonus, Fraud Penalty"
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => setShowAdjustModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className="btn-glow"
                  style={{ flex: 2, justifyContent: "center" }}
                >
                  {adjusting ? "Processing..." : `Confirm ${adjustData.type === "ADD" ? "Addition" : "Deduction"} →`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Users;
