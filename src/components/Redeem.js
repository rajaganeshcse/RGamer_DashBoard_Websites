import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../Firebase";

export default function Redeem() {
  const [activeTab, setActiveTab] = useState("REQUESTS"); // "REQUESTS", "INVENTORY", or "CONFIG"
  const [requests, setRequests] = useState([]);
  const [withdrawalCodes, setWithdrawalCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [voucherInput, setVoucherInput] = useState({});
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  // Bulk Code Add Form State
  const [bulkMethod, setBulkMethod] = useState("GOOGLE_PLAY");
  const [bulkAmount, setBulkAmount] = useState("100");
  const [bulkCodesInput, setBulkCodesInput] = useState("");
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
  const [inventoryFilterMethod, setInventoryFilterMethod] = useState("ALL");

  // Reward Config State
  const [config, setConfig] = useState({
    conversionRate: 100, // 100 coins = Re 1
    upiEnabled: true,
    bankEnabled: true,
    googleEnabled: true,
    amazonEnabled: true,
    phonepeEnabled: true,
    tiers: [
      { id: "upi_1", type: "upi", coins: 200, amount: 2, enabled: true },
      { id: "upi_2", type: "upi", coins: 500, amount: 5, enabled: true },
      { id: "upi_3", type: "upi", coins: 1174, amount: 10, enabled: true },
      { id: "upi_4", type: "upi", coins: 2674, amount: 25, enabled: true },
      { id: "upi_5", type: "upi", coins: 10000, amount: 100, enabled: true },
      { id: "bank_1", type: "bank", coins: 5000, amount: 50, enabled: true },
      { id: "bank_2", type: "bank", coins: 10000, amount: 100, enabled: true },
      { id: "bank_3", type: "bank", coins: 20000, amount: 200, enabled: true },
      { id: "google_1", type: "google", coins: 1000, amount: 10, enabled: true },
      { id: "google_2", type: "google", coins: 3500, amount: 35, enabled: true },
      { id: "google_3", type: "google", coins: 5000, amount: 50, enabled: true },
      { id: "google_4", type: "google", coins: 10000, amount: 100, enabled: true },
      { id: "amazon_1", type: "amazon", coins: 1000, amount: 10, enabled: true },
      { id: "amazon_2", type: "amazon", coins: 3500, amount: 35, enabled: true },
      { id: "amazon_3", type: "amazon", coins: 5000, amount: 50, enabled: true },
      { id: "amazon_4", type: "amazon", coins: 10000, amount: 100, enabled: true },
      { id: "phonepe_1", type: "phonepe", coins: 1000, amount: 10, enabled: true },
      { id: "phonepe_2", type: "phonepe", coins: 3500, amount: 35, enabled: true },
      { id: "phonepe_3", type: "phonepe", coins: 5000, amount: 50, enabled: true },
      { id: "phonepe_4", type: "phonepe", coins: 10000, amount: 100, enabled: true }
    ]
  });

  const [savingConfig, setSavingConfig] = useState(false);
  const [newTier, setNewTier] = useState({ type: "upi", coins: "", amount: "" });

  const normalizeMethodName = (m) => {
    if (!m) return "";
    const upper = m.toUpperCase().trim();
    if (upper === "GOOGLE" || upper === "GOOGLE_PLAY" || upper === "GOOGLEPLAY") return "GOOGLE_PLAY";
    if (upper === "AMAZON" || upper === "AMAZON_PAY") return "AMAZON";
    if (upper === "PHONEPE" || upper === "PHONE_PE") return "PHONEPE";
    if (upper === "UPI") return "UPI";
    if (upper === "BANK") return "BANK";
    return upper;
  };

  useEffect(() => {
    // 1. Fetch Redemption Requests
    const qRequests = query(
      collection(db, "redeem_requests"),
      orderBy("created_at", "desc")
    );

    const unsubRequests = onSnapshot(
      qRequests,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRequests(list);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore error fetching requests:", error);
        setLoading(false);
      }
    );

    // 2. Fetch Withdrawal Codes (Inventory)
    const qCodes = collection(db, "withdrawal_codes");
    const unsubCodes = onSnapshot(
      qCodes,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setWithdrawalCodes(list);
      },
      (error) => {
        console.error("Firestore error fetching withdrawal codes:", error);
      }
    );

    // 3. Fetch Reward Settings & Options
    const fetchConfig = async () => {
      try {
        const configDoc = await getDoc(doc(db, "settings", "reward_config"));
        if (configDoc.exists()) {
          setConfig((prev) => ({ ...prev, ...configDoc.data() }));
        }
      } catch (e) {
        console.error("Error fetching reward config:", e);
      }
    };

    fetchConfig();

    return () => {
      unsubRequests();
      unsubCodes();
    };
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ================= SAVE REWARD CONFIG ================= */
  const saveRewardConfig = async (updatedConfig) => {
    setSavingConfig(true);
    try {
      const configToSave = updatedConfig || config;
      await setDoc(doc(db, "settings", "reward_config"), configToSave, { merge: true });
      showToast("✅ Reward settings updated successfully!");
    } catch (e) {
      console.error("Failed to save reward config:", e);
      showToast("❌ Failed to update reward settings", "error");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleToggleMethod = (methodKey) => {
    const updated = {
      ...config,
      [methodKey]: !config[methodKey]
    };
    setConfig(updated);
    saveRewardConfig(updated);
  };

  const handleToggleTier = (tierId) => {
    const updatedTiers = config.tiers.map((t) =>
      t.id === tierId ? { ...t, enabled: !t.enabled } : t
    );
    const updated = { ...config, tiers: updatedTiers };
    setConfig(updated);
    saveRewardConfig(updated);
  };

  const handleDeleteTier = (tierId) => {
    const updatedTiers = config.tiers.filter((t) => t.id !== tierId);
    const updated = { ...config, tiers: updatedTiers };
    setConfig(updated);
    saveRewardConfig(updated);
  };

  const handleAddTier = (e) => {
    e.preventDefault();
    if (!newTier.coins || !newTier.amount) {
      alert("Please enter coins cost and amount");
      return;
    }

    const tierObj = {
      id: `${newTier.type}_${Date.now()}`,
      type: newTier.type,
      coins: Number(newTier.coins),
      amount: Number(newTier.amount),
      enabled: true
    };

    const updatedTiers = [...config.tiers, tierObj];
    const updated = { ...config, tiers: updatedTiers };
    setConfig(updated);
    saveRewardConfig(updated);
    setNewTier({ type: "upi", coins: "", amount: "" });
  };

  /* ================= UPDATE REQUEST STATUS ================= */
  const updateStatus = async (id, status, type) => {
    const voucher = voucherInput[id]?.trim();

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

  /* ================= BULK ADD CODES (INVENTORY) ================= */
  const handleBulkAddCodes = async (e) => {
    e.preventDefault();
    const amountNum = Number(bulkAmount);
    if (!amountNum || amountNum <= 0) {
      alert("Please specify a valid amount.");
      return;
    }

    const lines = bulkCodesInput
      .split("\n")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const uniqueCodes = Array.from(new Set(lines));

    if (uniqueCodes.length === 0) {
      alert("Please enter at least one non-empty code.");
      return;
    }

    setIsSubmittingBulk(true);

    try {
      let addedCount = 0;
      let allocatedCount = 0;

      // 1. Send to Backend REST API if running
      try {
        const response = await fetch("http://localhost:8080/api/admin/withdrawal-codes/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: bulkMethod,
            amount: amountNum,
            codes: uniqueCodes
          })
        });

        if (response.ok) {
          const resData = await response.json();
          if (resData.status) {
            showToast(`🎉 Backend: ${resData.message}`);
            setBulkCodesInput("");
            setIsSubmittingBulk(false);
            return;
          }
        }
      } catch (netErr) {
        console.log("Backend API not reachable directly, falling back to direct Firestore insertion & auto-allocation.");
      }

      // 2. Direct Firestore insertion + FIFO Auto-Allocation Fallback
      // Find matching pending requests for FIFO allocation
      const pendingForMethod = requests
        .filter((r) => {
          const rMethod = normalizeMethodName(r.type);
          const rStatus = (r.status || "pending").toUpperCase();
          return rMethod === bulkMethod && Number(r.amount) === amountNum && (rStatus === "PENDING" || rStatus === "PENDING_CODE");
        })
        .sort((a, b) => (a.created_at || 0) - (b.created_at || 0));

      let pendingIndex = 0;

      for (const codeStr of uniqueCodes) {
        // Check duplicate locally
        const exists = withdrawalCodes.some(
          (c) => normalizeMethodName(c.method) === bulkMethod && Number(c.amount) === amountNum && c.code === codeStr
        );
        if (exists) continue;

        let codeStatus = "AVAILABLE";
        let allocatedTo = null;
        let withdrawalRequestId = null;
        let allocatedAt = null;

        // Auto allocate to pending request if available
        if (pendingIndex < pendingForMethod.length) {
          const reqToFulfill = pendingForMethod[pendingIndex];
          codeStatus = "ALLOCATED";
          allocatedTo = reqToFulfill.uid || reqToFulfill.username || reqToFulfill.email || "User";
          withdrawalRequestId = reqToFulfill.id;
          allocatedAt = Date.now();

          // Update redeem_request document
          await updateDoc(doc(db, "redeem_requests", reqToFulfill.id), {
            status: "success",
            voucher_code: codeStr,
            voucher_added_at: Date.now()
          });

          allocatedCount++;
          pendingIndex++;
        }

        // Add code document to withdrawal_codes
        await addDoc(collection(db, "withdrawal_codes"), {
          method: bulkMethod,
          amount: amountNum,
          code: codeStr,
          status: codeStatus,
          createdAt: serverTimestamp(),
          allocatedAt: allocatedAt,
          allocatedTo: allocatedTo,
          withdrawalRequestId: withdrawalRequestId
        });

        addedCount++;
      }

      showToast(`✅ Added ${addedCount} code(s). ${allocatedCount} auto-allocated to pending requests!`);
      setBulkCodesInput("");
    } catch (err) {
      console.error("Failed to add bulk codes:", err);
      showToast("❌ Failed to add codes to inventory", "error");
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  // Filtered Redemption Requests
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

  const pendingCount = requests.filter((r) => (r.status || "pending").toLowerCase() === "pending").length;
  const successCount = requests.filter((r) => (r.status || "").toLowerCase() === "success").length;
  const totalAmountPaid = requests
    .filter((r) => (r.status || "").toLowerCase() === "success")
    .reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

  // Code Inventory Metrics
  const totalAvailableCodes = withdrawalCodes.filter((c) => c.status === "AVAILABLE").length;
  const totalAllocatedCodes = withdrawalCodes.filter((c) => c.status === "ALLOCATED").length;
  const pendingCodeRequestsCount = requests.filter((r) => {
    const m = normalizeMethodName(r.type);
    const st = (r.status || "pending").toLowerCase();
    return (m === "GOOGLE_PLAY" || m === "AMAZON" || m === "PHONEPE") && st === "pending";
  }).length;

  // Group Withdrawal Codes by Method & Amount
  const codeInventoryGroups = {};
  withdrawalCodes.forEach((c) => {
    const m = normalizeMethodName(c.method);
    const amt = Number(c.amount) || 0;
    const key = `${m}_${amt}`;

    if (!codeInventoryGroups[key]) {
      codeInventoryGroups[key] = {
        method: m,
        amount: amt,
        available: 0,
        allocated: 0,
        codes: []
      };
    }

    if (c.status === "AVAILABLE") codeInventoryGroups[key].available++;
    if (c.status === "ALLOCATED") codeInventoryGroups[key].allocated++;
    codeInventoryGroups[key].codes.push(c);
  });

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }} className="animate-fade-in">
        <div className="spinner"></div>
        <p style={{ color: "#94A3B8" }}>Loading Redemption & Inventory Dashboard...</p>
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

      {/* TOP TAB CONTROLLER & HEADER */}
      <div className="glass-card" style={{ padding: "20px 24px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#F8FAFC" }}>
              🏆 Reward &amp; Payout Management
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#94A3B8" }}>
              Fulfill user redemption requests, manage Google Play / Gift Code inventory &amp; configure rates.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => setActiveTab("REQUESTS")}
              style={{
                background: activeTab === "REQUESTS" ? "#6366F1" : "rgba(15, 23, 42, 0.6)",
                color: "#FFFFFF",
                border: "1px solid rgba(255,255,255,0.1)",
                padding: "10px 20px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              💸 User Requests ({requests.length})
            </button>

            <button
              onClick={() => setActiveTab("INVENTORY")}
              style={{
                background: activeTab === "INVENTORY" ? "#6366F1" : "rgba(15, 23, 42, 0.6)",
                color: "#FFFFFF",
                border: "1px solid rgba(255,255,255,0.1)",
                padding: "10px 20px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              🎟️ Code Inventory ({totalAvailableCodes} Available)
            </button>

            <button
              onClick={() => setActiveTab("CONFIG")}
              style={{
                background: activeTab === "CONFIG" ? "#6366F1" : "rgba(15, 23, 42, 0.6)",
                color: "#FFFFFF",
                border: "1px solid rgba(255,255,255,0.1)",
                padding: "10px 20px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              ⚙️ Reward Options &amp; Rates
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          TAB 1: USER REDEMPTION REQUESTS
          ======================================================== */}
      {activeTab === "REQUESTS" && (
        <>
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
                <div className="stat-label">Approved &amp; Fulfilled</div>
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
          <div className="glass-card" style={{ padding: "16px 24px", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
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
                      cursor: "pointer"
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <input
                type="text"
                className="form-input"
                placeholder="Search user, email, UPI, code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: "260px" }}
              />
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
                      borderColor: currentStatus === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(255, 255, 255, 0.08)"
                    }}
                  >
                    <div>
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
                          color: currentStatus === "success" ? "#34D399" : "#FBBF24"
                        }}
                      >
                        <option value="pending">Set PENDING</option>
                        <option value="success">Approve &amp; Fulfill</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ========================================================
          TAB 2: CODE INVENTORY MANAGER (GOOGLE PLAY, AMAZON, PHONEPE)
          ======================================================== */}
      {activeTab === "INVENTORY" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* STATS OVERVIEW FOR CODE INVENTORY */}
          <div className="stats-grid">
            <div className="stat-card glass-card">
              <div className="stat-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10B981" }}>🎟️</div>
              <div>
                <div className="stat-value" style={{ color: "#10B981" }}>{totalAvailableCodes}</div>
                <div className="stat-label">Available Codes in Stock</div>
              </div>
            </div>

            <div className="stat-card glass-card">
              <div className="stat-icon" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#6366F1" }}>🔒</div>
              <div>
                <div className="stat-value" style={{ color: "#818CF8" }}>{totalAllocatedCodes}</div>
                <div className="stat-label">Codes Allocated to Users</div>
              </div>
            </div>

            <div className="stat-card glass-card">
              <div className="stat-icon" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#F59E0B" }}>⌛</div>
              <div>
                <div className="stat-value" style={{ color: "#F59E0B" }}>{pendingCodeRequestsCount}</div>
                <div className="stat-label">Pending Requests Awaiting Codes</div>
              </div>
            </div>
          </div>

          {/* BULK ADD CODE FORM */}
          <div className="glass-card" style={{ padding: "24px" }}>
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ margin: "0 0 4px 0", color: "#F8FAFC", fontSize: "18px", fontWeight: "700" }}>
                📥 Bulk Code Inventory Upload
              </h3>
              <p style={{ margin: 0, fontSize: "13px", color: "#94A3B8" }}>
                Add Google Play, Amazon, or PhonePe codes. Newly uploaded codes automatically resolve pending requests in FIFO order!
              </p>
            </div>

            <form onSubmit={handleBulkAddCodes} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "#94A3B8", fontWeight: "600", marginBottom: "4px" }}>
                    Redemption Method:
                  </label>
                  <select
                    className="form-input"
                    value={bulkMethod}
                    onChange={(e) => setBulkMethod(e.target.value)}
                    style={{ width: "100%", fontWeight: "600" }}
                  >
                    <option value="GOOGLE_PLAY">🎮 Google Play Gift Code (GOOGLE_PLAY)</option>
                    <option value="AMAZON">🛒 Amazon Gift Card (AMAZON)</option>
                    <option value="PHONEPE">📱 PhonePe Gift Code (PHONEPE)</option>
                  </select>
                </div>

                <div style={{ flex: 1, minWidth: "160px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "#94A3B8", fontWeight: "600", marginBottom: "4px" }}>
                    Denomination Amount (₹):
                  </label>
                  <select
                    className="form-input"
                    value={bulkAmount}
                    onChange={(e) => setBulkAmount(e.target.value)}
                    style={{ width: "100%", fontWeight: "600" }}
                  >
                    <option value="10">₹10</option>
                    <option value="25">₹25</option>
                    <option value="35">₹35</option>
                    <option value="50">₹50</option>
                    <option value="100">₹100</option>
                    <option value="200">₹200</option>
                    <option value="500">₹500</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#94A3B8", fontWeight: "600", marginBottom: "4px" }}>
                  Paste Codes (One code per line):
                </label>
                <textarea
                  className="form-input"
                  rows={5}
                  placeholder={`GP100-001\nGP100-002\nGP100-003\nGP100-004`}
                  value={bulkCodesInput}
                  onChange={(e) => setBulkCodesInput(e.target.value)}
                  style={{ fontFamily: "monospace", fontSize: "13px" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmittingBulk || !bulkCodesInput.trim()}
                  style={{ padding: "12px 28px", fontSize: "14px", fontWeight: "700" }}
                >
                  {isSubmittingBulk ? "Processing & Auto-Allocating..." : "🚀 Upload & Auto-Allocate Codes"}
                </button>
              </div>
            </form>
          </div>

          {/* INVENTORY GROUPS BREAKDOWN */}
          <div className="glass-card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
              <h3 style={{ margin: 0, color: "#F8FAFC", fontSize: "18px", fontWeight: "700" }}>
                📦 Code Inventory Status by Denomination
              </h3>

              <div style={{ display: "flex", gap: "8px" }}>
                {["ALL", "GOOGLE_PLAY", "AMAZON", "PHONEPE"].map((m) => (
                  <button
                    key={m}
                    onClick={() => setInventoryFilterMethod(m)}
                    style={{
                      background: inventoryFilterMethod === m ? "#6366F1" : "rgba(15, 23, 42, 0.6)",
                      color: "#FFFFFF",
                      border: "1px solid rgba(255,255,255,0.08)",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    {m.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {Object.keys(codeInventoryGroups).length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>
                No codes uploaded yet. Use the bulk uploader above to add codes for Google Play, Amazon, or PhonePe!
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
                {Object.values(codeInventoryGroups)
                  .filter((group) => inventoryFilterMethod === "ALL" || group.method === inventoryFilterMethod)
                  .map((group) => {
                    return (
                      <div
                        key={`${group.method}_${group.amount}`}
                        style={{
                          background: "rgba(15, 23, 42, 0.8)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "12px",
                          padding: "16px"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                          <div>
                            <span className="badge badge-info" style={{ textTransform: "uppercase", fontSize: "10px" }}>
                              {group.method}
                            </span>
                            <div style={{ fontSize: "20px", fontWeight: "800", color: "#10B981", marginTop: "4px" }}>
                              ₹{group.amount}
                            </div>
                          </div>

                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "13px", fontWeight: "700", color: "#34D399" }}>
                              {group.available} Available
                            </div>
                            <div style={{ fontSize: "12px", color: "#818CF8", marginTop: "2px" }}>
                              {group.allocated} Allocated
                            </div>
                          </div>
                        </div>

                        <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.06)", margin: "10px 0" }} />

                        <div style={{ maxHeight: "160px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                          {group.codes.slice(0, 10).map((c) => (
                            <div
                              key={c.id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                background: "rgba(255,255,255,0.03)",
                                padding: "6px 10px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontFamily: "monospace"
                              }}
                            >
                              <span style={{ color: "#F8FAFC", fontWeight: "600" }}>{c.code}</span>
                              <span
                                style={{
                                  fontSize: "10px",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  fontWeight: "700",
                                  background: c.status === "AVAILABLE" ? "rgba(16, 185, 129, 0.2)" : "rgba(139, 92, 246, 0.2)",
                                  color: c.status === "AVAILABLE" ? "#34D399" : "#C084FC"
                                }}
                              >
                                {c.status}
                              </span>
                            </div>
                          ))}
                          {group.codes.length > 10 && (
                            <div style={{ fontSize: "11px", color: "#64748B", textAlign: "center", marginTop: "4px" }}>
                              + {group.codes.length - 10} more codes
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================
          TAB 3: REWARD CONFIG & OPTIONS SETTINGS
          ======================================================== */}
      {activeTab === "CONFIG" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* 1. ENABLE / DISABLE PAYOUT METHODS & CONVERSION RATE */}
          <div className="glass-card" style={{ padding: "24px" }}>
            <h3 style={{ margin: "0 0 16px 0", color: "#F8FAFC", fontSize: "18px", fontWeight: "700" }}>
              ⚙️ Enable / Disable Payout Methods &amp; Conversion Rate
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
              {[
                { key: "upiEnabled", label: "💸 UPI Withdraw", icon: "🇮🇳" },
                { key: "bankEnabled", label: "🏦 Bank Transfer", icon: "🏛️" },
                { key: "googleEnabled", label: "🎮 Google Play Code", icon: "🎟️" },
                { key: "amazonEnabled", label: "🛒 Amazon Gift Card", icon: "📦" },
                { key: "phonepeEnabled", label: "📱 PhonePe Voucher", icon: "📲" }
              ].map((m) => (
                <div
                  key={m.key}
                  style={{
                    background: config[m.key] ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                    border: `1px solid ${config[m.key] ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                    padding: "16px",
                    borderRadius: "12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <div style={{ fontSize: "16px" }}>{m.icon}</div>
                    <div style={{ color: "#F8FAFC", fontWeight: "600", fontSize: "14px", marginTop: "4px" }}>{m.label}</div>
                    <div style={{ fontSize: "11px", color: config[m.key] ? "#34D399" : "#F87171" }}>
                      {config[m.key] ? "ACTIVE in App" : "DISABLED"}
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleMethod(m.key)}
                    style={{
                      background: config[m.key] ? "#10B981" : "#EF4444",
                      color: "#FFF",
                      border: "none",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      fontWeight: "700",
                      fontSize: "12px",
                      cursor: "pointer"
                    }}
                  >
                    {config[m.key] ? "Disable" : "Enable"}
                  </button>
                </div>
              ))}
            </div>

            {/* CONVERSION RATE INPUT */}
            <div style={{ background: "rgba(15, 23, 42, 0.8)", padding: "16px 20px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <label style={{ color: "#F8FAFC", fontWeight: "700", fontSize: "15px", display: "block" }}>
                  💰 App Global Coin Conversion Rate
                </label>
                <span style={{ fontSize: "12px", color: "#94A3B8" }}>
                  Set how many coins equal ₹1 (e.g. 100 coins = ₹1)
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="number"
                  className="form-input"
                  value={config.conversionRate || 100}
                  onChange={(e) => setConfig({ ...config, conversionRate: Number(e.target.value) })}
                  style={{ width: "120px", textAlign: "center", fontWeight: "700", fontSize: "16px" }}
                />
                <span style={{ color: "#F8FAFC", fontWeight: "600" }}>Coins = ₹1</span>

                <button
                  onClick={() => saveRewardConfig()}
                  disabled={savingConfig}
                  className="btn-primary"
                  style={{ padding: "8px 16px" }}
                >
                  {savingConfig ? "Saving..." : "Save Rate"}
                </button>
              </div>
            </div>
          </div>

          {/* 2. ADD NEW REWARD TIER FORM */}
          <div className="glass-card" style={{ padding: "24px" }}>
            <h3 style={{ margin: "0 0 16px 0", color: "#F8FAFC", fontSize: "18px", fontWeight: "700" }}>
              ➕ Add New Reward Option Card
            </h3>

            <form onSubmit={handleAddTier} style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#94A3B8", fontWeight: "600", marginBottom: "4px" }}>
                  Withdraw Type:
                </label>
                <select
                  className="form-input"
                  value={newTier.type}
                  onChange={(e) => setNewTier({ ...newTier, type: e.target.value })}
                  style={{ width: "180px" }}
                >
                  <option value="upi">UPI Withdraw</option>
                  <option value="bank">Bank Withdraw</option>
                  <option value="google">Google Play Voucher</option>
                  <option value="amazon">Amazon Gift Voucher</option>
                  <option value="phonepe">PhonePe Gift Voucher</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#94A3B8", fontWeight: "600", marginBottom: "4px" }}>
                  Coins Cost:
                </label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 1000"
                  value={newTier.coins}
                  onChange={(e) => setNewTier({ ...newTier, coins: e.target.value })}
                  style={{ width: "140px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#94A3B8", fontWeight: "600", marginBottom: "4px" }}>
                  Rupee Amount (₹):
                </label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 10"
                  value={newTier.amount}
                  onChange={(e) => setNewTier({ ...newTier, amount: e.target.value })}
                  style={{ width: "140px" }}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ padding: "10px 20px" }}>
                Add Reward Option
              </button>
            </form>
          </div>

          {/* 3. DYNAMIC REWARD TIERS LIST */}
          <div className="glass-card" style={{ padding: "24px" }}>
            <h3 style={{ margin: "0 0 16px 0", color: "#F8FAFC", fontSize: "18px", fontWeight: "700" }}>
              📜 Active Reward Card Options ({config.tiers.length})
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
              {config.tiers.map((t) => (
                <div
                  key={t.id}
                  style={{
                    background: t.enabled ? "rgba(15, 23, 42, 0.8)" : "rgba(239, 68, 68, 0.08)",
                    border: `1px solid ${t.enabled ? "rgba(255,255,255,0.1)" : "rgba(239, 68, 68, 0.2)"}`,
                    borderRadius: "12px",
                    padding: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <span className="badge badge-info" style={{ textTransform: "uppercase", fontSize: "10px" }}>
                      {t.type}
                    </span>
                    <div style={{ fontSize: "18px", fontWeight: "800", color: "#10B981", marginTop: "6px" }}>
                      ₹{t.amount}
                    </div>
                    <div style={{ fontSize: "12px", color: "#F59E0B", fontWeight: "600" }}>
                      💰 {t.coins} coins
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <button
                      onClick={() => handleToggleTier(t.id)}
                      style={{
                        background: t.enabled ? "#10B981" : "#64748B",
                        color: "#FFF",
                        border: "none",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "700",
                        cursor: "pointer"
                      }}
                    >
                      {t.enabled ? "Active" : "Disabled"}
                    </button>

                    <button
                      onClick={() => handleDeleteTier(t.id)}
                      style={{
                        background: "rgba(239, 68, 68, 0.2)",
                        color: "#F87171",
                        border: "1px solid rgba(239, 68, 68, 0.4)",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "700",
                        cursor: "pointer"
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
