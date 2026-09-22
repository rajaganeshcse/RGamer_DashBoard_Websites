import React, { useState, useEffect } from "react";
import "./ShareEarnManager.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

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
    endDate: ""
  });

  useEffect(() => {
    fetchOffers();
    fetchReports();
  }, []);

  useEffect(() => {
    if (activeTab === "offers") fetchOffers();
    if (activeTab === "clicks") fetchClicks();
    if (activeTab === "conversions") fetchConversions(statusFilter);
    if (activeTab === "reports") fetchReports();
    if (activeTab === "audit") fetchAuditLogs();
  }, [activeTab, statusFilter]);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/offers`);
      const data = await res.json();
      if (data.success) setOffers(data.data || []);
    } catch (err) {
      console.error("Error fetching offers:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClicks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/clicks?limit=200`);
      const data = await res.json();
      if (data.success) setClicks(data.data || []);
    } catch (err) {
      console.error("Error fetching clicks:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversions = async (filter) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/conversions?status=${filter}`);
      const data = await res.json();
      if (data.success) setConversions(data.data || []);
    } catch (err) {
      console.error("Error fetching conversions:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/reports`);
      const data = await res.json();
      if (data.success) setReports(data.data);
    } catch (err) {
      console.error("Error fetching reports:", err);
    }
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/audit-logs`);
      const data = await res.json();
      if (data.success) setAuditLogs(data.data || []);
    } catch (err) {
      console.error("Error fetching audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (offerId, currentStatus) => {
    const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/offers/${offerId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        fetchOffers();
        fetchReports();
      } else {
        alert(data.error?.message || "Failed to toggle status");
      }
    } catch (err) {
      alert("Error connecting to server");
    }
  };

  const handleSaveOffer = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.rewardCoins || !formData.destinationUrl) {
      alert("Please fill all required fields: Offer Name, Reward Coins, Destination URL");
      return;
    }

    const payload = {
      ...formData,
      rewardCoins: Number(formData.rewardCoins),
      priority: Number(formData.priority),
      howItWorks: typeof formData.howItWorks === "string" ? formData.howItWorks.split("\n").filter(Boolean) : formData.howItWorks,
      termsAndConditions: typeof formData.termsAndConditions === "string" ? formData.termsAndConditions.split("\n").filter(Boolean) : formData.termsAndConditions,
      startDate: formData.startDate ? new Date(formData.startDate).getTime() : null,
      endDate: formData.endDate ? new Date(formData.endDate).getTime() : null
    };

    try {
      const url = editingOffer 
        ? `${API_BASE_URL}/api/v1/admin/offers/${editingOffer.offerId}`
        : `${API_BASE_URL}/api/v1/admin/offers`;
      
      const method = editingOffer ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert(editingOffer ? "Offer Updated Successfully!" : "Offer Created Successfully!");
        setEditingOffer(null);
        resetForm();
        setActiveTab("offers");
        fetchOffers();
        fetchReports();
      } else {
        alert(data.error?.message || "Failed to save offer");
      }
    } catch (err) {
      alert("Error saving offer");
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
      endDate: offer.endDate ? new Date(offer.endDate).toISOString().slice(0, 16) : ""
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
      endDate: ""
    });
  };

  const handleConversionAction = async (conversionId, action, reason = "") => {
    if (action === "REVERSE" && !window.confirm("Are you sure you want to REVERSE this conversion? This will deduct coins from the user's wallet!")) {
      return;
    }

    try {
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
        fetchConversions(statusFilter);
        fetchReports();
      } else {
        alert(data.error?.message || `Failed to ${action} conversion`);
      }
    } catch (err) {
      alert("Server connection failed");
    }
  };

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
          Tracking Clicks
        </button>
        <button className={activeTab === "conversions" ? "tab active" : "tab"} onClick={() => setActiveTab("conversions")}>
          Conversions Manager
        </button>
        <button className={activeTab === "reports" ? "tab active" : "tab"} onClick={() => setActiveTab("reports")}>
          Reports & Performance
        </button>
        <button className={activeTab === "audit" ? "tab active" : "tab"} onClick={() => setActiveTab("audit")}>
          Audit Trail
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
                          <td><strong className="coin-val">+{offer.rewardCoins?.toLocaleString()} Coins</strong></td>
                          <td><code>{offer.conversionEvent}</code></td>
                          <td>
                            <span className={`status-pill ${offer.status === "ACTIVE" ? "active" : "inactive"}`}>
                              {offer.status}
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
                    <label>Offer Name *</label>
                    <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Upstox" required />
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
                    <label>Destination URL (Trusted Partner Target) *</label>
                    <input type="url" value={formData.destinationUrl} onChange={(e) => setFormData({ ...formData, destinationUrl: e.target.value })} placeholder="https://upstox.com/open-demat..." required />
                  </div>

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
                    <input type="text" value={formData.shortDescription} onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })} placeholder="e.g. Open a Demat account and complete KYC" />
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
                      <th>Clicked At</th>
                      <th>Redirected At</th>
                      <th>Status</th>
                      <th>Conversion ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clicks.length === 0 ? (
                      <tr><td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>No click logs recorded yet.</td></tr>
                    ) : (
                      clicks.map((clk) => (
                        <tr key={clk.clickId}>
                          <td><code>{clk.clickId}</code></td>
                          <td>{clk.userId}</td>
                          <td>{clk.offerId}</td>
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
                        <th>Event</th>
                        <th>Reward Coins</th>
                        <th>Status</th>
                        <th>Created Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conversions.length === 0 ? (
                        <tr><td colSpan="9" style={{ textAlign: "center", padding: "20px" }}>No conversions found matching "{statusFilter}".</td></tr>
                      ) : (
                        conversions.map((conv) => (
                          <tr key={conv.conversionId}>
                            <td><code>{conv.conversionId}</code></td>
                            <td><code>{conv.clickId}</code></td>
                            <td>{conv.userId}</td>
                            <td>{conv.offerId}</td>
                            <td>{conv.event}</td>
                            <td><strong className="coin-val">+{conv.rewardCoins?.toLocaleString()} Coins</strong></td>
                            <td><span className={`status-badge ${conv.status}`}>{conv.status}</span></td>
                            <td>{conv.createdAt ? new Date(conv.createdAt).toLocaleString() : "-"}</td>
                            <td>
                              {conv.status === "PENDING" && (
                                <>
                                  <button className="btn-approve" onClick={() => handleConversionAction(conv.conversionId, "APPROVE")}>Approve</button>
                                  <button className="btn-reject" onClick={() => { setSelectedConversion(conv); setShowRejectModal(true); }}>Reject</button>
                                </>
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
