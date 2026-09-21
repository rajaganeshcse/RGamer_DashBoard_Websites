import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  setDoc,
  getDoc
} from "firebase/firestore";
import { db } from "../Firebase";

export default function Redeem() {
  const [activeTab, setActiveTab] = useState("REQUESTS"); // "REQUESTS" or "CONFIG"
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [voucherInput, setVoucherInput] = useState({});
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

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

  useEffect(() => {
    // 1. Fetch Redemption Requests
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

    // 2. Fetch Reward Settings & Options
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

    return () => unsub();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
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

  const pendingCount = requests.filter((r) => (r.status || "pending") === "pending").length;
  const successCount = requests.filter((r) => r.status === "success").length;
  const totalAmountPaid = requests
    .filter((r) => r.status === "success")
    .reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }} className="animate-fade-in">
        <div className="spinner"></div>
        <p style={{ color: "#94A3B8" }}>Loading Redemption Dashboard...</p>
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

      {/* TOP TAB CONTROLLER & METRICS */}
      <div className="glass-card" style={{ padding: "20px 24px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#F8FAFC" }}>
              🏆 Reward &amp; Payout Management
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#94A3B8" }}>
              Enable/disable payout methods, set coin conversion rates &amp; fulfill user redemption requests.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
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
                placeholder="Search user, email, UPI..."
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
          TAB 2: REWARD CONFIG & OPTIONS SETTINGS
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
