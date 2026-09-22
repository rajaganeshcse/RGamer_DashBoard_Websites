import React, { useState, useEffect } from "react";
import "./ShareEarnManager.css";
import { db } from "../Firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  getDocs
} from "firebase/firestore";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "https://app-backend-lutn.onrender.com";

const ShareEarnManager = () => {
  const [activeTab, setActiveTab] = useState("offers"); // offers, add, clicks, conversions, reports, audit
  const [offers, setOffers] = useState([]);
  const [clicks, setClicks] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [reports, setReports] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedConversion, setSelectedConversion] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    category: "Demat Account",
    logoUrl: "",
    bannerUrl: "",
    shortDescription: "",
    description: "",
    destinationUrl: "",
    conversionEvent: "ACCOUNT_COMPLETED",
    rewardCoins: 2800,
    howItWorks: "1. Share/Open the offer\n2. User visits destination\n3. Complete registration\n4. Complete required action\n5. Conversion is verified\n6. Coins are credited",
    termsAndConditions: "• Offer valid once per user\n• Must complete full verification\n• Duplicate accounts strictly prohibited",
    priority: 1,
    status: "ACTIVE",
    startDate: "",
    endDate: "",
    offerType: "AFFILIATE",
    referralCode: "",
    proofRequired: false,
    proofLabel: "Enter your registered mobile number or UPI reference ID"
  });

  // Realtime Firestore listeners for Offers, Clicks, Conversions, Audit Logs
  useEffect(() => {
    setLoading(true);

    // Offers listener
    const qOffers = query(collection(db, "offers"));
    const unsubOffers = onSnapshot(qOffers, (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        offerId: docSnap.id,
        ...docSnap.data()
      }));
      list.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      setOffers(list);
      setLoading(false);
    }, (err) => {
      console.error("Firestore offers listener error, falling back to REST:", err);
      fetchOffersREST();
    });

    // Clicks listener
    const qClicks = query(collection(db, "tracking_clicks"));
    const unsubClicks = onSnapshot(qClicks, (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        clickId: docSnap.id,
        ...docSnap.data()
      }));
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setClicks(list);
    });

    // Conversions listener
    const qConversions = query(collection(db, "conversions"));
    const unsubConversions = onSnapshot(qConversions, (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        conversionId: docSnap.id,
        ...docSnap.data()
      }));
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setConversions(list);
    });

    // Audit logs listener
    const qAudit = query(collection(db, "share_earn_audit_logs"));
    const unsubAudit = onSnapshot(qAudit, (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        auditId: docSnap.id,
        ...docSnap.data()
      }));
      list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setAuditLogs(list);
    });

    return () => {
      unsubOffers();
      unsubClicks();
      unsubConversions();
      unsubAudit();
    };
  }, []);

  // Compute reports from realtime data
  useEffect(() => {
    const totalOffers = offers.length;
    const totalClicks = clicks.length;
    const totalConversions = conversions.length;

    let pendingConversions = 0;
    let approvedConversions = 0;
    let rejectedConversions = 0;
    let reversedConversions = 0;

    for (let conv of conversions) {
      const st = (conv.status || "").toUpperCase();
      if (st === "APPROVED") approvedConversions++;
      else if (st === "PENDING") pendingConversions++;
      else if (st === "REJECTED") rejectedConversions++;
      else if (st === "REVERSED") reversedConversions++;
    }

    let totalRewardedCoins = 0;
    for (let conv of conversions) {
      if ((conv.status || "").toUpperCase() === "APPROVED") {
        totalRewardedCoins += Number(conv.rewardCoins || 0);
      }
    }

    const conversionRate = totalClicks > 0 ? ((approvedConversions / totalClicks) * 100).toFixed(2) : 0;

    setReports({
      totalOffers,
      totalClicks,
      totalConversions,
      approvedConversions,
      pendingConversions,
      rejectedConversions,
      reversedConversions,
      totalRewardedCoins,
      conversionRate
    });
  }, [offers, clicks, conversions]);

  const fetchOffersREST = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/offers`);
      const data = await res.json();
      if (data.success) setOffers(data.data || []);
    } catch (err) {
      console.error("REST fetch offers failed:", err);
    }
  };

  const handleToggleStatus = async (offerId, currentStatus) => {
    const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      // 1. Direct Firestore update
      await updateDoc(doc(db, "offers", offerId), {
        status: nextStatus,
        updatedAt: Date.now()
      });

      // Audit Log
      await addDoc(collection(db, "share_earn_audit_logs"), {
        actorId: "ADMIN",
        actorRole: "ADMIN",
        action: "UPDATE_OFFER_STATUS",
        entityType: "OFFER",
        entityId: offerId,
        oldValue: currentStatus,
        newValue: nextStatus,
        timestamp: Date.now()
      });

      // 2. Also notify Backend API
      fetch(`${API_BASE_URL}/api/v1/admin/offers/${offerId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      }).catch(() => {});

    } catch (err) {
      alert("Failed to toggle offer status: " + err.message);
    }
  };

  const handleSaveOffer = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.rewardCoins || !formData.destinationUrl) {
      alert("Please fill all required fields: Offer Name, Reward Coins, Destination URL");
      return;
    }

    const rewardCoinsNum = Number(formData.rewardCoins);
    const priorityNum = Number(formData.priority);

    const howItWorksList = typeof formData.howItWorks === "string" 
      ? formData.howItWorks.split("\n").map(s => s.trim()).filter(Boolean)
      : formData.howItWorks;

    const termsList = typeof formData.termsAndConditions === "string" 
      ? formData.termsAndConditions.split("\n").map(s => s.trim()).filter(Boolean)
      : formData.termsAndConditions;

    const offerId = editingOffer 
      ? editingOffer.offerId 
      : "OFFER_" + Math.random().toString(36).substring(2, 10).toUpperCase();

    const payload = {
      offerId,
      title: formData.title.trim(),
      category: formData.category,
      logoUrl: formData.logoUrl.trim(),
      bannerUrl: formData.bannerUrl.trim(),
      shortDescription: formData.shortDescription.trim(),
      description: formData.description.trim(),
      destinationUrl: formData.destinationUrl.trim(),
      conversionEvent: formData.conversionEvent.trim() || "ACCOUNT_COMPLETED",
      rewardCoins: rewardCoinsNum,
      howItWorks: howItWorksList,
      termsAndConditions: termsList,
      priority: priorityNum,
      status: formData.status || "ACTIVE",
      startDate: formData.startDate ? new Date(formData.startDate).getTime() : null,
      endDate: formData.endDate ? new Date(formData.endDate).getTime() : null,
      offerType: formData.offerType || "AFFILIATE",
      referralCode: formData.referralCode ? formData.referralCode.trim() : "",
      proofRequired: !!formData.proofRequired,
      proofLabel: formData.proofLabel ? formData.proofLabel.trim() : "Enter your registered mobile number or UPI reference ID",
      updatedAt: Date.now()
    };

    if (!editingOffer) {
      payload.createdAt = Date.now();
    }

    try {
      // 1. Direct Firestore Save (Guarantees Instant Realtime Sync)
      await setDoc(doc(db, "offers", offerId), payload, { merge: true });

      // Audit Log Entry
      await addDoc(collection(db, "share_earn_audit_logs"), {
        actorId: "ADMIN",
        actorRole: "ADMIN",
        action: editingOffer ? "UPDATE_OFFER" : "CREATE_OFFER",
        entityType: "OFFER",
        entityId: offerId,
        oldValue: editingOffer ? editingOffer.title : null,
        newValue: `${payload.title} (${payload.rewardCoins} coins)`,
        timestamp: Date.now()
      });

      // 2. Also Sync via Spring Boot Backend REST API
      const url = editingOffer 
        ? `${API_BASE_URL}/api/v1/admin/offers/${editingOffer.offerId}`
        : `${API_BASE_URL}/api/v1/admin/offers`;
      const method = editingOffer ? "PUT" : "POST";

      fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch((err) => console.log("Backend REST sync warning:", err));

      alert(editingOffer ? "Offer Updated Successfully!" : "Offer Created Successfully!");
      setEditingOffer(null);
      resetForm();
      setActiveTab("offers");

    } catch (err) {
      console.error("Error saving offer:", err);
      alert("Failed to save offer: " + err.message);
    }
  };

  const handleEditClick = (offer) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title || "",
      category: offer.category || "Demat Account",
      logoUrl: offer.logoUrl || "",
      bannerUrl: offer.bannerUrl || "",
      shortDescription: offer.shortDescription || "",
      description: offer.description || "",
      destinationUrl: offer.destinationUrl || "",
      conversionEvent: offer.conversionEvent || "ACCOUNT_COMPLETED",
      rewardCoins: offer.rewardCoins || 2800,
      howItWorks: Array.isArray(offer.howItWorks) ? offer.howItWorks.join("\n") : (offer.howItWorks || ""),
      termsAndConditions: Array.isArray(offer.termsAndConditions) ? offer.termsAndConditions.join("\n") : (offer.termsAndConditions || ""),
      priority: offer.priority || 1,
      status: offer.status || "ACTIVE",
      startDate: offer.startDate ? new Date(offer.startDate).toISOString().slice(0, 16) : "",
      endDate: offer.endDate ? new Date(offer.endDate).toISOString().slice(0, 16) : "",
      offerType: offer.offerType || "AFFILIATE",
      referralCode: offer.referralCode || "",
      proofRequired: !!offer.proofRequired,
      proofLabel: offer.proofLabel || "Enter your registered mobile number or UPI reference ID"
    });
    setActiveTab("add");
  };

  const resetForm = () => {
    setFormData({
      title: "",
      category: "Demat Account",
      logoUrl: "",
      bannerUrl: "",
      shortDescription: "",
      description: "",
      destinationUrl: "",
      conversionEvent: "ACCOUNT_COMPLETED",
      rewardCoins: 2800,
      howItWorks: "1. Share/Open the offer\n2. User visits destination\n3. Complete registration\n4. Complete required action\n5. Conversion is verified\n6. Coins are credited",
      termsAndConditions: "• Offer valid once per user\n• Must complete full verification\n• Duplicate accounts strictly prohibited",
      priority: 1,
      status: "ACTIVE",
      startDate: "",
      endDate: "",
      offerType: "AFFILIATE",
      referralCode: "",
      proofRequired: false,
      proofLabel: "Enter your registered mobile number or UPI reference ID"
    });
  };

  const handleConversionAction = async (conversionId, action, reason = "") => {
    if (action === "REVERSE" && !window.confirm("Are you sure you want to REVERSE this conversion? This will deduct coins from the user's wallet!")) {
      return;
    }

    try {
      // Call Backend REST API for server-side coin transaction processing
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/conversions/${conversionId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Conversion ${action.toLowerCase()}ed successfully!`);
        setShowRejectModal(false);
        setRejectReason("");
        setSelectedConversion(null);
      } else {
        alert(data.error?.message || `Failed to ${action} conversion`);
      }
    } catch (err) {
      alert("Server connection failed");
    }
  };

  const filteredConversions = conversions.filter((c) => {
    if (statusFilter === "ALL") return true;
    return (c.status || "").toUpperCase() === statusFilter;
  });

  return (
    <div className="share-earn-admin-container">
      {/* HEADER */}
      <div className="share-earn-header">
        <div>
          <h2>🚀 Share & Earn Management</h2>
          <p>Manage first-party offer campaigns, tracking links, server conversions & coin rewards</p>
        </div>
        <button className="btn-primary-add" onClick={() => { setEditingOffer(null); resetForm(); setActiveTab("add"); }}>
          + Add New Offer
        </button>
      </div>

      {/* METRIC SUMMARY CARDS */}
      {reports && (
        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-icon">🎁</span>
            <div>
              <div className="metric-val">{reports.totalOffers || 0}</div>
              <div className="metric-lbl">Total Offers</div>
            </div>
          </div>
          <div className="metric-card">
            <span className="metric-icon">🖱️</span>
            <div>
              <div className="metric-val">{reports.totalClicks || 0}</div>
              <div className="metric-lbl">Total Clicks</div>
            </div>
          </div>
          <div className="metric-card">
            <span className="metric-icon">✅</span>
            <div>
              <div className="metric-val">{reports.approvedConversions || 0}</div>
              <div className="metric-lbl">Approved Conversions</div>
            </div>
          </div>
          <div className="metric-card">
            <span className="metric-icon">🪙</span>
            <div>
              <div className="metric-val">{(reports.totalRewardedCoins || 0).toLocaleString()}</div>
              <div className="metric-lbl">Total Coins Rewarded</div>
            </div>
          </div>
          <div className="metric-card">
            <span className="metric-icon">⏳</span>
            <div>
              <div className="metric-val">{reports.pendingConversions || 0}</div>
              <div className="metric-lbl">Pending Conversions</div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-NAVIGATION TABS */}
      <div className="tab-bar">
        <button className={activeTab === "offers" ? "tab active" : "tab"} onClick={() => setActiveTab("offers")}>
          Offers ({offers.length})
        </button>
        <button className={activeTab === "add" ? "tab active" : "tab"} onClick={() => setActiveTab("add")}>
          {editingOffer ? "Edit Offer" : "Create Offer"}
        </button>
        <button className={activeTab === "clicks" ? "tab active" : "tab"} onClick={() => setActiveTab("clicks")}>
          Tracking Clicks ({clicks.length})
        </button>
        <button className={activeTab === "conversions" ? "tab active" : "tab"} onClick={() => setActiveTab("conversions")}>
          Conversions Manager ({conversions.length})
        </button>
        <button className={activeTab === "reports" ? "tab active" : "tab"} onClick={() => setActiveTab("reports")}>
          Reports & Performance
        </button>
        <button className={activeTab === "audit" ? "tab active" : "tab"} onClick={() => setActiveTab("audit")}>
          Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* CONTENT AREA */}
      <div className="tab-content">
        {loading ? (
          <div className="loading-spinner">Loading Share & Earn data...</div>
        ) : (
          <>
            {/* 1. OFFERS MANAGEMENT TABLE */}
            {activeTab === "offers" && (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Logo</th>
                      <th>Offer Name</th>
                      <th>Category</th>
                      <th>Reward Coins</th>
                      <th>Conversion Event</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offers.length === 0 ? (
                      <tr><td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>No offers created yet. Click "+ Add New Offer" to create one.</td></tr>
                    ) : (
                      offers.map((offer) => (
                        <tr key={offer.offerId}>
                          <td>
                            <img src={offer.logoUrl || "https://placehold.co/40x40?text=LOGO"} alt="Logo" className="offer-logo-thumbnail" />
                          </td>
                          <td>
                            <strong>{offer.title}</strong>
                            <div className="text-sub">{offer.shortDescription}</div>
                          </td>
                          <td><span className="chip-cat">{offer.category}</span></td>
                          <td><strong className="coin-val">+{Number(offer.rewardCoins || 0).toLocaleString()} Coins</strong></td>
                          <td><code>{offer.conversionEvent}</code></td>
                          <td>
                            <span className={`status-pill ${(offer.status || "ACTIVE") === "ACTIVE" ? "active" : "inactive"}`}>
                              {offer.status || "ACTIVE"}
                            </span>
                          </td>
                          <td>
                            <button className="btn-action edit" onClick={() => handleEditClick(offer)}>Edit</button>
                            <button className={`btn-action toggle ${offer.status === "ACTIVE" ? "deactivate" : "activate"}`} onClick={() => handleToggleStatus(offer.offerId, offer.status)}>
                              {offer.status === "ACTIVE" ? "Deactivate" : "Activate"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 2. CREATE / EDIT OFFER FORM */}
            {activeTab === "add" && (
              <form className="offer-form" onSubmit={handleSaveOffer}>
                <h3>{editingOffer ? `Edit Offer (${editingOffer.offerId})` : "Create New Offer"}</h3>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label>Offer / Campaign Type *</label>
                    <select
                      value={formData.offerType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({
                          ...formData,
                          offerType: val,
                          proofRequired: val === "REFERRAL_TASK" ? true : formData.proofRequired
                        });
                      }}
                    >
                      <option value="AFFILIATE">Affiliate Postback / Webhook (Upstox, AngelOne, Demat)</option>
                      <option value="REFERRAL_TASK">Personal Referral Task (Admin's GPay, PhonePe, Navi, Amazon)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Offer Name *</label>
                    <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Google Pay" required />
                  </div>

                  <div className="form-group">
                    <label>Category *</label>
                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                      <option value="Demat Account">Demat Account</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Personal Loan">Personal Loan</option>
                      <option value="UPI">UPI</option>
                      <option value="Shopping">Shopping</option>
                      <option value="Apps">Apps</option>
                      <option value="Games">Games</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Reward Coins (Admin Controlled) *</label>
                    <input type="number" value={formData.rewardCoins} onChange={(e) => setFormData({ ...formData, rewardCoins: e.target.value })} placeholder="e.g. 2800" required />
                  </div>

                  <div className="form-group">
                    <label>Conversion Event *</label>
                    <input type="text" value={formData.conversionEvent} onChange={(e) => setFormData({ ...formData, conversionEvent: e.target.value })} placeholder="e.g. ACCOUNT_COMPLETED" required />
                  </div>

                  <div className="form-group full">
                    <label>Destination / Invite URL (Admin's Own Link or Partner Link) *</label>
                    <input type="url" value={formData.destinationUrl} onChange={(e) => setFormData({ ...formData, destinationUrl: e.target.value })} placeholder="https://g.co/payinvite/xyz123 or https://upstox.com/open-demat..." required />
                  </div>

                  {/* Personal Referral Task Options */}
                  <div className="form-group">
                    <label>Admin Referral / Invite Code (Optional)</label>
                    <input
                      type="text"
                      value={formData.referralCode}
                      onChange={(e) => setFormData({ ...formData, referralCode: e.target.value })}
                      placeholder="e.g. gpay999 or NAVI123"
                    />
                    <small style={{ color: "#64748b", display: "block", marginTop: "4px" }}>
                      Users can tap to copy this code directly inside the Android app
                    </small>
                  </div>

                  <div className="form-group">
                    <label>Require User Proof Submission?</label>
                    <select
                      value={formData.proofRequired ? "YES" : "NO"}
                      onChange={(e) => setFormData({ ...formData, proofRequired: e.target.value === "YES" })}
                    >
                      <option value="YES">Yes - User must submit proof (UPI Ref / Phone) for Admin Approval</option>
                      <option value="NO">No - Automatic postback conversion</option>
                    </select>
                  </div>

                  {formData.proofRequired && (
                    <div className="form-group full">
                      <label>Proof Instruction / Prompt for User</label>
                      <input
                        type="text"
                        value={formData.proofLabel}
                        onChange={(e) => setFormData({ ...formData, proofLabel: e.target.value })}
                        placeholder="e.g. Enter your Google Pay registered phone number or UPI reference ID"
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label>Logo Image URL</label>
                    <input type="url" value={formData.logoUrl} onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })} placeholder="https://..." />
                  </div>

                  <div className="form-group">
                    <label>Banner Image URL</label>
                    <input type="url" value={formData.bannerUrl} onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })} placeholder="https://..." />
                  </div>

                  <div className="form-group full">
                    <label>Short Description</label>
                    <input type="text" value={formData.shortDescription} onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })} placeholder="e.g. Send 1st payment on GPay and get 3000 Coins" />
                  </div>

                  <div className="form-group full">
                    <label>Full Description</label>
                    <textarea rows="3" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Detailed offer explanation..."></textarea>
                  </div>

                  <div className="form-group full">
                    <label>How It Works (One step per line)</label>
                    <textarea rows="4" value={formData.howItWorks} onChange={(e) => setFormData({ ...formData, howItWorks: e.target.value })}></textarea>
                  </div>

                  <div className="form-group full">
                    <label>Terms & Conditions (One item per line)</label>
                    <textarea rows="4" value={formData.termsAndConditions} onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}></textarea>
                  </div>

                  <div className="form-group">
                    <label>Priority Order</label>
                    <input type="number" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} />
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-cancel" onClick={() => setActiveTab("offers")}>Cancel</button>
                  <button type="submit" className="btn-submit">Save Offer</button>
                </div>
              </form>
            )}

            {/* 3. TRACKING CLICKS LOG */}
            {activeTab === "clicks" && (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Click ID</th>
                      <th>User ID</th>
                      <th>Offer ID</th>
                      <th>User Type</th>
                      <th>IP &amp; Device</th>
                      <th>Clicked At</th>
                      <th>Redirected At</th>
                      <th>Status</th>
                      <th>Conversion ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clicks.length === 0 ? (
                      <tr><td colSpan="9" style={{ textAlign: "center", padding: "20px" }}>No click logs recorded yet.</td></tr>
                    ) : (
                      clicks.map((clk) => (
                        <tr key={clk.clickId}>
                          <td><code>{clk.clickId}</code></td>
                          <td>{clk.userId}</td>
                          <td>{clk.offerId}</td>
                          <td>
                            {clk.isNewUser !== false ? (
                              <span className="badge-new-user">🟢 NEW USER</span>
                            ) : (
                              <span className="badge-repeat-user">🟠 REPEAT ({clk.clickCount || 2}+)</span>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{clk.ipAddress || "N/A"}</div>
                            {clk.deviceInfo && (
                              <div className="text-sub" style={{ fontSize: "11px", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={clk.deviceInfo}>
                                {clk.deviceInfo}
                              </div>
                            )}
                          </td>
                          <td>{clk.createdAt ? new Date(clk.createdAt).toLocaleString() : "-"}</td>
                          <td>{clk.redirectedAt ? new Date(clk.redirectedAt).toLocaleString() : "-"}</td>
                          <td><span className={`status-badge ${clk.status}`}>{clk.status}</span></td>
                          <td>{clk.conversionId || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. CONVERSIONS MANAGER */}
            {activeTab === "conversions" && (
              <div>
                <div className="filter-tabs">
                  {["ALL", "PENDING", "APPROVED", "REJECTED", "REVERSED"].map((st) => (
                    <button key={st} className={statusFilter === st ? "filter-tab active" : "filter-tab"} onClick={() => setStatusFilter(st)}>
                      {st}
                    </button>
                  ))}
                </div>

                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Conversion ID</th>
                        <th>Click ID</th>
                        <th>User ID</th>
                        <th>Offer ID</th>
                        <th>Submitted Proof / Code</th>
                        <th>Reward Coins</th>
                        <th>Status</th>
                        <th>Created Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredConversions.length === 0 ? (
                        <tr><td colSpan="9" style={{ textAlign: "center", padding: "20px" }}>No conversions found matching "{statusFilter}".</td></tr>
                      ) : (
                        filteredConversions.map((conv) => (
                          <tr key={conv.conversionId}>
                            <td><code>{conv.conversionId}</code></td>
                            <td><code>{conv.clickId}</code></td>
                            <td>{conv.userId}</td>
                            <td>{conv.offerId}</td>
                            <td>
                              {conv.proofText || conv.externalReference ? (
                                <div className="proof-box">
                                  <div className="proof-text">{conv.proofText || conv.externalReference}</div>
                                  {conv.referralCodeUsed && (
                                    <div className="text-sub">Ref Code: <strong>{conv.referralCodeUsed}</strong></div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sub">-</span>
                              )}
                            </td>
                            <td><strong className="coin-val">+{Number(conv.rewardCoins || 0).toLocaleString()} Coins</strong></td>
                            <td><span className={`status-badge ${conv.status}`}>{conv.status}</span></td>
                            <td>{conv.createdAt ? new Date(conv.createdAt).toLocaleString() : "-"}</td>
                            <td>
                              {conv.status === "PENDING" && (
                                <div style={{ display: "flex", gap: "6px" }}>
                                  <button className="btn-approve" onClick={() => handleConversionAction(conv.conversionId, "APPROVE")}>Approve</button>
                                  <button className="btn-reject" onClick={() => { setSelectedConversion(conv); setShowRejectModal(true); }}>Reject</button>
                                </div>
                              )}
                              {conv.status === "APPROVED" && (
                                <button className="btn-reverse" onClick={() => handleConversionAction(conv.conversionId, "REVERSE")}>Reverse</button>
                              )}
                              {conv.status !== "PENDING" && conv.status !== "APPROVED" && <span>-</span>}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. REPORTS */}
            {activeTab === "reports" && reports && (
              <div className="reports-container">
                <h3>📊 Performance Metrics & Report</h3>
                <div className="reports-grid">
                  <div className="report-box">
                    <h4>Conversion Rate</h4>
                    <div className="big-stat">{reports.conversionRate}%</div>
                    <p>Ratio of total approved conversions to tracking clicks</p>
                  </div>
                  <div className="report-box">
                    <h4>Total Coins Rewarded</h4>
                    <div className="big-stat">{(reports.totalRewardedCoins || 0).toLocaleString()}</div>
                    <p>Total coins credited to existing user balances</p>
                  </div>
                  <div className="report-box">
                    <h4>Reversals Count</h4>
                    <div className="big-stat">{reports.reversedConversions || 0}</div>
                    <p>Total conversions reversed by admin</p>
                  </div>
                </div>
              </div>
            )}

            {/* 6. AUDIT TRAIL */}
            {activeTab === "audit" && (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Audit ID</th>
                      <th>Actor</th>
                      <th>Action</th>
                      <th>Entity Type</th>
                      <th>Entity ID</th>
                      <th>Timestamp</th>
                      <th>New Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 ? (
                      <tr><td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>No audit log entries recorded.</td></tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.auditId}>
                          <td><code>{log.auditId}</code></td>
                          <td>{log.actorRole} ({log.actorId})</td>
                          <td><strong>{log.action}</strong></td>
                          <td>{log.entityType}</td>
                          <td><code>{log.entityId}</code></td>
                          <td>{log.timestamp ? new Date(log.timestamp).toLocaleString() : "-"}</td>
                          <td>{log.newValue}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* REJECT MODAL */}
      {showRejectModal && selectedConversion && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h4>Reject Conversion ({selectedConversion.conversionId})</h4>
            <p>Please enter a rejection reason for user audit history:</p>
            <textarea rows="3" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Duplicate conversion signal from advertiser"></textarea>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button className="btn-reject" onClick={() => handleConversionAction(selectedConversion.conversionId, "REJECT", rejectReason)}>Confirm Rejection</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShareEarnManager;
