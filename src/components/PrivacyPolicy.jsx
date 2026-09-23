import React from "react";
import { Link } from "react-router-dom";
import "./PrivacyPolicy.css";

export default function PrivacyPolicy() {
  return (
    <div className="legal-page-container">
      {/* NAVBAR */}
      <nav className="legal-navbar">
        <div className="legal-navbar-inner">
          <Link to="/" className="legal-brand">
            <span className="legal-brand-icon">🎮</span>
            <div>
              <span className="legal-brand-title">RGamer</span>
              <span className="legal-brand-tag">Privacy &amp; Trust Center</span>
            </div>
          </Link>
          <div className="legal-nav-links">
            <Link to="/privacy-policy" className="legal-nav-link active-pill">
              Privacy Policy
            </Link>
            <Link to="/delete-account" className="legal-nav-link">
              Delete Account
            </Link>
          </div>
        </div>
      </nav>

      {/* MAIN CONTAINER */}
      <main className="legal-content-wrapper">
        {/* HERO BANNER */}
        <section className="legal-hero">
          <div className="legal-hero-badge">Official Legal Document</div>
          <h1 className="legal-hero-title">Privacy Policy for RGamer</h1>
          <p className="legal-hero-sub">
            Last updated: September 23, 2026 • Compliant with Google Play Developer Policies &amp; Global Data Protection Laws
          </p>

          <div className="legal-highlights-grid">
            <div className="legal-highlight-pill">
              <span className="legal-highlight-icon">🔒</span>
              <span>Encrypted Data Transmission</span>
            </div>
            <div className="legal-highlight-pill">
              <span className="legal-highlight-icon">🛡️</span>
              <span>Zero Selling of User Data</span>
            </div>
            <div className="legal-highlight-pill">
              <span className="legal-highlight-icon">🗑️</span>
              <span>Full Account Deletion Rights</span>
            </div>
          </div>
        </section>

        {/* 1. INTRODUCTION */}
        <article className="legal-card">
          <h2>1. Introduction &amp; Scope</h2>
          <p>
            Welcome to <strong>RGamer</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). We provide a mobile rewards and gaming platform that allows registered users to participate in casual activities, spins, scratch cards, offer tasks, and redeem rewards.
          </p>
          <p>
            This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our mobile application (<strong>RGamer</strong>) and associated online services. By installing, registering, or using RGamer, you signify your assent to this Privacy Policy.
          </p>
        </article>

        {/* 2. INFORMATION WE COLLECT */}
        <article className="legal-card">
          <h2>2. Information We Collect</h2>
          <p>
            To provide our reward services, track legitimate earnings, and protect our ecosystem from abuse, we collect the following types of information:
          </p>
          <ul>
            <li>
              <strong>Account Information:</strong> When signing in through Google Sign-In, we receive your basic public profile, including your full name, email address, profile avatar URL, and unique Google account identifier.
            </li>
            <li>
              <strong>Device &amp; Hardware Identifiers:</strong> We collect hardware model, operating system version, carrier information, IP address, and installation referrer data. This data is strictly utilized for automated anti-fraud detection, anti-bot security, and enforcing our one-account-per-device policy.
            </li>
            <li>
              <strong>Activity &amp; Reward Logs:</strong> We maintain detailed records of coins earned, lucky spin timestamps, scratch card outcomes, offerwall task completions, referral bonus linkages, and payout transaction histories.
            </li>
            <li>
              <strong>Support &amp; Communications:</strong> If you submit a support ticket, contact request, or feedback report, we retain the message details, email address, and diagnostic device details you submit.
            </li>
          </ul>
        </article>

        {/* 3. HOW WE USE YOUR INFORMATION */}
        <article className="legal-card">
          <h2>3. How We Use Your Information</h2>
          <p>We process collected data solely for legitimate business purposes:</p>
          <ul>
            <li>To credit, verify, and maintain your coin and ticket balances.</li>
            <li>To process and disburse reward redemptions (such as UPI transfers, Google Play redeem codes, and voucher codes).</li>
            <li>To detect, prevent, and remediate fraud, unauthorized botting, VPN abuse, emulator usage, or multi-accounting.</li>
            <li>To communicate transaction receipts, support responses, and service updates.</li>
          </ul>
          <div className="legal-callout-box">
            <p>
              <strong>Policy Promise:</strong> We never sell, rent, or lease your personal information, email address, or device telemetry to third parties for marketing purposes.
            </p>
          </div>
        </article>

        {/* 4. THIRD-PARTY SDKS & PARTNERS */}
        <article className="legal-card">
          <h2>4. Third-Party Service Providers</h2>
          <p>
            Our application integrates verified industry-standard third-party software development kits (SDKs) to power backend infrastructure and advertising:
          </p>
          <ul>
            <li>
              <strong>Google Firebase:</strong> Used for secure user authentication, Cloud Firestore database persistence, and Firebase Cloud Messaging (FCM) notifications.
            </li>
            <li>
              <strong>Google Mobile Ads (AdMob):</strong> Used to deliver interstitial, rewarded, and banner advertisements. AdMob may process non-personalized device advertising IDs in compliance with Google Play Families and Advertising policies.
            </li>
            <li>
              <strong>Google Play Services:</strong> Used for Google Sign-In verification and application integrity checks.
            </li>
            <li>
              <strong>Partner Offerwall Networks:</strong> Third-party offer providers may independently verify application installation conditions prior to dispatching reward callbacks to our servers.
            </li>
          </ul>
        </article>

        {/* 5. DATA SECURITY & RETENTION */}
        <article className="legal-card">
          <h2>5. Data Security &amp; Retention</h2>
          <p>
            We implement robust organizational and technical security measures. All communications between the RGamer app, web portal, and backend databases are encrypted in transit using industry-standard Secure Sockets Layer (SSL) and Transport Layer Security (TLS 1.2+).
          </p>
          <p>
            We retain your data for as long as your account remains active. If you request account deletion, your profile, coin balances, and authentication credentials will be permanently erased.
          </p>
        </article>

        {/* 6. ACCOUNT DELETION & DATA ERASURE */}
        <article className="legal-card">
          <h2>6. Account Deletion &amp; Data Erasure (Google Play Requirement)</h2>
          <p>
            In strict accordance with Google Play&rsquo;s <strong>Account Deletion and Data Safety Requirements</strong>, every RGamer user has the unequivocal right to delete their account and associated data at any time.
          </p>
          <p>
            You can initiate account deletion through either of the following channels:
          </p>
          <ul>
            <li>
              <strong>In-App Deletion:</strong> Navigate to <em>Drawer Menu &rarr; Profile &rarr; Delete Account</em> inside the RGamer mobile app.
            </li>
            <li>
              <strong>Web-Based Deletion Portal:</strong> If you uninstalled the application or cannot access your device, you can submit an instant deletion request via our public web portal.
            </li>
          </ul>

          <div style={{ marginTop: "20px" }}>
            <Link to="/delete-account" className="legal-action-btn">
              <span>Go to Account Deletion Portal &rarr;</span>
            </Link>
          </div>
        </article>

        {/* 7. CHILDREN'S PRIVACY */}
        <article className="legal-card">
          <h2>7. Children&rsquo;s Privacy Protection</h2>
          <p>
            RGamer is not directed towards children under the age of 13. We do not knowingly collect personal identifiable information from children under 13 years of age. If we discover that a user under 13 has provided personal details, we promptly purge such information from our servers.
          </p>
        </article>

        {/* 8. CONTACT US */}
        <article className="legal-card">
          <h2>8. Contact &amp; Grievance Redressal</h2>
          <p>
            If you have questions, feedback, or data privacy requests regarding this Privacy Policy, please contact our Data Protection Team:
          </p>
          <ul>
            <li><strong>Application:</strong> RGamer (Rewards Planet)</li>
            <li><strong>Official Support Email:</strong> <a href="mailto:support@rgamer.app" style={{ color: "#4F46E5", fontWeight: "600" }}>support@rgamer.app</a></li>
            <li><strong>Telegram Community:</strong> @RGamerCommunity</li>
            <li><strong>Response Window:</strong> Within 24-48 business hours</li>
          </ul>
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
          &copy; {new Date().getFullYear()} RGamer. All rights reserved. Google Play is a trademark of Google LLC.
        </p>
      </footer>
    </div>
  );
}
