import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../Firebase";
import "./User.css";

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState(null);

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
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

  // Filter users by search
  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.referralCode && u.referralCode.toLowerCase().includes(q)) ||
      (u.id && u.id.toLowerCase().includes(q))
    );
  });

  // Calculate Stats
  const totalCoins = users.reduce((acc, u) => acc + (Number(u.coins) || 0), 0);
  const totalTickets = users.reduce((acc, u) => acc + (Number(u.tickets) || 0), 0);

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) || 1;
  const paginatedUsers = filteredUsers.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    if (timestamp?.toDate) {
      return timestamp.toDate().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    if (typeof timestamp === "number") {
      return new Date(timestamp).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    return String(timestamp);
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

      {/* STATS HEADER CARDS */}
      <div className="stats-grid">
        <div className="stat-card glass-card">
          <div className="stat-icon">👥</div>
          <div>
            <div className="stat-value">{users.length.toLocaleString()}</div>
            <div className="stat-label">Total Registered Users</div>
          </div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-icon">💰</div>
          <div>
            <div className="stat-value" style={{ color: "#F59E0B" }}>
              {totalCoins.toLocaleString()}
            </div>
            <div className="stat-label">Total User Balance (Coins)</div>
          </div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-icon">🎟️</div>
          <div>
            <div className="stat-value" style={{ color: "#3B82F6" }}>
              {totalTickets.toLocaleString()}
            </div>
            <div className="stat-label">Total User Tickets</div>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="users-toolbar glass-card">
        <div className="toolbar-left">
          <h2 className="toolbar-title">👤 User Directory</h2>
          <span className="user-count-badge">{filteredUsers.length} Users</span>
        </div>

        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search by name, email, referral or UID..."
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
                <th>Coins</th>
                <th>Tickets</th>
                <th>Referral Code</th>
                <th>Registered Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-table">
                    No users matching your search criteria.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="table-row">
                    <td>
                      <img
                        src={user.profile_pic || user.profile_image || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + user.id}
                        alt="avatar"
                        className="user-avatar"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://api.dicebear.com/7.x/avataaars/svg?seed=" + user.id;
                        }}
                      />
                    </td>
                    <td>
                      <div className="user-name-text">{user.name || "Anonymous User"}</div>
                      <div className="user-id-text" title={user.id}>
                        ID: {user.id ? user.id.substring(0, 12) + "..." : "N/A"}
                      </div>
                    </td>
                    <td className="email-cell">{user.email || "No Email"}</td>
                    <td>
                      <span className="badge badge-pending">
                        💰 {Number(user.coins || 0).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-info">
                        🎟️ {Number(user.tickets || 0).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <code className="referral-tag">
                        {user.referralCode || "NONE"}
                      </code>
                    </td>
                    <td className="date-cell">{formatDate(user.created_at)}</td>
                    <td>
                      <button
                        className="copy-btn"
                        onClick={() => handleCopy(user.email || user.id, user.id)}
                      >
                        {copiedId === user.id ? "✓ Copied!" : "📋 Copy Details"}
                      </button>
                    </td>
                  </tr>
                ))
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
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
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

    </div>
  );
}

export default Users;
