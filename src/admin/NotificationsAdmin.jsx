import React, { useState, useEffect } from "react";
import { db } from "../Firebase";
import { collection, onSnapshot, doc, getDoc, setDoc, addDoc, serverTimestamp } from "firebase/firestore";
import "./Notifications.css";

export default function NotificationsAdmin() {
  // Manual Notification Form State
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [notificationType, setNotificationType] = useState("PROMOTION");
  const [screen, setScreen] = useState("DAILY_BONUS");
  const [audience, setAudience] = useState("ALL_USERS");
  const [targetUserId, setTargetUserId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: "", isError: false });

  // Users list for SPECIFIC_USER audience dropdown
  const [users, setUsers] = useState([]);

  // Daily Settings State
  const [dailyEnabled, setDailyEnabled] = useState(true);
  const [dailyHour, setDailyHour] = useState(6);
  const [dailyMinute, setDailyMinute] = useState(0);
  const [dailyTitle, setDailyTitle] = useState("🎁 Your Daily Rewards Are Ready!");
  const [dailyMessage, setDailyMessage] = useState("Claim your daily bonus, play games, complete tasks and start earning today.");
  const [dailyImage, setDailyImage] = useState("");
  const [dailyScreen, setDailyScreen] = useState("DAILY_BONUS");
  const [savingDaily, setSavingDaily] = useState(false);
  const [dailyStatusMsg, setDailyStatusMsg] = useState({ text: "", isError: false });

  // History State & Filter
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [searchHistory, setSearchHistory] = useState("");
  const [historyTypeFilter, setHistoryTypeFilter] = useState("ALL");

  // 1. Fetch Users & Notification History from Firestore
  useEffect(() => {
    // Listen to users
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setUsers(list);
    });

    // Listen to notification history
    const unsubHistory = onSnapshot(collection(db, "notifications"), (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      // Sort newest first safely supporting Timestamps, ISO strings, and numbers
      list.sort((a, b) => {
        const getMillis = (item) => {
          const val = item.sentAt || item.createdAt || item.timestamp;
          if (!val) return 0;
          if (typeof val?.toDate === "function") return val.toDate().getTime();
          if (typeof val?.seconds === "number") return val.seconds * 1000;
          if (typeof val === "number") return val;
          const parsed = new Date(val).getTime();
          return isNaN(parsed) ? 0 : parsed;
        };
        return getMillis(b) - getMillis(a);
      });
      setHistory(list);
      setLoadingHistory(false);
    });

    // Load daily settings
    const loadDailySettings = async () => {
      try {
        const snap = await getDoc(doc(db, "notification_settings", "daily_earning"));
        if (snap.exists()) {
          const data = snap.data();
          setDailyEnabled(data.enabled ?? true);
          setDailyHour(data.hour ?? 6);
          setDailyMinute(data.minute ?? 0);
          setDailyTitle(data.title || "🎁 Your Daily Rewards Are Ready!");
          setDailyMessage(data.message || "Claim your daily bonus, play games, complete tasks and start earning today.");
          setDailyImage(data.imageUrl || "");
          setDailyScreen(data.screen || "DAILY_BONUS");
        }
      } catch (err) {
        console.error("Error loading daily settings:", err);
      }
    };
    loadDailySettings();

    return () => {
      unsubUsers();
      unsubHistory();
    };
  }, []);

  // Image Upload handler
  const handleImageUpload = async (e, isDaily = false) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size exceeds maximum limit of 5MB");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await fetch("http://localhost:8080/api/admin/notifications/upload-image", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const fullUrl = data.imageUrl.startsWith("http")
          ? data.imageUrl
          : `http://localhost:8080${data.imageUrl}`;
        if (isDaily) setDailyImage(fullUrl);
        else setImageUrl(fullUrl);
      } else {
        const previewUrl = URL.createObjectURL(file);
        if (isDaily) setDailyImage(previewUrl);
        else setImageUrl(previewUrl);
      }
    } catch (err) {
      console.warn("Backend upload endpoint unreachable, fallback preview used:", err);
      const previewUrl = URL.createObjectURL(file);
      if (isDaily) setDailyImage(previewUrl);
      else setImageUrl(previewUrl);
    } finally {
      setUploading(false);
    }
  };

  // Helper for 12H IST display
  const formatTime12H = (h, m) => {
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const mStr = m < 10 ? `0${m}` : m;
    const hStr = h12 < 10 ? `0${h12}` : h12;
    return `${hStr}:${mStr} ${period} IST`;
  };

  // Send Manual Notification
  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setStatusMsg({ text: "Please enter a notification title", isError: true });
      return;
    }
    if (!message.trim()) {
      setStatusMsg({ text: "Please enter a notification message", isError: true });
      return;
    }
    if (title.includes(":APA91b") || message.includes(":APA91b") || (title.length > 90 && !title.includes(" "))) {
      setStatusMsg({ text: "❌ Invalid content: Title or message contains an FCM token string!", isError: true });
      return;
    }
    if (audience === "SPECIFIC_USER" && !targetUserId) {
      setStatusMsg({ text: "Please select a target user", isError: true });
      return;
    }

    setSending(true);
    setStatusMsg({ text: "Dispatched notification request to FCM pipeline...", isError: false });

    const safeImageUrl = (imageUrl && imageUrl.startsWith("http") && !imageUrl.startsWith("blob:")) ? imageUrl : "";

    const payload = {
      title,
      message,
      imageUrl: safeImageUrl,
      notificationType,
      screen,
      audience,
      targetUserId: audience === "SPECIFIC_USER" ? targetUserId : "",
      createdBy: "admin",
    };

    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "https://app-backend-lutn.onrender.com";

    try {
      let res;
      try {
        res = await fetch(`${API_BASE_URL}/api/admin/notifications/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (networkErr) {
        res = await fetch("http://localhost:8080/api/admin/notifications/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        const result = await res.json();
        if (result.totalRecipients === 0) {
          setStatusMsg({
            text: `⚠️ Notification processed, but 0 active FCM device tokens were found in Firestore. Ensure users are logged into the mobile app!`,
            isError: true,
          });
        } else {
          setStatusMsg({
            text: `✅ Notification dispatched! Target devices: ${result.totalRecipients}, Successfully delivered: ${result.successfulCount}`,
            isError: false,
          });
          setTitle("");
          setMessage("");
          setImageUrl("");
        }
      } else {
        const notifId = "notif_" + Date.now();
        await setDoc(doc(db, "notifications", notifId), {
          notificationId: notifId,
          title,
          message,
          imageUrl: safeImageUrl,
          notificationType,
          screen,
          audience,
          targetUserId: audience === "SPECIFIC_USER" ? targetUserId : "",
          totalRecipients: audience === "ALL_USERS" ? users.length : 1,
          successfulCount: 0,
          failedCount: 0,
          status: "PENDING",
          createdAt: new Date().toISOString(),
          createdBy: "admin",
        });
        setStatusMsg({ text: "✅ Notification queued in Firestore! Backend will dispatch FCM push shortly.", isError: false });
        setTitle("");
        setMessage("");
        setImageUrl("");
      }
    } catch (err) {
      console.error("Error sending notification:", err);
      try {
        const notifId = "notif_" + Date.now();
        await setDoc(doc(db, "notifications", notifId), {
          notificationId: notifId,
          title,
          message,
          imageUrl: safeImageUrl,
          notificationType,
          screen,
          audience,
          targetUserId: audience === "SPECIFIC_USER" ? targetUserId : "",
          totalRecipients: audience === "ALL_USERS" ? users.length : 1,
          successfulCount: 0,
          failedCount: 0,
          status: "PENDING",
          createdAt: new Date().toISOString(),
          createdBy: "admin",
        });
        setStatusMsg({ text: "✅ Notification queued in Firestore! Backend will dispatch FCM push shortly.", isError: false });
        setTitle("");
        setMessage("");
        setImageUrl("");
      } catch (fErr) {
        setStatusMsg({ text: "❌ Failed to send notification: " + fErr.message, isError: true });
      }
    } finally {
      setSending(false);
    }
  };

  // Save Daily Notification Settings
  const handleSaveDailySettings = async (e) => {
    e.preventDefault();
    setSavingDaily(true);
    setDailyStatusMsg({ text: "Saving settings...", isError: false });

    const settingsObj = {
      enabled: dailyEnabled,
      hour: parseInt(dailyHour, 10),
      minute: parseInt(dailyMinute, 10),
      timezone: "Asia/Kolkata",
      title: dailyTitle,
      message: dailyMessage,
      imageUrl: dailyImage,
      screen: dailyScreen,
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, "notification_settings", "daily_earning"), settingsObj, { merge: true });

      try {
        await fetch("http://localhost:8080/api/admin/notifications/settings/daily", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settingsObj),
        });
      } catch (bErr) {
        console.log("Backend sync skipped:", bErr.message);
      }

      setDailyStatusMsg({ text: `✅ Daily automated push scheduled for ${formatTime12H(dailyHour, dailyMinute)} saved!`, isError: false });
    } catch (err) {
      setDailyStatusMsg({ text: "❌ Error saving daily settings: " + err.message, isError: true });
    } finally {
      setSavingDaily(false);
    }
  };

  // Filter Notification History
  const filteredHistory = history.filter((item) => {
    const q = searchHistory.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.message && item.message.toLowerCase().includes(q)) ||
      (item.notificationType && item.notificationType.toLowerCase().includes(q)) ||
      (item.screen && item.screen.toLowerCase().includes(q));

    const matchesType =
      historyTypeFilter === "ALL" ||
      item.notificationType === historyTypeFilter;

    return matchesSearch && matchesType;
  });

  // Calculate Operational Metrics
  const totalCampaigns = history.length;
  const totalSuccessfulPushes = history.reduce((acc, h) => acc + (h.successfulCount || 0), 0);
  const totalAudienceReach = history.reduce((acc, h) => acc + (h.totalRecipients || 0), 0);

  // 1-Click Colorful Templates
  const COLORFUL_TEMPLATES = [
    {
      label: "🎁 Daily Bonus",
      t: "🎁 Your Daily Reward Is Waiting!",
      m: "Claim your daily bonus coins, spin the lucky wheel, and start earning today!",
      type: "DAILY_EARNING",
      scr: "DAILY_BONUS",
      theme: "chip-theme-gold"
    },
    {
      label: "🚀 Share & Earn",
      t: "🪙 High Reward Share & Earn Offers Active!",
      m: "New high-payout sponsor offers added! Share with friends or complete tasks to earn big coins!",
      type: "PROMOTION",
      scr: "SHARE_EARN",
      theme: "chip-theme-cyan"
    },
    {
      label: "🎯 Lucky Draw",
      t: "🎯 Mega 1000 Coins Lucky Draw Open!",
      m: "A high-prize lottery event is open. Join now with 1 ticket and win big coins!",
      type: "PROMOTION",
      scr: "HOME",
      theme: "chip-theme-violet"
    },
    {
      label: "⚡ Double Coins",
      t: "⚡ Double Coins Special Rush Active!",
      m: "Earn 2X bonus rewards on all completed app install and survey tasks for the next 2 hours!",
      type: "PROMOTION",
      scr: "TASKS",
      theme: "chip-theme-coral"
    },
    {
      label: "🎡 Spin & Win",
      t: "🎡 Free Fortune Spin Ready For You!",
      m: "Your free daily lucky spin is available. Spin now to win coins and instant rewards!",
      type: "DAILY_EARNING",
      scr: "SPINNER",
      theme: "chip-theme-mint"
    },
    {
      label: "🔔 System Update",
      t: "🚀 App Performance Upgrade Live!",
      m: "We've improved app stability, reduced payout latency, and added new rewards. Check it out now!",
      type: "UPDATE",
      scr: "HOME",
      theme: "chip-theme-blue"
    }
  ];

  return (
    <div className="notif-container animate-fade-in">
      
      {/* ================= HEADER BANNER ================= */}
      <div className="notif-header">
        <div className="notif-header-left">
          <div className="notif-badge-row">
            <span className="notif-engine-pill">
              <span>🔔</span> PUSH NOTIFICATION ENGINE
            </span>
            <span className="notif-live-tag">
              <span className="status-pulse-dot" style={{ width: "8px", height: "8px", background: "#00F5A0", borderRadius: "50%", display: "inline-block" }}></span>
              FCM BROADCAST ACTIVE
            </span>
            <span style={{ fontSize: "12px", color: "#CBD5E1", fontWeight: "700" }}>
              Firebase Cloud Messaging • Instant Delivery
            </span>
          </div>
          <h1 className="notif-main-title">
            <span>📢</span> Push Notifications &amp; Automation Center
          </h1>
          <p className="notif-header-subtitle">
            Dispatch high-voltage push campaigns, configure automated daily retention reminders, and monitor live delivery metrics.
          </p>
        </div>
      </div>

      {/* ================= 4 OPERATIONAL KPI METRIC CARDS ================= */}
      <div className="notif-kpi-grid">
        {/* Card 1: Total Campaigns */}
        <div className="notif-kpi-card notif-kpi-violet">
          <div className="notif-kpi-icon">🚀</div>
          <div className="notif-kpi-content">
            <div className="notif-kpi-value">{totalCampaigns}</div>
            <div className="notif-kpi-label">Dispatched Campaigns</div>
            <div className="notif-kpi-subtext">Total push notifications logged</div>
          </div>
        </div>

        {/* Card 2: Registered App Users */}
        <div className="notif-kpi-card notif-kpi-cyan">
          <div className="notif-kpi-icon">👥</div>
          <div className="notif-kpi-content">
            <div className="notif-kpi-value">{users.length}</div>
            <div className="notif-kpi-label">Active Registered Base</div>
            <div className="notif-kpi-subtext">Potential broadcast audience</div>
          </div>
        </div>

        {/* Card 3: Delivered Push Impressions */}
        <div className="notif-kpi-card notif-kpi-mint">
          <div className="notif-kpi-icon">🎯</div>
          <div className="notif-kpi-content">
            <div className="notif-kpi-value" style={{ color: "#00F5A0" }}>
              {totalSuccessfulPushes.toLocaleString()}
            </div>
            <div className="notif-kpi-label">Delivered Impressions</div>
            <div className="notif-kpi-subtext">Confirmed client push receipts</div>
          </div>
        </div>

        {/* Card 4: Daily Automation Schedule */}
        <div className="notif-kpi-card notif-kpi-gold">
          <div className="notif-kpi-icon">⏰</div>
          <div className="notif-kpi-content">
            <div className="notif-kpi-value" style={{ fontSize: "20px", color: "#FFB800" }}>
              {dailyEnabled ? formatTime12H(dailyHour, dailyMinute) : "PAUSED"}
            </div>
            <div className="notif-kpi-label">Daily Retention Cron</div>
            <div className="notif-kpi-subtext">
              {dailyEnabled ? "Automatic dispatch active" : "Scheduled push is paused"}
            </div>
          </div>
        </div>
      </div>

      {/* ================= MAIN TWO-COLUMN WORKBENCH ================= */}
      <div className="notif-grid-two-cols">
        
        {/* ---------------- SECTION A: SEND MANUAL NOTIFICATION ---------------- */}
        <div className="notif-card">
          <div className="notif-card-header">
            <h3 className="notif-card-title">
              <span>✉️</span> Dispatch Push Notification
            </h3>
            <p className="notif-card-desc">
              Compose custom broadcasts or target single players with rich banners and deep-linked screens.
            </p>
          </div>

          {statusMsg.text && (
            <div className={statusMsg.isError ? "notif-alert-error" : "notif-alert-success"}>
              <span>{statusMsg.isError ? "⚠️" : "✅"}</span>
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* 1-CLICK COLORFUL CAMPAIGN TEMPLATES */}
          <div className="notif-templates-wrap">
            <div className="notif-templates-title">
              <span>⚡</span> 1-Click Colorful Campaign Templates:
            </div>
            <div className="notif-templates-grid">
              {COLORFUL_TEMPLATES.map((tpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setTitle(tpl.t);
                    setMessage(tpl.m);
                    setNotificationType(tpl.type);
                    setScreen(tpl.scr);
                  }}
                  className={`notif-template-chip ${tpl.theme}`}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSendNotification} className="notif-form">
            {/* Title */}
            <div className="notif-field-group">
              <label className="notif-label">Notification Title *</label>
              <input
                type="text"
                placeholder="e.g. 🎁 Claim Your 250 Bonus Coins!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="notif-input"
                required
              />
            </div>

            {/* Message */}
            <div className="notif-field-group">
              <label className="notif-label">Notification Body Message *</label>
              <textarea
                placeholder="e.g. Your daily bonus is ready! Play games and complete sponsor tasks to earn instant cashout."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="notif-textarea"
                rows={3}
                required
              />
            </div>

            {/* Banner Image URL & File Upload */}
            <div className="notif-field-group">
              <label className="notif-label">Banner Image (Optional)</label>
              <div className="notif-image-row">
                <input
                  type="text"
                  placeholder="https://... image URL or click Upload"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="notif-input"
                  style={{ flex: 1 }}
                />
                <label className="notif-upload-btn">
                  <span>📁</span>
                  {uploading ? "Uploading..." : "Upload Image"}
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={(e) => handleImageUpload(e, false)}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              {imageUrl && (
                <div className="notif-preview-box">
                  <img src={imageUrl} alt="preview" className="notif-preview-img" />
                  <span className="notif-remove-img-btn" onClick={() => setImageUrl("")}>
                    ✕ Remove Image
                  </span>
                </div>
              )}
            </div>

            {/* Notification Type & Destination Screen */}
            <div className="notif-row-two-cols">
              <div className="notif-field-group">
                <label className="notif-label">Notification Type</label>
                <select
                  value={notificationType}
                  onChange={(e) => setNotificationType(e.target.value)}
                  className="notif-select"
                >
                  <option value="PROMOTION">PROMOTION 📣</option>
                  <option value="DAILY_EARNING">DAILY_EARNING 💰</option>
                  <option value="SYSTEM">SYSTEM ⚙️</option>
                  <option value="UPDATE">UPDATE 🚀</option>
                </select>
              </div>

              <div className="notif-field-group">
                <label className="notif-label">Destination Screen</label>
                <select
                  value={screen}
                  onChange={(e) => setScreen(e.target.value)}
                  className="notif-select"
                >
                  <option value="HOME">HOME 🏠</option>
                  <option value="DAILY_BONUS">DAILY_BONUS 🎁</option>
                  <option value="SPINNER">SPINNER 🎡</option>
                  <option value="SCRATCH_CARD">SCRATCH_CARD 🎟️</option>
                  <option value="GAMES">GAMES 🎮</option>
                  <option value="REDEEM">REDEEM 💳</option>
                  <option value="LEADERBOARD">LEADERBOARD 🏆</option>
                  <option value="TASKS">TASKS 📋</option>
                  <option value="SHARE_EARN">SHARE &amp; EARN 🔗</option>
                  <option value="PROFILE">PROFILE 👤</option>
                </select>
              </div>
            </div>

            {/* Target Audience */}
            <div className="notif-field-group">
              <label className="notif-label">Target Audience</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="notif-select"
              >
                <option value="ALL_USERS">ALL USERS (Broadcast to entire registered user base)</option>
                <option value="ACTIVE_USERS">ACTIVE USERS ONLY</option>
                <option value="SPECIFIC_USER">SPECIFIC USER (Target single player by UID)</option>
              </select>
            </div>

            {/* Specific User Selector */}
            {audience === "SPECIFIC_USER" && (
              <div className="notif-field-group">
                <label className="notif-label">Select Target User</label>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="notif-select"
                  required
                >
                  <option value="">-- Choose Target User --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || "Anonymous Player"} ({u.email || u.id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* COLORFUL REAL-TIME PUSH NOTIFICATION SIMULATOR */}
            <div className="notif-preview-panel">
              <div className="notif-preview-label">
                <span>📱</span> Live Android Push Notification Preview:
              </div>
              <div className="notif-sim-card">
                <div className="notif-sim-topbar">
                  <div className="notif-sim-app-badge">
                    <div className="notif-sim-app-icon">🎮</div>
                    <span className="notif-sim-app-name">RGamer • Earning App</span>
                  </div>
                  <span className="notif-sim-time">• Just now</span>
                </div>

                <div className="notif-sim-title">
                  {title || "🎁 Claim Your Daily Bonus Coins!"}
                </div>
                <div className="notif-sim-message">
                  {message || "Tap to claim today's reward, spin the lucky wheel, and withdraw instantly to UPI."}
                </div>

                {imageUrl && (
                  <div className="notif-sim-banner">
                    <img src={imageUrl} alt="preview banner" />
                  </div>
                )}

                <div className="notif-sim-actions">
                  <span className="notif-sim-dest-tag">
                    <span>📍</span> Opens: {screen}
                  </span>
                  <span className="notif-sim-cta-btn">
                    Claim Now 🎁
                  </span>
                </div>
              </div>
            </div>

            <button type="submit" disabled={sending} className="notif-submit-btn">
              {sending ? (
                <>
                  <span className="spinner" style={{ width: "18px", height: "18px", borderWidth: "2px" }}></span>
                  Dispatched to FCM Queue...
                </>
              ) : (
                <>
                  <span>🚀</span> DISPATCH PUSH BROADCAST NOW
                </>
              )}
            </button>
          </form>
        </div>

        {/* ---------------- SECTION B: DYNAMIC DAILY AUTOMATED RETENTION NOTIFICATION ---------------- */}
        <div className="notif-card">
          <div className="notif-card-header">
            <h3 className="notif-card-title">
              <span>⏰</span> Daily Automated Retention Push
            </h3>
            <p className="notif-card-desc">
              Schedule recurrent daily reminders triggered automatically by the backend cron at your exact chosen IST time.
            </p>
          </div>

          {dailyStatusMsg.text && (
            <div className={dailyStatusMsg.isError ? "notif-alert-error" : "notif-alert-success"}>
              <span>{dailyStatusMsg.isError ? "⚠️" : "✅"}</span>
              <span>{dailyStatusMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveDailySettings} className="notif-form">
            {/* Enable Toggle Switch */}
            <div className="notif-toggle-row">
              <div>
                <div className="notif-toggle-title">Enable Daily Auto Notification</div>
                <div className="notif-toggle-sub">Timezone: Asia/Kolkata (IST Standard Time)</div>
              </div>
              <label className="notif-switch">
                <input
                  type="checkbox"
                  checked={dailyEnabled}
                  onChange={(e) => setDailyEnabled(e.target.checked)}
                />
                <span className="notif-slider" />
              </label>
            </div>

            {/* Time Selector Dropdowns */}
            <div className="notif-row-two-cols">
              <div className="notif-field-group">
                <label className="notif-label">Daily Dispatch Hour (IST)</label>
                <select
                  value={dailyHour}
                  onChange={(e) => setDailyHour(parseInt(e.target.value, 10))}
                  className="notif-select"
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={h}>
                      {h < 10 ? `0${h}` : h}:00 ({h >= 12 ? `${h === 12 ? 12 : h - 12} PM` : `${h === 0 ? 12 : h} AM`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="notif-field-group">
                <label className="notif-label">Daily Dispatch Minute</label>
                <select
                  value={dailyMinute}
                  onChange={(e) => setDailyMinute(parseInt(e.target.value, 10))}
                  className="notif-select"
                >
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                    <option key={m} value={m}>
                      :{m < 10 ? `0${m}` : m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live IST Scheduled Clock Badge */}
            <div className="notif-clock-badge">
              <span style={{ fontSize: "18px" }}>🕒</span>
              <div>
                <div>Next Scheduled Trigger: <strong>{formatTime12H(dailyHour, dailyMinute)}</strong></div>
                <div style={{ fontSize: "12px", color: "#E2E8F0", marginTop: "2px" }}>
                  Status: {dailyEnabled ? "🟢 Active & Registered in Cron" : "🔴 Temporarily Suspended"}
                </div>
              </div>
            </div>

            {/* Daily Title */}
            <div className="notif-field-group">
              <label className="notif-label">Daily Notification Title</label>
              <input
                type="text"
                value={dailyTitle}
                onChange={(e) => setDailyTitle(e.target.value)}
                className="notif-input"
                required
              />
            </div>

            {/* Daily Message */}
            <div className="notif-field-group">
              <label className="notif-label">Daily Notification Message</label>
              <textarea
                value={dailyMessage}
                onChange={(e) => setDailyMessage(e.target.value)}
                className="notif-textarea"
                rows={3}
                required
              />
            </div>

            {/* Daily Banner Image */}
            <div className="notif-field-group">
              <label className="notif-label">Daily Banner Image (Optional)</label>
              <div className="notif-image-row">
                <input
                  type="text"
                  placeholder="https://... image URL"
                  value={dailyImage}
                  onChange={(e) => setDailyImage(e.target.value)}
                  className="notif-input"
                  style={{ flex: 1 }}
                />
                <label className="notif-upload-btn">
                  <span>📁</span>
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, true)}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
              {dailyImage && (
                <div className="notif-preview-box">
                  <img src={dailyImage} alt="daily banner" className="notif-preview-img" />
                  <span className="notif-remove-img-btn" onClick={() => setDailyImage("")}>
                    ✕ Remove Image
                  </span>
                </div>
              )}
            </div>

            {/* Destination Screen */}
            <div className="notif-field-group">
              <label className="notif-label">Destination Screen</label>
              <select
                value={dailyScreen}
                onChange={(e) => setDailyScreen(e.target.value)}
                className="notif-select"
              >
                <option value="DAILY_BONUS">DAILY_BONUS 🎁</option>
                <option value="HOME">HOME 🏠</option>
                <option value="SPINNER">SPINNER 🎡</option>
                <option value="SCRATCH_CARD">SCRATCH_CARD 🎟️</option>
                <option value="GAMES">GAMES 🎮</option>
                <option value="REDEEM">REDEEM 💳</option>
                <option value="TASKS">TASKS 📋</option>
              </select>
            </div>

            <button type="submit" disabled={savingDaily} className="notif-save-btn">
              {savingDaily ? (
                <>
                  <span className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }}></span>
                  Saving Cron Settings...
                </>
              ) : (
                <>
                  <span>💾</span> SAVE &amp; APPLY DAILY SCHEDULE
                </>
              )}
            </button>
          </form>
        </div>

      </div>

      {/* ================= SECTION C: COLORFUL NOTIFICATION HISTORY TABLE ================= */}
      <div className="notif-history-card">
        <div className="notif-history-header">
          <div>
            <h3 className="notif-card-title">
              <span>📜</span> Notification Audit History ({filteredHistory.length})
            </h3>
            <p className="notif-card-desc">
              Log of dispatched FCM broadcast campaigns, target audiences, and client delivery statistics.
            </p>
          </div>

          {/* Search & Filter Toolbar */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              {["ALL", "PROMOTION", "DAILY_EARNING", "UPDATE", "SYSTEM"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setHistoryTypeFilter(t)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "800",
                    cursor: "pointer",
                    border: historyTypeFilter === t ? "1.5px solid #00F2FE" : "1px solid rgba(255, 255, 255, 0.1)",
                    background: historyTypeFilter === t ? "rgba(6, 182, 212, 0.2)" : "rgba(15, 23, 42, 0.6)",
                    color: historyTypeFilter === t ? "#00F2FE" : "#CBD5E1"
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Search history by title, type, screen..."
              value={searchHistory}
              onChange={(e) => setSearchHistory(e.target.value)}
              className="notif-input"
              style={{ width: "260px", padding: "8px 12px", fontSize: "12.5px" }}
            />
          </div>
        </div>

        {loadingHistory ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div className="spinner"></div>
            <p style={{ color: "#FFFFFF", fontWeight: "800", marginTop: "12px" }}>
              Loading notification audit logs from Firestore...
            </p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#FFFFFF", fontWeight: "700" }}>
            {searchHistory ? "No notification records match your query." : "No notifications logged yet."}
          </div>
        ) : (
          <div className="notif-table-wrapper">
            <table className="notif-table">
              <thead>
                <tr>
                  <th className="notif-th">Campaign Details</th>
                  <th className="notif-th">Type</th>
                  <th className="notif-th">Audience</th>
                  <th className="notif-th">Target Screen</th>
                  <th className="notif-th">Recipients</th>
                  <th className="notif-th">Success</th>
                  <th className="notif-th">Failed</th>
                  <th className="notif-th">Status</th>
                  <th className="notif-th">Sent Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => {
                  const type = item.notificationType || "PROMOTION";
                  let typeThemeClass = "type-pill-promo";
                  if (type === "DAILY_EARNING") typeThemeClass = "type-pill-daily";
                  else if (type === "SYSTEM") typeThemeClass = "type-pill-system";
                  else if (type === "UPDATE") typeThemeClass = "type-pill-update";

                  const status = (item.status || "SENT").toUpperCase();

                  return (
                    <tr key={item.id} className="notif-tr">
                      <td className="notif-td" style={{ maxWidth: "300px" }}>
                        <div style={{ fontWeight: "900", color: "#FFFFFF", fontSize: "14px" }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: "12px", color: "#E2E8F0", marginTop: "3px", lineHeight: "1.35", fontWeight: "600" }}>
                          {item.message}
                        </div>
                      </td>
                      <td className="notif-td">
                        <span className={`notif-type-pill ${typeThemeClass}`}>
                          {type}
                        </span>
                      </td>
                      <td className="notif-td">
                        <span className="notif-audience-pill">
                          {item.audience || "ALL_USERS"}
                        </span>
                      </td>
                      <td className="notif-td">
                        <span className="notif-screen-pill">
                          {item.screen || "HOME"}
                        </span>
                      </td>
                      <td className="notif-td">
                        <strong style={{ color: "#FFFFFF", fontSize: "14px" }}>
                          {item.totalRecipients ?? 0}
                        </strong>
                      </td>
                      <td className="notif-td" style={{ color: "#00F5A0", fontWeight: "900", fontSize: "14px" }}>
                        {item.successfulCount ?? 0}
                      </td>
                      <td className="notif-td" style={{ color: item.failedCount > 0 ? "#FF4B72" : "#CBD5E1", fontWeight: "700" }}>
                        {item.failedCount ?? 0}
                      </td>
                      <td className="notif-td">
                        <span className={`notif-status-badge ${status === "SENT" ? "notif-status-sent" : status === "PENDING" ? "notif-status-pending" : "notif-status-failed"}`}>
                          {status}
                        </span>
                      </td>
                      <td className="notif-td">
                        <span style={{ color: "#CBD5E1", fontSize: "12px", fontWeight: "600" }}>
                          {(() => {
                            try {
                              const val = item.sentAt || item.createdAt;
                              if (!val) return "—";
                              const d = typeof val?.toDate === "function" ? val.toDate() : new Date(val);
                              return isNaN(d.getTime()) ? "—" : d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
                            } catch {
                              return "—";
                            }
                          })()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
