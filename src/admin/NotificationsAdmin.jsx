import React, { useState, useEffect } from "react";
import { db } from "../Firebase";
import { collection, onSnapshot, doc, getDoc, setDoc, addDoc, serverTimestamp } from "firebase/firestore";

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

  // History State
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

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
      // Try backend upload endpoint if available
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
        // Fallback: create local preview object URL
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
    setStatusMsg({ text: "Sending notification...", isError: false });

    // Clean blob: URLs from imageUrl to prevent FCM payload errors
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
      // Send via Spring Boot backend endpoint
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
            text: `⚠️ Notification processed, but 0 active FCM device tokens were found in Firestore. Make sure users have logged in on the mobile app!`,
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
        // Fallback Firestore direct document record
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
      // Log directly to Firestore as robust fallback
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

  // Helper for 12H IST display
  const formatTime12H = (h, m) => {
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const mStr = m < 10 ? `0${m}` : m;
    const hStr = h12 < 10 ? `0${h12}` : h12;
    return `${hStr}:${mStr} ${period} IST`;
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
      // Update Firestore directly
      await setDoc(doc(db, "notification_settings", "daily_earning"), settingsObj, { merge: true });

      // Also sync to backend API if available
      try {
        await fetch("http://localhost:8080/api/admin/notifications/settings/daily", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settingsObj),
        });
      } catch (bErr) {
        console.log("Backend sync skipped:", bErr.message);
      }

      setDailyStatusMsg({ text: `✅ Daily notification scheduled for ${formatTime12H(dailyHour, dailyMinute)} saved!`, isError: false });
    } catch (err) {
      setDailyStatusMsg({ text: "❌ Error saving daily settings: " + err.message, isError: true });
    } finally {
      setSavingDaily(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.headerBanner}>
        <h2 style={styles.headerTitle}>🔔 FCM Notification Management Center</h2>
        <p style={styles.headerSubtitle}>
          Dispatch manual push notifications, configure dynamic daily automated earning reminders, and track delivery history.
        </p>
      </div>

      <div style={styles.gridTwoCols}>
        {/* ================= SECTION A: SEND NOTIFICATION ================= */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>✉️ Send Manual Notification</h3>
          <p style={styles.cardDesc}>Compose and trigger instant push notifications to targeted devices.</p>

          {statusMsg.text && (
            <div style={statusMsg.isError ? styles.errorBox : styles.successBox}>
              {statusMsg.text}
            </div>
          )}

          {/* QUICK PRESET TEMPLATES */}
          <div style={{ marginBottom: "18px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.5px" }}>
              ⚡ 1-Click Campaign Templates:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {[
                { label: "🎁 Daily Bonus", t: "🎁 Your Daily Reward Is Waiting!", m: "Claim your daily bonus coins, spin the wheel, and start earning today!", type: "DAILY_EARNING", scr: "DAILY_BONUS" },
                { label: "🚀 Share & Earn", t: "🪙 High Reward Share & Earn Offers Active!", m: "New high-payout sponsor offers added! Share with friends or complete tasks to earn big coins!", type: "PROMOTION", scr: "SHARE_EARN" },
                { label: "🎰 Lucky Draw", t: "🎯 Mega 1000 Coins Lucky Draw Open!", m: "A high-prize lottery event is open. Join now with 1 ticket and win big coins!", type: "PROMOTION", scr: "HOME" },
                { label: "🚀 Double Coins", t: "⚡ Double Coins Special Rush!", m: "Complete share & earn app tasks now to earn double bonus rewards!", type: "PROMOTION", scr: "TASKS" }
              ].map((tpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setTitle(tpl.t);
                    setMessage(tpl.m);
                    setNotificationType(tpl.type);
                    setScreen(tpl.scr);
                  }}
                  style={{
                    background: "rgba(99, 102, 241, 0.15)",
                    border: "1px solid rgba(99, 102, 241, 0.3)",
                    color: "#818CF8",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSendNotification} style={styles.form}>
            {/* Title */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Notification Title *</label>
              <input
                type="text"
                placeholder="e.g. 🎁 Daily Reward Available"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            {/* Message */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Notification Message *</label>
              <textarea
                placeholder="e.g. Claim your daily bonus and start earning today."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={styles.textarea}
                rows={3}
                required
              />
            </div>

            {/* Image Upload / URL */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Banner Image (Optional)</label>
              <div style={styles.imageRow}>
                <input
                  type="text"
                  placeholder="https://... or upload image"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  style={{ ...styles.input, flex: 1 }}
                />
                <label style={styles.uploadBtn}>
                  {uploading ? "Uploading..." : "📁 Upload Image"}
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={(e) => handleImageUpload(e, false)}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
              {imageUrl && (
                <div style={styles.previewBox}>
                  <img src={imageUrl} alt="preview" style={styles.previewImg} />
                  <span style={styles.removeImgBtn} onClick={() => setImageUrl("")}>✕ Remove</span>
                </div>
              )}
            </div>

            {/* Notification Type & Screen */}
            <div style={styles.rowTwoCols}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Notification Type</label>
                <select
                  value={notificationType}
                  onChange={(e) => setNotificationType(e.target.value)}
                  style={styles.select}
                >
                  <option value="PROMOTION">PROMOTION 📣</option>
                  <option value="DAILY_EARNING">DAILY_EARNING 💰</option>
                  <option value="SYSTEM">SYSTEM ⚙️</option>
                  <option value="UPDATE">UPDATE 🚀</option>
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Destination Screen</label>
                <select
                  value={screen}
                  onChange={(e) => setScreen(e.target.value)}
                  style={styles.select}
                >
                  <option value="HOME">HOME 🏠</option>
                  <option value="DAILY_BONUS">DAILY_BONUS 🎁</option>
                  <option value="SPINNER">SPINNER 🎡</option>
                  <option value="SCRATCH_CARD">SCRATCH_CARD 🎟️</option>
                  <option value="GAMES">GAMES 🎮</option>
                  <option value="REDEEM">REDEEM 💳</option>
                  <option value="LEADERBOARD">LEADERBOARD 🏆</option>
                  <option value="TASKS">TASKS 📋</option>
                  <option value="PROFILE">PROFILE 👤</option>
                </select>
              </div>
            </div>

            {/* Audience Options */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Target Audience</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                style={styles.select}
              >
                <option value="ALL_USERS">ALL USERS (Broadcast to all active FCM tokens)</option>
                <option value="ACTIVE_USERS">ACTIVE USERS ONLY</option>
                <option value="SPECIFIC_USER">SPECIFIC USER (Target single user)</option>
              </select>
            </div>

            {/* Specific User Dropdown */}
            {audience === "SPECIFIC_USER" && (
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Select Target User</label>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  style={styles.select}
                  required
                >
                  <option value="">-- Choose User --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || "No Name"} ({u.email || u.id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* LIVE ANDROID NOTIFICATION PREVIEW */}
            <div style={{ marginTop: "16px", marginBottom: "20px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.5px" }}>
                📱 Real-Time Android Push Preview:
              </div>
              <div style={{
                background: "#0F172A",
                borderRadius: "14px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                padding: "14px 16px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "16px" }}>🎮</span>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#CBD5E1" }}>RGamer</span>
                  <span style={{ fontSize: "11px", color: "#64748B" }}>• now</span>
                </div>
                <div style={{ fontWeight: "700", color: "#F8FAFC", fontSize: "14px", marginBottom: "2px" }}>
                  {title || "Notification Title"}
                </div>
                <div style={{ fontSize: "13px", color: "#94A3B8", lineHeight: "1.4" }}>
                  {message || "Notification body message preview..."}
                </div>
                {imageUrl && (
                  <div style={{ marginTop: "10px", borderRadius: "10px", overflow: "hidden", maxHeight: "160px" }}>
                    <img src={imageUrl} alt="preview banner" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                )}
              </div>
            </div>

            <button type="submit" disabled={sending} style={styles.submitBtn}>
              {sending ? "Sending Notification..." : "🚀 SEND NOW"}
            </button>
          </form>
        </div>

        {/* ================= SECTION B: DYNAMIC DAILY NOTIFICATION SETTINGS ================= */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>⏰ Daily Automated Earning Notification</h3>
          <p style={styles.cardDesc}>Set custom daily dispatch timing in IST. The backend dispatches notifications automatically at your exact chosen time.</p>

          {dailyStatusMsg.text && (
            <div style={dailyStatusMsg.isError ? styles.errorBox : styles.successBox}>
              {dailyStatusMsg.text}
            </div>
          )}

          <form onSubmit={handleSaveDailySettings} style={styles.form}>
            {/* Enable Toggle */}
            <div style={styles.toggleRow}>
              <div>
                <strong style={{ fontSize: 15, color: "#1E293B" }}>Enable Daily Auto Notification</strong>
                <div style={{ fontSize: 12, color: "#64748B" }}>Timezone: Asia/Kolkata (IST)</div>
              </div>
              <label style={styles.switch}>
                <input
                  type="checkbox"
                  checked={dailyEnabled}
                  onChange={(e) => setDailyEnabled(e.target.checked)}
                />
                <span style={styles.slider} />
              </label>
            </div>

            {/* Dynamic Time Selectors */}
            <div style={styles.rowTwoCols}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Daily Dispatch Hour (IST)</label>
                <select
                  value={dailyHour}
                  onChange={(e) => setDailyHour(parseInt(e.target.value, 10))}
                  style={styles.select}
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={h}>
                      {h < 10 ? `0${h}` : h}:00 ({h >= 12 ? `${h === 12 ? 12 : h - 12} PM` : `${h === 0 ? 12 : h} AM`})
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Daily Dispatch Minute</label>
                <select
                  value={dailyMinute}
                  onChange={(e) => setDailyMinute(parseInt(e.target.value, 10))}
                  style={styles.select}
                >
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                    <option key={m} value={m}>
                      :{m < 10 ? `0${m}` : m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dynamic Time Indicator Badge */}
            <div style={styles.infoBadge}>
              🕒 Scheduled Daily Time: <strong>{formatTime12H(dailyHour, dailyMinute)}</strong> (Asia/Kolkata timezone)
            </div>

            {/* Daily Title */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Daily Title</label>
              <input
                type="text"
                value={dailyTitle}
                onChange={(e) => setDailyTitle(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            {/* Daily Message */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Daily Message</label>
              <textarea
                value={dailyMessage}
                onChange={(e) => setDailyMessage(e.target.value)}
                style={styles.textarea}
                rows={3}
                required
              />
            </div>

            {/* Daily Banner Image */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Daily Banner Image</label>
              <div style={styles.imageRow}>
                <input
                  type="text"
                  placeholder="https://... or upload"
                  value={dailyImage}
                  onChange={(e) => setDailyImage(e.target.value)}
                  style={{ ...styles.input, flex: 1 }}
                />
                <label style={styles.uploadBtn}>
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, true)}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            </div>

            {/* Daily Destination Screen */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Destination Screen</label>
              <select
                value={dailyScreen}
                onChange={(e) => setDailyScreen(e.target.value)}
                style={styles.select}
              >
                <option value="DAILY_BONUS">DAILY_BONUS 🎁</option>
                <option value="HOME">HOME 🏠</option>
                <option value="SPINNER">SPINNER 🎡</option>
                <option value="SCRATCH_CARD">SCRATCH_CARD 🎟️</option>
                <option value="GAMES">GAMES 🎮</option>
                <option value="REDEEM">REDEEM 💳</option>
              </select>
            </div>

            <button type="submit" disabled={savingDaily} style={styles.saveBtn}>
              {savingDaily ? "Saving Settings..." : "💾 SAVE DAILY SETTINGS"}
            </button>
          </form>
        </div>
      </div>

      {/* ================= SECTION C: NOTIFICATION HISTORY TABLE ================= */}
      <div style={{ ...styles.card, marginTop: 24 }}>
        <h3 style={styles.cardTitle}>📜 Notification History ({history.length})</h3>
        <p style={styles.cardDesc}>Complete record of manual and automated notification dispatches.</p>

        {loadingHistory ? (
          <p style={{ color: "#64748B" }}>Loading notification history...</p>
        ) : history.length === 0 ? (
          <p style={{ color: "#64748B" }}>No notifications sent yet.</p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Title</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Audience</th>
                  <th style={styles.th}>Screen</th>
                  <th style={styles.th}>Recipients</th>
                  <th style={styles.th}>Success</th>
                  <th style={styles.th}>Failed</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Sent At</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} style={styles.tr}>
                    <td style={styles.td}>
                      <strong style={{ color: "#F8FAFC" }}>{item.title}</strong>
                      <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{item.message}</div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.typeTag}>{item.notificationType || "PROMOTION"}</span>
                    </td>
                    <td style={styles.td}>{item.audience || "ALL_USERS"}</td>
                    <td style={styles.td}>
                      <span style={styles.screenTag}>{item.screen || "HOME"}</span>
                    </td>
                    <td style={styles.td}>{item.totalRecipients ?? 0}</td>
                    <td style={{ ...styles.td, color: "#34D399", fontWeight: "bold" }}>
                      {item.successfulCount ?? 0}
                    </td>
                    <td style={{ ...styles.td, color: item.failedCount > 0 ? "#F87171" : "#64748B" }}>
                      {item.failedCount ?? 0}
                    </td>
                    <td style={styles.td}>
                      <span style={item.status === "SENT" ? styles.statusSent : styles.statusPending}>
                        {item.status || "SENT"}
                      </span>
                    </td>
                    <td style={styles.td}>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  container: {
    padding: "28px 32px",
    maxWidth: "1400px",
    margin: "0 auto",
  },
  headerBanner: {
    background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(6, 182, 212, 0.1) 100%)",
    border: "1px solid rgba(99, 102, 241, 0.3)",
    borderRadius: "16px",
    padding: "24px 28px",
    marginBottom: "28px",
  },
  headerTitle: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "800",
    color: "#F8FAFC",
  },
  headerSubtitle: {
    margin: "6px 0 0 0",
    fontSize: "13px",
    color: "#94A3B8",
  },
  gridTwoCols: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
    gap: "24px",
    marginBottom: "28px",
  },
  card: {
    background: "rgba(18, 24, 39, 0.75)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.5)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  cardTitle: {
    margin: 0,
    fontSize: "17px",
    fontWeight: "700",
    color: "#F8FAFC",
  },
  cardDesc: {
    margin: "4px 0 16px 0",
    fontSize: "13px",
    color: "#94A3B8",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  rowTwoCols: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  label: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  input: {
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    fontSize: "14px",
    outline: "none",
    background: "#0F172A",
    color: "#F8FAFC",
    colorScheme: "dark",
  },
  textarea: {
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    fontSize: "14px",
    outline: "none",
    resize: "vertical",
    background: "#0F172A",
    color: "#F8FAFC",
    colorScheme: "dark",
  },
  select: {
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    fontSize: "14px",
    outline: "none",
    background: "#0F172A",
    color: "#F8FAFC",
    colorScheme: "dark",
    cursor: "pointer",
  },
  imageRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  uploadBtn: {
    background: "rgba(99, 102, 241, 0.15)",
    color: "#818CF8",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    border: "1px solid rgba(99, 102, 241, 0.3)",
    whiteSpace: "nowrap",
  },
  previewBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginTop: "8px",
  },
  previewImg: {
    width: "80px",
    height: "50px",
    objectFit: "cover",
    borderRadius: "6px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  removeImgBtn: {
    fontSize: "12px",
    color: "#EF4444",
    cursor: "pointer",
    fontWeight: "600",
  },
  submitBtn: {
    background: "linear-gradient(135deg, #6366F1, #4F46E5)",
    color: "#FFFFFF",
    padding: "12px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "700",
    border: "none",
    cursor: "pointer",
    marginTop: "8px",
    boxShadow: "0 4px 14px rgba(99, 102, 241, 0.35)",
  },
  saveBtn: {
    background: "linear-gradient(135deg, #10B981, #059669)",
    color: "#FFFFFF",
    padding: "12px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "700",
    border: "none",
    cursor: "pointer",
    marginTop: "8px",
    boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)",
  },
  toggleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 14px",
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.06)",
  },
  switch: {
    position: "relative",
    display: "inline-block",
    width: "44px",
    height: "24px",
  },
  slider: {
    position: "absolute",
    cursor: "pointer",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "#334155",
    transition: ".3s",
    borderRadius: "24px",
  },
  infoBadge: {
    background: "rgba(59, 130, 246, 0.1)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    color: "#60A5FA",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "13px",
  },
  successBox: {
    background: "rgba(16, 185, 129, 0.1)",
    border: "1px solid rgba(16, 185, 129, 0.3)",
    color: "#34D399",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    marginBottom: "12px",
  },
  errorBox: {
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#F87171",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    marginBottom: "12px",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: "13px",
  },
  th: {
    background: "rgba(15, 23, 42, 0.85)",
    padding: "14px 16px",
    color: "#94A3B8",
    fontWeight: "700",
    textTransform: "uppercase",
    fontSize: "11px",
    letterSpacing: "0.5px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  },
  td: {
    padding: "12px 16px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    color: "#E2E8F0",
  },
  tr: {
    transition: "background 0.15s ease",
  },
  typeTag: {
    background: "rgba(99, 102, 241, 0.15)",
    color: "#A5B4FC",
    border: "1px solid rgba(99, 102, 241, 0.3)",
    padding: "3px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "700",
  },
  screenTag: {
    background: "rgba(16, 185, 129, 0.15)",
    color: "#6EE7B7",
    border: "1px solid rgba(16, 185, 129, 0.3)",
    padding: "3px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "700",
  },
  statusSent: {
    background: "rgba(16, 185, 129, 0.15)",
    color: "#34D399",
    border: "1px solid rgba(16, 185, 129, 0.3)",
    padding: "3px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "700",
  },
  statusPending: {
    background: "rgba(245, 158, 11, 0.15)",
    color: "#FBBF24",
    border: "1px solid rgba(245, 158, 11, 0.3)",
    padding: "3px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "700",
  },
};
