import React, { useState } from "react";
import { Link } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../Firebase";
import "./PrivacyPolicy.css";
import "./AccountDeletion.css";

export default function AccountDeletion() {
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("No longer using the app");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email || !email.includes("@")) {
      setErrorMsg("Please provide a valid registered email address.");
      return;
    }

    if (!confirmed) {
      setErrorMsg("Please acknowledge the permanent deletion confirmation checkbox.");
      return;
    }

    setLoading(true);

    try {
      const docRef = await addDoc(collection(db, "account_delete_requests"), {
        email: email.trim(),
        userId: userId.trim() || null,
        phone: phone.trim() || null,
        reason: reason.trim(),
        status: "pending",
        requestedAt: serverTimestamp(),
        source: "web_portal"
      });

      setSubmittedTicket(docRef.id);
    } catch (err) {
      console.error("Deletion request failed:", err);
      setErrorMsg("Could not submit request. Please email us directly at support@rgamer.app.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="legal-page-container">
      {/* NAVBAR */}
      <nav className="legal-navbar">
        <div className="legal-navbar-inner">
          <Link to="/" className="legal-brand">
            <span className="legal-brand-icon">🎮</span>
            <div>
              <span className="legal-brand-title">RGamer</span>
              <span className="legal-brand-tag">Account &amp; Data Erasure</span>
            </div>
          </Link>
          <div className="legal-nav-links">
            <Link to="/privacy-policy" className="legal-nav-link">
              Privacy Policy
            </Link>
            <Link to="/delete-account" className="legal-nav-link active-pill">
              Delete Account
            </Link>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="legal-content-wrapper">
        <section className="legal-hero" style={{ background: "linear-gradient(135deg, #881337 0%, #BE123C 100%)" }}>
          <div className="legal-hero-badge" style={{ background: "rgba(255, 255, 255, 0.2)", color: "#FFE4E6" }}>
            Google Play Data Safety Compliance
          </div>
          <h1 className="legal-hero-title">Request RGamer Account &amp; Data Deletion</h1>
          <p className="legal-hero-sub" style={{ color: "#FECDD3" }}>
            Submit an official request to permanently delete your RGamer account, profile information, and associated app data.
          </p>

          <div className="legal-highlights-grid">
            <div className="legal-highlight-pill" style={{ background: "rgba(255, 255, 255, 0.12)" }}>
              <span className="legal-highlight-icon">⏱️</span>
              <span>Processed in 24&ndash;48 Hours</span>
            </div>
            <div className="legal-highlight-pill" style={{ background: "rgba(255, 255, 255, 0.12)" }}>
              <span className="legal-highlight-icon">🧹</span>
              <span>Complete Data Wipe</span>
            </div>
            <div className="legal-highlight-pill" style={{ background: "rgba(255, 255, 255, 0.12)" }}>
              <span className="legal-highlight-icon">🛡️</span>
              <span>Google Policy Compliant</span>
            </div>
          </div>
        </section>

        {/* POLICY DETAILS: WHAT IS DELETED VS RETAINED */}
        <article className="legal-card">
          <h2>Data Deletion Disclosures (Google Play Requirement)</h2>
          <p>
            When you request account deletion for the <strong>RGamer (Rewards Planet)</strong> mobile application, here is how your data is handled:
          </p>

          <div className="legal-callout-box" style={{ borderLeftColor: "#E11D48" }}>
            <p><strong>What data will be permanently deleted:</strong></p>
            <ul style={{ margin: "8px 0 0 0", paddingLeft: "18px" }}>
              <li>Your personal profile (Full Name, Google Email, Profile Avatar URL)</li>
              <li>Authentication credentials and device pairing tokens</li>
              <li>Unredeemed coin balances and Lucky Draw contest tickets</li>
              <li>Referral linkages and friend invite logs</li>
              <li>FCM push notification tokens and device telemetry</li>
            </ul>
          </div>

          <div className="legal-callout-box" style={{ borderLeftColor: "#F59E0B", background: "#FFFBEB" }}>
            <p><strong>What data may be retained &amp; legal justification:</strong></p>
            <p style={{ marginTop: "6px", fontSize: "13px", color: "#78350F" }}>
              Historical payout and monetary transaction records (Transaction ID, Amount, Payout method, and date) may be retained for up to 180 days solely for accounting, tax auditing, anti-money laundering regulations, and anti-fraud verification as mandated by financial laws. This retained data cannot be reused for marketing or account resurrection.
            </p>
          </div>
        </article>

        {/* SUBMISSION FORM */}
        <article className="legal-card">
          <h2>Submit Account Deletion Request</h2>
          <p>
            You can request deletion directly in the RGamer mobile app (<em>Profile &rarr; Delete Account</em>) or by submitting the web form below:
          </p>

          {submittedTicket ? (
            <div className="deletion-success-box">
              <div className="deletion-success-icon">✅</div>
              <h3 className="deletion-success-title">Deletion Request Submitted</h3>
              <p className="deletion-success-text">
                Your account deletion request has been recorded. Our safety compliance team will review and process your deletion within 24 to 48 business hours.
              </p>
              <div>
                <span style={{ fontSize: "13px", color: "#065F46", fontWeight: "600", marginRight: "8px" }}>
                  Request Reference ID:
                </span>
                <span className="ticket-pill">#{submittedTicket.substring(0, 10).toUpperCase()}</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ marginTop: "18px" }}>
              <div className="deletion-card-danger">
                <h3>⚠️ Warning: Permanent Action</h3>
                <p>
                  Deleting your RGamer account will permanently forfeit any accumulated coins, tickets, and referral bonuses. This action is irreversible once processed.
                </p>
              </div>

              {errorMsg && (
                <div style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", color: "#991B1B", padding: "12px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "13.5px", fontWeight: "600" }}>
                  {errorMsg}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  Registered Google Email Address <span className="req">*</span>
                </label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. user@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  RGamer User ID or Phone Number <span style={{ color: "#94A3B8", fontWeight: "normal" }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 9876543210 or your User ID from Profile"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Reason for Leaving <span style={{ color: "#94A3B8", fontWeight: "normal" }}>(Optional)</span>
                </label>
                <select
                  className="form-select"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  <option value="No longer using the app">No longer using the app</option>
                  <option value="Privacy concerns">Privacy concerns</option>
                  <option value="Too many notifications">Too many notifications</option>
                  <option value="Issues with coins or payouts">Issues with coins or payouts</option>
                  <option value="Creating a new account">Creating a new account</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <label className="form-checkbox-container">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                <span className="form-checkbox-label">
                  I understand and confirm that submitting this request will permanently delete my RGamer account and forfeit any remaining coins or rewards.
                </span>
              </label>

              <button
                type="submit"
                className="btn-delete-submit"
                disabled={loading}
              >
                {loading ? "Submitting Request..." : "Request Permanent Account Deletion"}
              </button>
            </form>
          )}

          <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid #E2E8F0" }}>
            <p style={{ fontSize: "13px", color: "#64748B", margin: 0 }}>
              Need assistance or want to cancel? Email us directly from your registered email at{" "}
              <a href="mailto:support@rgamer.app?subject=Account%20Deletion%20Assistance" style={{ color: "#4F46E5", fontWeight: "600" }}>
                support@rgamer.app
              </a>.
            </p>
          </div>
        </article>
      </main>

      {/* FOOTER */}
      <footer className="legal-footer">
        <div className="legal-footer-links">
          <Link to="/privacy-policy" className="legal-nav-link">Privacy Policy</Link>
          <Link to="/delete-account" className="legal-nav-link">Delete Account</Link>
          <a href="mailto:support@rgamer.app" className="legal-nav-link">Support Desk</a>
        </div>
        <p className="legal-footer-copy">
          &copy; {new Date().getFullYear()} RGamer. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
