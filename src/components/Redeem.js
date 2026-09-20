import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc
} from "firebase/firestore";
import { db } from "../Firebase";

export default function Redeem() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [voucherInput, setVoucherInput] = useState({});
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, "redeem_requests"),
      orderBy("created_at", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setRequests(list);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore error:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ================= UPDATE STATUS ================= */
  const updateStatus = async (id, status, type) => {
    const voucher = voucherInput[id]?.trim();

    // Voucher required for voucher types when approving
    if (
      status === "success" &&
      type !== "upi" &&
      type !== "bank" &&
      !voucher
    ) {
      alert("⚠️ Please enter a voucher code before approving.");
      return;
    }

    try {
      const data = {
        status: status,
        updated_at: Date.now()
      };

      if (
        status === "success" &&
        type !== "upi" &&
        type !== "bank"
      ) {
        data.voucher_code = voucher;
        data.voucher_added_at = Date.now();
      }

      await updateDoc(doc(db, "redeem_requests", id), data);
      showToast(`Request marked as ${status.toUpperCase()}`);

    } catch (err) {
      showToast("Failed to update status", "error");
      console.error(err);
    }
  };

  /* ================= SAVE VOUCHER ONLY ================= */
  const saveVoucher = async (id) => {
    const voucher = voucherInput[id]?.trim();
    if (!voucher) {
      alert("Please enter voucher code first.");
      return;
    }

    try {
      await updateDoc(doc(db, "redeem_requests", id), {
        voucher_code: voucher,
        voucher_added_at: Date.now(),
      });
      showToast("Voucher code saved successfully!");
    } catch (err) {
      showToast("Failed to save voucher", "error");
      console.error(err);
    }
  };

  // Filtered list
  const filteredRequests = requests.filter((req) => {
    const matchStatus =
      filterStatus === "ALL" ||
      (req.status || "pending").toLowerCase() === filterStatus.toLowerCase();

    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      (req.username && req.username.toLowerCase().includes(q)) ||
      (req.email && req.email.toLowerCase().includes(q)) ||
      (req.type && req.type.toLowerCase().includes(q)) ||
      (req.withdraw_details && req.withdraw_details.toLowerCase().includes(q)) ||
      (req.voucher_code && req.voucher_code.toLowerCase().includes(q));

    return matchStatus && matchSearch;
  });

  // Calculate metrics
  const pendingCount = requests.filter((r) => (r.status || "pending") === "pending").length;
  const successCount = requests.filter((r) => r.status === "success").length;
  const totalAmountPaid = requests
    .filter((r) => r.status === "success")
    .reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }} className="animate-fade-in">
        <div className="spinner"></div>
        <p style={{ color: "#94A3B8" }}>Loading Redemption Requests...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }} className="animate-fade-in">
      
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: "30px",
          right: "30px",
          background: toast.type === "error" ? "#EF4444" : "#10B981",
          color: "#fff",
          padding: "12px 24px",
          borderRadius: "12px",
          fontWeight: "600",
          boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          zIndex: 9999,
          animation: "fadeIn 0.2s ease"
        }}>
          {toast.message}
        </div>
      )}

      {/* STATS SUMMARY CARDS */}
      <div className="stats-grid" style={{ marginBottom: "24px" }}>
        <div className="stat-card glass-card">
          <div className="stat-icon" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#F59E0B" }}>⏳</div>
          <div>
            <div className="stat-value" style={{ color: "#F59E0B" }}>{pendingCount}</div>
            <div className="stat-label">Pending Redemptions</div>
          </div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10B981" }}>✅</div>
          <div>
            <div className="stat-value" style={{ color: "#10B981" }}>{successCount}</div>
            <div className="stat-label">Approved & Fulfilled</div>
          </div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-icon" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#6366F1" }}>💸</div>
          <div>
            <div className="stat-value">₹{totalAmountPaid.toLocaleString()}</div>
            <div className="stat-label">Total Amount Paid Out</div>
          </div>
        </div>
      </div>

      {/* CONTROLS HEADER */}
      <div className="glass-card" style={{ padding: "20px 24px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#F8FAFC" }}>
              💸 Redemption Requests ({filteredRequests.length})
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#94A3B8" }}>
              Approve withdraws, attach voucher codes, and manage user payouts.
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            {/* FILTER TABS */}
            <div style={{ display: "flex", background: "rgba(15, 23, 42, 0.8)", padding: "4px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
              {["ALL", "PENDING", "SUCCESS"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterStatus(tab)}
                  style={{
                    background: filterStatus === tab ? "#6366F1" : "transparent",
                    color: filterStatus === tab ? "#FFFFFF" : "#94A3B8",
                    border: "none",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* SEARCH */}
            <input
              type="text"
              className="form-input"
              placeholder="Search user, email, UPI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "240px" }}
            />
          </div>
        </div>
      </div>

      {/* REQUEST CARDS GRID */}
      {filteredRequests.length === 0 ? (
        <div className="glass-card" style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>
          No redemption requests match your filter.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "20px" }}>
          {filteredRequests.map((req) => {
            const currentVoucher = voucherInput[req.id] ?? req.voucher_code ?? "";
            const isVoucherType = req.type !== "upi" && req.type !== "bank";
            const currentStatus = (req.status || "pending").toLowerCase();

            return (
              <div
                key={req.id}
                className="glass-card"
                style={{
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justify: "space-between",
                  borderColor: currentStatus === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(255, 255, 255, 0.08)"
                }}
              >
                <div>
                  {/* TOP CARD BAR */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div>
                      <span className="badge badge-info" style={{ textTransform: "uppercase" }}>
                        {req.type || "REDEEM"}
                      </span>
                      <h3 style={{ margin: "8px 0 2px 0", fontSize: "16px", fontWeight: "700", color: "#F8FAFC" }}>
                        {req.username || "Anonymous User"}
                      </h3>
                      <div style={{ fontSize: "12px", color: "#94A3B8" }}>{req.email || "No Email"}</div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "20px", fontWeight: "800", color: "#10B981" }}>
                        ₹{req.amount}
                      </div>
                      <div style={{ fontSize: "11px", color: "#F59E0B" }}>
                        💰 {req.coins} coins
                      </div>
                    </div>
                  </div>

                  <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.06)", margin: "12px 0" }} />

                  {/* WITHDRAW DETAILS */}
                  {(req.type === "upi" || req.type === "bank") && (
                    <div style={{ background: "rgba(15, 23, 42, 0.8)", padding: "10px 14px", borderRadius: "8px", marginBottom: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ fontSize: "11px", color: "#64748B", textTransform: "uppercase", fontWeight: "700" }}>
                        Payment Target (UPI / Bank)
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#38BDF8", marginTop: "2px", wordBreak: "break-all" }}>
                        {req.withdraw_details || "N/A"}
                      </div>
                    </div>
                  )}

                  {/* VOUCHER INPUT FIELD FOR VOUCHERS */}
                  {isVoucherType && (
                    <div style={{ marginBottom: "12px" }}>
                      <label style={{ fontSize: "11px", color: "#94A3B8", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                        🎟️ Voucher Code:
                      </label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Paste voucher code here..."
                          value={currentVoucher}
                          onChange={(e) =>
                            setVoucherInput({
                              ...voucherInput,
                              [req.id]: e.target.value,
                            })
                          }
                        />
                        <button
                          className="btn-secondary"
                          onClick={() => saveVoucher(req.id)}
                          disabled={!currentVoucher.trim()}
                          style={{ padding: "8px 12px", fontSize: "12px" }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* STATUS & ACTION FOOTER */}
                <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className={currentStatus === "success" ? "badge badge-success" : "badge badge-pending"}>
                    {currentStatus === "success" ? "✅ APPROVED" : "⏳ PENDING"}
                  </span>

                  <select
                    className="form-input"
                    value={currentStatus}
                    onChange={(e) => updateStatus(req.id, e.target.value, req.type)}
                    style={{
                      width: "auto",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: "700",
                      background: currentStatus === "success" ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                      color: currentStatus === "success" ? "#34D399" : "#FBBF24",
                      borderColor: currentStatus === "success" ? "rgba(16, 185, 129, 0.4)" : "rgba(245, 158, 11, 0.4)"
                    }}
                  >
                    <option value="pending">Set PENDING</option>
                    <option value="success">Approve & Fulfill</option>
                  </select>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
