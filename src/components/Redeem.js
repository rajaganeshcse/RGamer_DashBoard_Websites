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
import "./Redeem.css";

export default function Redeem() {
  const [activeTab, setActiveTab] = useState("REQUESTS"); // "REQUESTS", "INVENTORY", or "CONFIG"
  const [requests, setRequests] = useState([]);
  const [withdrawalCodes, setWithdrawalCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [voucherInput, setVoucherInput] = useState({});
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [viewMode, setViewMode] = useState("CARDS"); // "CARDS" or "TABLE"
  const [copiedTarget, setCopiedTarget] = useState(null);

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

  const getMethodBadgeClass = (type) => {
    const norm = normalizeMethodName(type);
    if (norm === "UPI") return "method-upi";
    if (norm === "BANK") return "method-bank";
    if (norm === "GOOGLE_PLAY") return "method-google";
    if (norm === "AMAZON") return "method-amazon";
    if (norm === "PHONEPE") return "method-phonepe";
    return "method-upi";
  };

  const getMethodIcon = (type) => {
    const norm = normalizeMethodName(type);
    if (norm === "UPI") return "💸";
    if (norm === "BANK") return "🏦";
    if (norm === "GOOGLE_PLAY") return "🎮";
    if (norm === "AMAZON") return "🛒";
    if (norm === "PHONEPE") return "📱";
    return "💳";
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
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
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
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
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

  const formatDate = (val) => {
    if (!val) return "N/A";
    try {
      const d =
        typeof val?.toDate === "function"
          ? val.toDate()
          : typeof val?.seconds === "number"
          ? new Date(val.seconds * 1000)
          : new Date(val);
      return isNaN(d.getTime())
        ? "N/A"
        : d.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
          });
    } catch {
      return "N/A";
    }
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

  /* ================= STOCK CODE LOOKUP HELPER ================= */
  const getAvailableStockCode = (req) => {
    if (!req || req.type === "upi" || req.type === "bank") return null;
    const norm = normalizeMethodName(req.type);
    const amt = Number(req.amount) || 0;
    return withdrawalCodes.find(
      (c) =>
        c.status === "AVAILABLE" &&
        normalizeMethodName(c.method) === norm &&
        Number(c.amount) === amt
    );
  };

  const handleUseStockCode = (reqId, code) => {
    setVoucherInput((prev) => ({
      ...prev,
      [reqId]: code
    }));
    showToast(`⚡ Stock code ${code} auto-filled!`);
  };

  /* ================= UPDATE REQUEST STATUS ================= */
  const updateStatus = async (id, status, type, rejectReason = "") => {
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

        // Check if this voucher code exists in withdrawalCodes as AVAILABLE, and mark it as ALLOCATED
        const matchedCode = withdrawalCodes.find(
          (c) => c.status === "AVAILABLE" && c.code === voucher
        );
        if (matchedCode) {
          try {
            await updateDoc(doc(db, "withdrawal_codes", matchedCode.id), {
              status: "ALLOCATED",
              allocatedAt: Date.now(),
              allocatedTo: id,
              withdrawalRequestId: id
            });
          } catch (codeErr) {
            console.error("Could not update withdrawal code doc:", codeErr);
          }
        }
      }

      if (status === "failed" || status === "rejected") {
        data.reject_reason = rejectReason || "Rejected by administrator";
        data.rejected_at = Date.now();
      }

      await updateDoc(doc(db, "redeem_requests", id), data);
      showToast(`✅ Request marked as ${status.toUpperCase()}`);
    } catch (err) {
      showToast("❌ Failed to update status: " + err.message, "error");
      console.error(err);
    }
  };

  const copyAddress = (address, key) => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopiedTarget(key);
    showToast("📋 Copied to clipboard!");
    setTimeout(() => setCopiedTarget(null), 2000);
  };

  const handleExportRedeemsCSV = () => {
    if (filteredRequests.length === 0) {
      alert("No redemption requests to export!");
      return;
    }
    const headers = [
      "RequestID",
      "User",
      "Email",
      "Method",
      "AmountINR",
      "CoinsDeducted",
      "PaymentAddress",
      "VoucherCode",
      "Status",
      "Date"
    ];

    const rows = filteredRequests.map((r) => [
      `"${r.id}"`,
      `"${(r.username || "").replace(/"/g, '""')}"`,
      `"${(r.email || "").replace(/"/g, '""')}"`,
      `"${(r.type || "REDEEM").toUpperCase()}"`,
      r.amount || 0,
      r.coins || 0,
      `"${(r.withdraw_details || r.payment_address || "").replace(/"/g, '""')}"`,
      `"${(r.voucher_code || "").replace(/"/g, '""')}"`,
      `"${(r.status || "pending").toUpperCase()}"`,
      `"${formatDate(r.created_at)}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `redeem_payouts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`📊 Exported ${filteredRequests.length} payout records to CSV`);
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
        voucher_added_at: Date.now()
      });
      showToast("✅ Voucher code saved successfully!");
    } catch (err) {
      showToast("❌ Failed to save voucher", "error");
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
      const pendingForMethod = requests
        .filter((r) => {
          const rMethod = normalizeMethodName(r.type);
          const rStatus = (r.status || "pending").toUpperCase();
          return rMethod === bulkMethod && Number(r.amount) === amountNum && (rStatus === "PENDING" || rStatus === "PENDING_CODE");
        })
        .sort((a, b) => (a.created_at || 0) - (b.created_at || 0));

      let pendingIndex = 0;

      for (const codeStr of uniqueCodes) {
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

          await updateDoc(doc(db, "redeem_requests", reqToFulfill.id), {
            status: "success",
            voucher_code: codeStr,
            voucher_added_at: Date.now()
          });

          allocatedCount++;
          pendingIndex++;
        }

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
      (req.voucher_code && req.voucher_code.toLowerCase().includes(q)) ||
      (req.id && req.id.toLowerCase().includes(q));

    return matchStatus && matchSearch;
  });

  // KPI Calculations
  const pendingRequests = requests.filter(
    (r) => (r.status || "pending").toLowerCase() === "pending"
  );
  const successRequests = requests.filter(
    (r) => (r.status || "").toLowerCase() === "success"
  );
  const failedRequests = requests.filter(
    (r) =>
      (r.status || "").toLowerCase() === "failed" ||
      (r.status || "").toLowerCase() === "rejected"
  );

  const pendingCount = pendingRequests.length;
  const successCount = successRequests.length;
  const failedCount = failedRequests.length;

  const pendingAmount = pendingRequests.reduce(
    (acc, r) => acc + (Number(r.amount) || 0),
    0
  );
  const totalAmountPaid = successRequests.reduce(
    (acc, r) => acc + (Number(r.amount) || 0),
    0
  );
  const totalCoinsPaid = successRequests.reduce(
    (acc, r) => acc + (Number(r.coins) || 0),
    0
  );

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
      <div className="users-loading animate-fade-in">
        <div className="spinner"></div>
        <p style={{ marginTop: "16px", color: "#FFFFFF", fontWeight: "800" }}>
          Loading Payouts &amp; Rewards Engine...
        </p>
      </div>
    );
  }

  return (
    <div className="payout-container animate-fade-in">
      {/* FLOATING TOAST NOTIFICATION */}
      {toast && (
        <div className={`floating-toast ${toast.type === "error" ? "toast-error" : "toast-success"}`}>
          {toast.message}
        </div>
      )}

      {/* TOP HEADER & TAB SWITCHER */}
      <div className="payout-header">
        <div className="payout-header-left">
          <div className="payout-title-row">
            <h1 className="payout-main-title">
              <span>💳</span> Reward &amp; Payout Command Center
            </h1>
            <span className="payout-queue-pill">
              ⏳ {pendingCount} Payouts Awaiting Action
            </span>
          </div>
          <p className="payout-header-subtitle">
            Authorize withdrawal requests, disburse Google Play &amp; Amazon codes, and calibrate app token economy.
          </p>
        </div>

        <div className="payout-nav-tabs">
          <button
            className={`payout-tab-btn ${activeTab === "REQUESTS" ? "active" : ""}`}
            onClick={() => setActiveTab("REQUESTS")}
          >
            <span>💸</span> Payout Requests ({requests.length})
          </button>

          <button
            className={`payout-tab-btn ${activeTab === "INVENTORY" ? "active" : ""}`}
            onClick={() => setActiveTab("INVENTORY")}
          >
            <span>🎟️</span> Code Inventory ({totalAvailableCodes} In Stock)
          </button>

          <button
            className={`payout-tab-btn ${activeTab === "CONFIG" ? "active" : ""}`}
            onClick={() => setActiveTab("CONFIG")}
          >
            <span>⚙️</span> Rates &amp; Reward Options
          </button>
        </div>
      </div>

      {/* ========================================================
          TAB 1: USER REDEMPTION & PAYOUT REQUESTS
          ======================================================== */}
      {activeTab === "REQUESTS" && (
        <>
          {/* 4 OPERATIONAL KPI CARDS */}
          <div className="payout-stats-grid">
            <div className="payout-kpi-card kpi-amber">
              <div className="payout-kpi-icon icon-amber">⏳</div>
              <div className="payout-kpi-content">
                <div className="payout-kpi-val-row">
                  <span className="payout-kpi-val val-amber">{pendingCount}</span>
                  <span className="payout-kpi-pill pill-amber">₹{pendingAmount.toLocaleString()} Queued</span>
                </div>
                <div className="payout-kpi-label">Pending Verifications</div>
              </div>
            </div>

            <div className="payout-kpi-card kpi-green">
              <div className="payout-kpi-icon icon-green">✅</div>
              <div className="payout-kpi-content">
                <div className="payout-kpi-val-row">
                  <span className="payout-kpi-val val-green">{successCount}</span>
                  <span className="payout-kpi-pill pill-green">Approved &amp; Paid</span>
                </div>
                <div className="payout-kpi-label">Fulfilled Redemptions</div>
              </div>
            </div>

            <div className="payout-kpi-card kpi-indigo">
              <div className="payout-kpi-icon icon-indigo">💸</div>
              <div className="payout-kpi-content">
                <div className="payout-kpi-val-row">
                  <span className="payout-kpi-val val-indigo">₹{totalAmountPaid.toLocaleString()}</span>
                  <span className="payout-kpi-pill pill-indigo">{totalCoinsPaid.toLocaleString()} Coins</span>
                </div>
                <div className="payout-kpi-label">Total Capital Disbursed</div>
              </div>
            </div>

            <div className="payout-kpi-card kpi-rose">
              <div className="payout-kpi-icon icon-rose">🛡️</div>
              <div className="payout-kpi-content">
                <div className="payout-kpi-val-row">
                  <span className="payout-kpi-val val-rose">{failedCount}</span>
                  <span className="payout-kpi-pill pill-rose">
                    {((failedCount / (requests.length || 1)) * 100).toFixed(1)}% Flag Rate
                  </span>
                </div>
                <div className="payout-kpi-label">Rejected / Invalid Tickets</div>
              </div>
            </div>
          </div>

          {/* TOOLBAR CONTROLS */}
          <div className="payout-toolbar">
            <div className="payout-filter-group">
              {[
                { key: "ALL", label: `All (${requests.length})` },
                { key: "PENDING", label: `⏳ Pending (${pendingCount})` },
                { key: "SUCCESS", label: `✅ Approved (${successCount})` },
                { key: "FAILED", label: `❌ Rejected (${failedCount})` }
              ].map((tab) => (
                <button
                  key={tab.key}
                  className={`payout-filter-btn ${filterStatus === tab.key ? "active" : ""}`}
                  onClick={() => setFilterStatus(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="payout-toolbar-actions">
              {/* View Mode Switcher */}
              <div className="view-mode-toggle">
                <button
                  className={`view-mode-btn ${viewMode === "CARDS" ? "active" : ""}`}
                  onClick={() => setViewMode("CARDS")}
                  title="Card Grid View"
                >
                  🗂️ Cards
                </button>
                <button
                  className={`view-mode-btn ${viewMode === "TABLE" ? "active" : ""}`}
                  onClick={() => setViewMode("TABLE")}
                  title="Spreadsheet Table View"
                >
                  📋 Table
                </button>
              </div>

              {/* Search Box */}
              <div className="search-wrapper" style={{ minWidth: "260px" }}>
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search player, UPI, email, voucher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className="clear-btn" onClick={() => setSearch("")}>✕</button>
                )}
              </div>

              {/* Export CSV */}
              <button
                className="btn-csv"
                onClick={handleExportRedeemsCSV}
                title="Export filtered records to CSV"
              >
                <span>📥</span> CSV
              </button>
            </div>
          </div>

          {/* EMPTY STATE */}
          {filteredRequests.length === 0 ? (
            <div className="table-card" style={{ padding: "60px 20px", textAlign: "center" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔍</div>
              <h3 style={{ margin: "0 0 6px 0", color: "#FFFFFF", fontSize: "18px", fontWeight: "800" }}>
                No Payout Requests Found
              </h3>
              <p style={{ margin: 0, color: "#E2E8F0", fontSize: "14px", fontWeight: "600" }}>
                There are no requests matching your active filter "{filterStatus}".
              </p>
            </div>
          ) : viewMode === "CARDS" ? (
            /* ================= VIEW MODE 1: RICH CARDS GRID ================= */
            <div className="payout-grid">
              {filteredRequests.map((req) => {
                const currentVoucher = voucherInput[req.id] ?? req.voucher_code ?? "";
                const isVoucherType = req.type !== "upi" && req.type !== "bank";
                const currentStatus = (req.status || "pending").toLowerCase();
                const availableCodeMatch = isVoucherType && currentStatus === "pending" ? getAvailableStockCode(req) : null;

                const cardStatusClass =
                  currentStatus === "success"
                    ? "card-success"
                    : currentStatus === "failed" || currentStatus === "rejected"
                    ? "card-failed"
                    : "card-pending";

                return (
                  <div key={req.id} className={`payout-request-card ${cardStatusClass}`}>
                    <div>
                      {/* Top Row: User Avatar & Amount */}
                      <div className="payout-card-top">
                        <div className="payout-user-row">
                          <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${req.uid || req.id}`}
                            alt="avatar"
                            className="payout-user-avatar"
                          />
                          <div>
                            <div className={`payout-method-badge ${getMethodBadgeClass(req.type)}`}>
                              <span>{getMethodIcon(req.type)}</span> {req.type?.toUpperCase() || "REDEEM"}
                            </div>
                            <h3 className="payout-user-name">
                              {req.username || "Anonymous Player"}
                            </h3>
                            <div className="payout-user-email">
                              {req.email || "No Email Provided"}
                            </div>
                            <div className="payout-time-text">
                              <span>🕒</span> {formatDate(req.created_at)}
                            </div>
                          </div>
                        </div>

                        <div className="payout-amount-box">
                          <div className="payout-amount-inr">₹{req.amount}</div>
                          <div className="payout-amount-coins">
                            <span>🪙</span> {Number(req.coins || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: "14px 0" }} />

                      {/* Payment Destination Box for UPI / Bank */}
                      {(!isVoucherType) && (
                        <div className="payout-target-box">
                          <div>
                            <div className="target-label">
                              Payment Target ({req.type?.toUpperCase()})
                            </div>
                            <div className="target-address">
                              {req.withdraw_details || req.payment_address || "N/A"}
                            </div>
                          </div>
                          <button
                            className="copy-btn"
                            onClick={() => copyAddress(req.withdraw_details || req.payment_address, req.id)}
                            title="Copy payment target"
                          >
                            {copiedTarget === req.id ? "✓ Copied" : "📋 Copy"}
                          </button>
                        </div>
                      )}

                      {/* Voucher Code Box for Google Play, Amazon, PhonePe */}
                      {isVoucherType && (
                        <div className="voucher-box">
                          <div className="voucher-label-row">
                            <span className="voucher-label">🎟️ Gift Voucher Code</span>
                            {availableCodeMatch && (
                              <button
                                type="button"
                                className="stock-autofill-btn"
                                onClick={() => handleUseStockCode(req.id, availableCodeMatch.code)}
                                title="Auto-fill available code from inventory"
                              >
                                ⚡ In Stock: {availableCodeMatch.code.slice(0, 8)}... (Use)
                              </button>
                            )}
                          </div>

                          {currentStatus === "success" && req.voucher_code ? (
                            <div className="voucher-display-pill">
                              <span>{req.voucher_code}</span>
                              <button
                                className="copy-btn"
                                style={{ padding: "4px 8px", fontSize: "11px" }}
                                onClick={() => copyAddress(req.voucher_code, req.id)}
                              >
                                {copiedTarget === req.id ? "✓" : "📋"}
                              </button>
                            </div>
                          ) : (
                            <div className="voucher-input-row">
                              <input
                                type="text"
                                className="form-input"
                                placeholder="Paste or assign voucher code..."
                                value={currentVoucher}
                                onChange={(e) =>
                                  setVoucherInput({
                                    ...voucherInput,
                                    [req.id]: e.target.value
                                  })
                                }
                                style={{ flex: 1, fontFamily: "monospace", fontSize: "13px" }}
                              />
                              <button
                                className="btn-secondary"
                                onClick={() => saveVoucher(req.id)}
                                disabled={!currentVoucher.trim()}
                                style={{ padding: "8px 14px", fontSize: "12px" }}
                              >
                                Save
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Rejection Alert */}
                      {req.reject_reason && (
                        <div className="rejection-banner" style={{ marginTop: "12px" }}>
                          ⚠️ Rejection Audit: {req.reject_reason}
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Status Pill & Action Buttons */}
                    <div className="payout-card-footer">
                      <div>
                        {currentStatus === "success" ? (
                          <span className="status-pill status-pill-active">
                            <span className="status-dot"></span> APPROVED &amp; PAID
                          </span>
                        ) : currentStatus === "failed" || currentStatus === "rejected" ? (
                          <span className="status-pill status-pill-banned">
                            <span className="status-dot"></span> REJECTED
                          </span>
                        ) : (
                          <span className="payout-kpi-pill pill-amber" style={{ fontSize: "12px", padding: "5px 12px" }}>
                            ⏳ PENDING
                          </span>
                        )}
                      </div>

                      <div className="payout-quick-actions">
                        {currentStatus === "pending" && (
                          <>
                            <button
                              className="btn-approve"
                              onClick={() => updateStatus(req.id, "success", req.type)}
                              title="Approve and disburse"
                            >
                              ✓ Approve
                            </button>
                            <button
                              className="btn-reject"
                              onClick={() => {
                                const reason = window.prompt("Enter rejection reason (saved to player record):", "Verification failed / invalid address");
                                if (reason !== null) {
                                  updateStatus(req.id, "failed", req.type, reason);
                                }
                              }}
                              title="Reject request"
                            >
                              ✕ Reject
                            </button>
                          </>
                        )}

                        <select
                          className="status-dropdown"
                          value={currentStatus}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "failed") {
                              const reason = window.prompt("Enter rejection reason (saved to player record):", "Invalid payment address / verification failed");
                              if (reason !== null) {
                                updateStatus(req.id, "failed", req.type, reason);
                              }
                            } else {
                              updateStatus(req.id, val, req.type);
                            }
                          }}
                        >
                          <option value="pending">⏳ Set Pending</option>
                          <option value="success">✅ Set Approved</option>
                          <option value="failed">❌ Set Rejected</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ================= VIEW MODE 2: SPREADSHEET TABLE ================= */
            <div className="payout-table-card">
              <div className="table-responsive">
                <table className="user-table">
                  <thead>
                    <tr>
                      <th>Player &amp; Email</th>
                      <th>Method &amp; Value</th>
                      <th>Payment Target / Voucher</th>
                      <th>Requested Date</th>
                      <th>Status</th>
                      <th>Operations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((req) => {
                      const currentVoucher = voucherInput[req.id] ?? req.voucher_code ?? "";
                      const isVoucherType = req.type !== "upi" && req.type !== "bank";
                      const currentStatus = (req.status || "pending").toLowerCase();

                      return (
                        <tr key={req.id} className="table-row">
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <img
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${req.uid || req.id}`}
                                alt="avatar"
                                className="user-avatar"
                                style={{ width: "38px", height: "38px" }}
                              />
                              <div>
                                <div className="user-name-text">{req.username || "Anonymous Player"}</div>
                                <div className="email-cell" style={{ fontSize: "12px" }}>{req.email || "No Email"}</div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div>
                              <div className={`payout-method-badge ${getMethodBadgeClass(req.type)}`} style={{ marginBottom: "2px" }}>
                                {getMethodIcon(req.type)} {req.type?.toUpperCase()}
                              </div>
                              <div style={{ fontSize: "16px", fontWeight: "900", color: "#00F5A0" }}>
                                ₹{req.amount}
                              </div>
                              <div style={{ fontSize: "11px", color: "#FFB800", fontWeight: "700" }}>
                                🪙 {Number(req.coins || 0).toLocaleString()} coins
                              </div>
                            </div>
                          </td>

                          <td>
                            {!isVoucherType ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <code className="target-address" style={{ fontSize: "12.5px" }}>
                                  {req.withdraw_details || req.payment_address || "N/A"}
                                </code>
                                <button
                                  className="copy-btn"
                                  style={{ padding: "3px 8px", fontSize: "11px" }}
                                  onClick={() => copyAddress(req.withdraw_details || req.payment_address, req.id)}
                                >
                                  {copiedTarget === req.id ? "✓" : "📋"}
                                </button>
                              </div>
                            ) : req.voucher_code ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span className="target-coin-pill" style={{ fontFamily: "monospace", fontSize: "12px" }}>
                                  {req.voucher_code}
                                </span>
                                <button
                                  className="copy-btn"
                                  style={{ padding: "3px 8px", fontSize: "11px" }}
                                  onClick={() => copyAddress(req.voucher_code, req.id)}
                                >
                                  {copiedTarget === req.id ? "✓" : "📋"}
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: "flex", gap: "6px" }}>
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="Paste code..."
                                  value={currentVoucher}
                                  onChange={(e) =>
                                    setVoucherInput({ ...voucherInput, [req.id]: e.target.value })
                                  }
                                  style={{ width: "130px", padding: "5px 8px", fontSize: "12px" }}
                                />
                                <button
                                  className="btn-secondary"
                                  onClick={() => saveVoucher(req.id)}
                                  disabled={!currentVoucher.trim()}
                                  style={{ padding: "4px 8px", fontSize: "11px" }}
                                >
                                  Save
                                </button>
                              </div>
                            )}
                          </td>

                          <td className="date-cell">{formatDate(req.created_at)}</td>

                          <td>
                            {currentStatus === "success" ? (
                              <span className="status-pill status-pill-active">
                                <span className="status-dot"></span> PAID
                              </span>
                            ) : currentStatus === "failed" || currentStatus === "rejected" ? (
                              <span className="status-pill status-pill-banned">
                                <span className="status-dot"></span> REJECTED
                              </span>
                            ) : (
                              <span className="payout-kpi-pill pill-amber">
                                ⏳ PENDING
                              </span>
                            )}
                          </td>

                          <td>
                            <div className="action-btn-group">
                              {currentStatus === "pending" && (
                                <>
                                  <button
                                    className="btn-action-sm btn-unban"
                                    onClick={() => updateStatus(req.id, "success", req.type)}
                                    title="Approve payout"
                                  >
                                    ✓ Approve
                                  </button>
                                  <button
                                    className="btn-action-sm btn-ban"
                                    onClick={() => {
                                      const reason = window.prompt("Enter rejection reason:", "Verification failed");
                                      if (reason !== null) updateStatus(req.id, "failed", req.type, reason);
                                    }}
                                    title="Reject request"
                                  >
                                    ✕ Reject
                                  </button>
                                </>
                              )}
                              <select
                                className="status-dropdown"
                                value={currentStatus}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "failed") {
                                    const reason = window.prompt("Enter rejection reason:", "Verification failed");
                                    if (reason !== null) updateStatus(req.id, "failed", req.type, reason);
                                  } else {
                                    updateStatus(req.id, val, req.type);
                                  }
                                }}
                              >
                                <option value="pending">⏳ Pending</option>
                                <option value="success">✅ Paid</option>
                                <option value="failed">❌ Rejected</option>
                              </select>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================
          TAB 2: CODE INVENTORY MANAGER (GOOGLE PLAY, AMAZON, PHONEPE)
          ======================================================== */}
      {activeTab === "INVENTORY" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "26px" }}>
          {/* STATS OVERVIEW FOR CODE INVENTORY */}
          <div className="payout-stats-grid">
            <div className="payout-kpi-card kpi-green">
              <div className="payout-kpi-icon icon-green">🎟️</div>
              <div className="payout-kpi-content">
                <div className="payout-kpi-val-row">
                  <span className="payout-kpi-val val-green">{totalAvailableCodes}</span>
                  <span className="payout-kpi-pill pill-green">Ready to Disburse</span>
                </div>
                <div className="payout-kpi-label">Available Codes in Stock</div>
              </div>
            </div>

            <div className="payout-kpi-card kpi-indigo">
              <div className="payout-kpi-icon icon-indigo">🔒</div>
              <div className="payout-kpi-content">
                <div className="payout-kpi-val-row">
                  <span className="payout-kpi-val val-indigo">{totalAllocatedCodes}</span>
                  <span className="payout-kpi-pill pill-indigo">Delivered to Players</span>
                </div>
                <div className="payout-kpi-label">Codes Successfully Allocated</div>
              </div>
            </div>

            <div className="payout-kpi-card kpi-amber">
              <div className="payout-kpi-icon icon-amber">⌛</div>
              <div className="payout-kpi-content">
                <div className="payout-kpi-val-row">
                  <span className="payout-kpi-val val-amber">{pendingCodeRequestsCount}</span>
                  <span className="payout-kpi-pill pill-amber">Awaiting Inventory</span>
                </div>
                <div className="payout-kpi-label">Pending Gift Card Demand</div>
              </div>
            </div>
          </div>

          {/* BULK ADD CODE FORM */}
          <div className="bulk-upload-card">
            <div style={{ marginBottom: "18px" }}>
              <h2 style={{ margin: "0 0 6px 0", color: "#FFFFFF", fontSize: "20px", fontWeight: "900" }}>
                📥 Bulk Gift Code Inventory Deposit
              </h2>
              <p style={{ margin: 0, fontSize: "13.5px", color: "#E2E8F0", fontWeight: "600" }}>
                Deposit Google Play, Amazon, or PhonePe codes. Newly deposited codes immediately auto-fulfill matching pending requests in FIFO order!
              </p>
            </div>

            <form onSubmit={handleBulkAddCodes} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                <div>
                  <label className="form-field-label">REDEMPTION METHOD</label>
                  <select
                    className="select-input"
                    value={bulkMethod}
                    onChange={(e) => setBulkMethod(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <option value="GOOGLE_PLAY">🎮 Google Play Gift Code (GOOGLE_PLAY)</option>
                    <option value="AMAZON">🛒 Amazon Gift Card (AMAZON)</option>
                    <option value="PHONEPE">📱 PhonePe Voucher Code (PHONEPE)</option>
                  </select>
                </div>

                <div>
                  <label className="form-field-label">DENOMINATION AMOUNT (₹)</label>
                  <select
                    className="select-input"
                    value={bulkAmount}
                    onChange={(e) => setBulkAmount(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <option value="10">₹10 Voucher</option>
                    <option value="25">₹25 Voucher</option>
                    <option value="35">₹35 Voucher</option>
                    <option value="50">₹50 Voucher</option>
                    <option value="100">₹100 Voucher</option>
                    <option value="200">₹200 Voucher</option>
                    <option value="500">₹500 Voucher</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-field-label">PASTE CODES (ONE CODE PER LINE)</label>
                <textarea
                  className="search-input"
                  rows={5}
                  placeholder={`GP100-ABCD-1234-EFGH\nGP100-WXYZ-5678-IJKL\nGP100-MNOP-9012-QRST`}
                  value={bulkCodesInput}
                  onChange={(e) => setBulkCodesInput(e.target.value)}
                  style={{
                    fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
                    fontSize: "13px",
                    resize: "vertical"
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="submit"
                  className="btn-glow"
                  disabled={isSubmittingBulk || !bulkCodesInput.trim()}
                  style={{ padding: "12px 28px", fontSize: "14px", fontWeight: "800" }}
                >
                  {isSubmittingBulk ? "Processing & Auto-Allocating..." : "🚀 Upload & Auto-Allocate Codes"}
                </button>
              </div>
            </form>
          </div>

          {/* INVENTORY GROUPS BREAKDOWN */}
          <div className="table-card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "14px" }}>
              <div>
                <h3 style={{ margin: "0 0 4px 0", color: "#FFFFFF", fontSize: "18px", fontWeight: "900" }}>
                  📦 Active Stock Batches by Denomination
                </h3>
                <span style={{ fontSize: "12.5px", color: "#E2E8F0", fontWeight: "600" }}>
                  Real-time inventory levels across all gift providers
                </span>
              </div>

              <div className="payout-filter-group">
                {["ALL", "GOOGLE_PLAY", "AMAZON", "PHONEPE"].map((m) => (
                  <button
                    key={m}
                    className={`payout-filter-btn ${inventoryFilterMethod === m ? "active" : ""}`}
                    onClick={() => setInventoryFilterMethod(m)}
                  >
                    {m.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {Object.keys(codeInventoryGroups).length === 0 ? (
              <div style={{ padding: "50px 20px", textAlign: "center", color: "#FFFFFF", fontWeight: "700" }}>
                No voucher codes registered yet. Use the bulk uploader above to deposit codes!
              </div>
            ) : (
              <div className="stock-grid">
                {Object.values(codeInventoryGroups)
                  .filter((group) => inventoryFilterMethod === "ALL" || group.method === inventoryFilterMethod)
                  .map((group) => {
                    return (
                      <div key={`${group.method}_${group.amount}`} className="stock-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                          <div>
                            <span className={`payout-method-badge ${getMethodBadgeClass(group.method)}`} style={{ margin: 0 }}>
                              {getMethodIcon(group.method)} {group.method}
                            </span>
                            <div style={{ fontSize: "24px", fontWeight: "900", color: "#00F5A0", marginTop: "6px" }}>
                              ₹{group.amount}
                            </div>
                          </div>

                          <div style={{ textAlign: "right" }}>
                            <div className="payout-kpi-pill pill-green" style={{ fontSize: "12px", display: "inline-block" }}>
                              {group.available} Available
                            </div>
                            <div style={{ fontSize: "12px", color: "#818CF8", marginTop: "4px", fontWeight: "700" }}>
                              {group.allocated} Delivered
                            </div>
                          </div>
                        </div>

                        <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: "12px 0" }} />

                        <div style={{ maxHeight: "170px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                          {group.codes.slice(0, 15).map((c) => (
                            <div key={c.id} className="stock-code-item">
                              <span style={{ color: "#FFFFFF", fontWeight: "700" }}>{c.code}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span
                                  className={`status-pill ${c.status === "AVAILABLE" ? "status-pill-active" : "status-pill-banned"}`}
                                  style={{ padding: "2px 8px", fontSize: "10px" }}
                                >
                                  {c.status}
                                </span>
                                <button
                                  className="copy-btn"
                                  style={{ padding: "2px 6px", fontSize: "10px" }}
                                  onClick={() => copyAddress(c.code, c.id)}
                                >
                                  {copiedTarget === c.id ? "✓" : "📋"}
                                </button>
                              </div>
                            </div>
                          ))}
                          {group.codes.length > 15 && (
                            <div style={{ fontSize: "11.5px", color: "#E2E8F0", textAlign: "center", marginTop: "6px", fontWeight: "700" }}>
                              + {group.codes.length - 15} more codes in stock
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
        <div style={{ display: "flex", flexDirection: "column", gap: "26px" }}>
          {/* 1. ENABLE / DISABLE PAYOUT METHODS & CONVERSION RATE */}
          <div className="table-card" style={{ padding: "26px" }}>
            <h3 style={{ margin: "0 0 16px 0", color: "#FFFFFF", fontSize: "19px", fontWeight: "900" }}>
              ⚙️ Payout Gateways &amp; Conversion Exchange
            </h3>

            <div className="method-toggle-grid" style={{ marginBottom: "26px" }}>
              {[
                { key: "upiEnabled", label: "UPI Instant Payout", icon: "🇮🇳" },
                { key: "bankEnabled", label: "Direct Bank Transfer", icon: "🏦" },
                { key: "googleEnabled", label: "Google Play Gift Code", icon: "🎮" },
                { key: "amazonEnabled", label: "Amazon Gift Voucher", icon: "🛒" },
                { key: "phonepeEnabled", label: "PhonePe Voucher", icon: "📱" }
              ].map((m) => (
                <div
                  key={m.key}
                  className={`method-toggle-card ${config[m.key] ? "method-card-active" : "method-card-disabled"}`}
                >
                  <div>
                    <div style={{ fontSize: "20px" }}>{m.icon}</div>
                    <div style={{ color: "#FFFFFF", fontWeight: "800", fontSize: "14.5px", marginTop: "4px" }}>
                      {m.label}
                    </div>
                    <div style={{ fontSize: "11px", fontWeight: "800", color: config[m.key] ? "#00F5A0" : "#FF4B72", marginTop: "2px" }}>
                      {config[m.key] ? "● ACTIVE in App" : "○ DISABLED"}
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleMethod(m.key)}
                    className={config[m.key] ? "btn-danger" : "btn-success"}
                    style={{ padding: "8px 14px", fontSize: "12px", fontWeight: "800" }}
                  >
                    {config[m.key] ? "Disable" : "Enable"}
                  </button>
                </div>
              ))}
            </div>

            {/* CONVERSION RATE INPUT */}
            <div className="conversion-box">
              <div>
                <label style={{ color: "#FFFFFF", fontWeight: "900", fontSize: "16px", display: "block" }}>
                  💰 Global Game Coin Exchange Ratio
                </label>
                <span style={{ fontSize: "12.5px", color: "#E2E8F0", fontWeight: "600" }}>
                  Calibrate the platform economy: how many reward coins yield ₹1 Indian Rupee in withdrawal value.
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <input
                  type="number"
                  className="search-input"
                  value={config.conversionRate || 100}
                  onChange={(e) => setConfig({ ...config, conversionRate: Number(e.target.value) })}
                  style={{ width: "120px", textAlign: "center", fontWeight: "800", fontSize: "17px", color: "#FFB800" }}
                />
                <span style={{ color: "#FFFFFF", fontWeight: "800", fontSize: "14px" }}>Coins = ₹1 INR</span>

                <button
                  onClick={() => saveRewardConfig()}
                  disabled={savingConfig}
                  className="btn-glow"
                  style={{ padding: "10px 20px", fontSize: "13px" }}
                >
                  {savingConfig ? "Saving Ratio..." : "Save Exchange Rate"}
                </button>
              </div>
            </div>
          </div>

          {/* 2. ADD NEW REWARD TIER FORM */}
          <div className="table-card" style={{ padding: "26px" }}>
            <h3 style={{ margin: "0 0 16px 0", color: "#FFFFFF", fontSize: "19px", fontWeight: "900" }}>
              ➕ Mint New Player Withdrawal Tier
            </h3>

            <form onSubmit={handleAddTier} style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ minWidth: "200px" }}>
                <label className="form-field-label">WITHDRAWAL METHOD</label>
                <select
                  className="select-input"
                  value={newTier.type}
                  onChange={(e) => setNewTier({ ...newTier, type: e.target.value })}
                  style={{ width: "100%" }}
                >
                  <option value="upi">🇮🇳 UPI Direct Payout</option>
                  <option value="bank">🏦 Bank Transfer</option>
                  <option value="google">🎮 Google Play Voucher</option>
                  <option value="amazon">🛒 Amazon Gift Card</option>
                  <option value="phonepe">📱 PhonePe Voucher</option>
                </select>
              </div>

              <div style={{ minWidth: "160px" }}>
                <label className="form-field-label">COINS REQUIRED</label>
                <input
                  type="number"
                  className="search-input"
                  placeholder="e.g. 1000"
                  value={newTier.coins}
                  onChange={(e) => setNewTier({ ...newTier, coins: e.target.value })}
                  style={{ width: "100%" }}
                  required
                />
              </div>

              <div style={{ minWidth: "160px" }}>
                <label className="form-field-label">RUPEE VALUE (₹)</label>
                <input
                  type="number"
                  className="search-input"
                  placeholder="e.g. 10"
                  value={newTier.amount}
                  onChange={(e) => setNewTier({ ...newTier, amount: e.target.value })}
                  style={{ width: "100%" }}
                  required
                />
              </div>

              <button type="submit" className="btn-glow" style={{ padding: "11px 24px", fontSize: "13px" }}>
                Add Reward Option →
              </button>
            </form>
          </div>

          {/* 3. DYNAMIC REWARD TIERS LIST */}
          <div className="table-card" style={{ padding: "26px" }}>
            <div style={{ marginBottom: "18px" }}>
              <h3 style={{ margin: "0 0 4px 0", color: "#FFFFFF", fontSize: "19px", fontWeight: "900" }}>
                📜 Active In-App Redemption Card Options ({config.tiers.length})
              </h3>
              <span style={{ fontSize: "12.5px", color: "#E2E8F0", fontWeight: "600" }}>
                Tiers rendered directly in the Android DailyKash / RGamer redemption screen
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
              {config.tiers.map((t) => (
                <div
                  key={t.id}
                  className="stock-card"
                  style={{
                    borderLeft: `4px solid ${t.enabled ? "#00F5A0" : "#FF4B72"}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <span className={`payout-method-badge ${getMethodBadgeClass(t.type)}`} style={{ margin: 0 }}>
                      {getMethodIcon(t.type)} {t.type?.toUpperCase()}
                    </span>
                    <div style={{ fontSize: "22px", fontWeight: "900", color: "#00F5A0", marginTop: "6px" }}>
                      ₹{t.amount}
                    </div>
                    <div style={{ fontSize: "12px", color: "#FFB800", fontWeight: "800", marginTop: "2px" }}>
                      🪙 {Number(t.coins).toLocaleString()} coins
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <button
                      onClick={() => handleToggleTier(t.id)}
                      className={t.enabled ? "btn-unban" : "btn-ban"}
                      style={{ padding: "5px 12px", fontSize: "11px" }}
                    >
                      {t.enabled ? "Active" : "Disabled"}
                    </button>

                    <button
                      onClick={() => handleDeleteTier(t.id)}
                      className="btn-danger"
                      style={{ padding: "5px 12px", fontSize: "11px", justifyContent: "center" }}
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
