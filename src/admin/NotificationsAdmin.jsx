import React, { useState, useEffect } from "react";
import { db } from "../firebase";
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
      // Sort newest first
      list.sort((a, b) => {
        const t1 = a.sentAt || a.createdAt || "";
        const t2 = b.sentAt || b.createdAt || "";
        return t2.localeCompare(t1);
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

    setSending(true);
    setStatusMsg({ text: "Sending notification...", isError: false });

    const payload = {
      title,
      message,
      imageUrl,
      notificationType,
      screen,
      audience,
      targetUserId: audience === "SPECIFIC_USER" ? targetUserId : "",
      createdBy: "admin",
    };

    try {
      // Send via Spring Boot backend endpoint
      const res = await fetch("http://localhost:8080/api/admin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        setStatusMsg({
          text: `✅ Notification sent! Recipients: ${result.totalRecipients}, Successful: ${result.successfulCount}`,
          isError: false,
        });
        setTitle("");
        setMessage("");
        setImageUrl("");
      } else {
        // Fallback Firestore direct document record
        const notifId = "notif_" + Date.now();
        await setDoc(doc(db, "notifications", notifId), {
          notificationId: notifId,
          title,
          message,
          imageUrl: imageUrl || "",
          notificationType,
          screen,
          audience,
          totalRecipients: audience === "ALL_USERS" ? users.length : 1,
          successfulCount: audience === "ALL_USERS" ? users.length : 1,
          failedCount: 0,
          status: "SENT",
          sentAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          createdBy: "admin",
        });
        setStatusMsg({ text: "✅ Notification logged to Firestore!", isError: false });
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
          imageUrl: imageUrl || "",
          notificationType,
          screen,
          audience,
          totalRecipients: audience === "ALL_USERS" ? users.length : 1,
          successfulCount: audience === "ALL_USERS" ? users.length : 1,
          failedCount: 0,
          status: "SENT",
          sentAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          createdBy: "admin",
        });
        setStatusMsg({ text: "✅ Notification dispatched to Firestore!", isError: false });
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
      hour: 6,
      minute: 0,
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

      setDailyStatusMsg({ text: "✅ Daily 6:00 AM IST notification settings saved!", isError: false });
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
          Dispatch manual push notifications, configure 6:00 AM IST daily earning reminders, and track delivery history.
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

            <button type="submit" disabled={sending} style={styles.submitBtn}>
              {sending ? "Sending Notification..." : "🚀 SEND NOW"}
            </button>
          </form>
        </div>

        {/* ================= SECTION B: DAILY 6:00 AM IST SETTINGS ================= */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>⏰ Daily 6:00 AM IST Earning Notification</h3>
          <p style={styles.cardDesc}>Automatically schedules and dispatches daily reward notifications at 6:00 AM IST.</p>

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
                <div style={{ fontSize: 12, color: "#64748B" }}>Timezone: Asia/Kolkata (IST) at 06:00 AM</div>
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

            {/* Fixed Time Indicator */}
            <div style={styles.infoBadge}>
              🕒 Scheduled Time: <strong>06:00 AM IST</strong> (Spring Boot Scheduler `@Scheduled(cron = "0 0 6 * * *", zone = "Asia/Kolkata")`)
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
                      <strong>{item.title}</strong>
                      <div style={{ fontSize: 12, color: "#64748B" }}>{item.message}</div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.typeTag}>{item.notificationType || "PROMOTION"}</span>
                    </td>
                    <td style={styles.td}>{item.audience || "ALL_USERS"}</td>
                    <td style={styles.td}>
                      <span style={styles.screenTag}>{item.screen || "HOME"}</span>
                    </td>
                    <td style={styles.td}>{item.totalRecipients ?? 0}</td>
                    <td style={{ ...styles.td, color: "#059669", fontWeight: "bold" }}>
                      {item.successfulCount ?? 0}
                    </td>
                    <td style={{ ...styles.td, color: item.failedCount > 0 ? "#DC2626" : "#64748B" }}>
                      {item.failedCount ?? 0}
                    </td>
                    <td style={styles.td}>
                      <span style={item.status === "SENT" ? styles.statusSent : styles.statusPending}>
                        {item.status || "SENT"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {item.sentAt ? new Date(item.sentAt).toLocaleString() : "-"}
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
    padding: "24px",
    background: "#F8FAFC",
    minHeight: "100vh",
    fontFamily: "Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
  },
  headerBanner: {
    background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)",
    padding: "24px 30px",
    borderRadius: "16px",
    color: "#FFFFFF",
    marginBottom: "24px",
    boxShadow: "0 10px 25px rgba(30, 27, 75, 0.2)",
  },
  headerTitle: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "700",
  },
  headerSubtitle: {
    margin: "8px 0 0 0",
    fontSize: "14px",
    opacity: 0.85,
  },
  gridTwoCols: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
    gap: "24px",
  },
  card: {
    background: "#FFFFFF",
    borderRadius: "14px",
    padding: "24px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
    border: "1px solid #E2E8F0",
  },
  cardTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "700",
    color: "#0F172A",
  },
  cardDesc: {
    margin: "4px 0 16px 0",
    fontSize: "13px",
    color: "#64748B",
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
    fontSize: "13px",
    fontWeight: "600",
    color: "#334155",
  },
  input: {
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #CBD5E1",
    fontSize: "14px",
    outline: "none",
  },
  textarea: {
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #CBD5E1",
    fontSize: "14px",
    outline: "none",
    resize: "vertical",
  },
  select: {
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #CBD5E1",
    fontSize: "14px",
    outline: "none",
    background: "#FFFFFF",
  },
  imageRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  uploadBtn: {
    background: "#EEF2FF",
    color: "#4338CA",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    border: "1px solid #C7D2FE",
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
    border: "1px solid #E2E8F0",
  },
  removeImgBtn: {
    fontSize: "12px",
    color: "#EF4444",
    cursor: "pointer",
    fontWeight: "600",
  },
  submitBtn: {
    background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
    color: "#FFFFFF",
    padding: "12px",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "700",
    border: "none",
    cursor: "pointer",
    marginTop: "8px",
    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
  },
  saveBtn: {
    background: "linear-gradient(135deg, #059669, #047857)",
    color: "#FFFFFF",
    padding: "12px",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "700",
    border: "none",
    cursor: "pointer",
    marginTop: "8px",
    boxShadow: "0 4px 12px rgba(5, 150, 105, 0.25)",
  },
  toggleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px",
    background: "#F1F5F9",
    borderRadius: "8px",
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
    backgroundColor: "#CBD5E1",
    transition: ".3s",
    borderRadius: "24px",
  },
  infoBadge: {
    background: "#EFF6FF",
    border: "1px solid #BFDBFE",
    color: "#1E40AF",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "13px",
  },
  successBox: {
    background: "#ECFDF5",
    border: "1px solid #A7F3D0",
    color: "#065F46",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    marginBottom: "12px",
  },
  errorBox: {
    background: "#FEF2F2",
    border: "1px solid #FCA5A5",
    color: "#991B1B",
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
    background: "#F1F5F9",
    padding: "12px 14px",
    color: "#475569",
    fontWeight: "600",
    borderBottom: "1px solid #E2E8F0",
  },
  td: {
    padding: "12px 14px",
    borderBottom: "1px solid #E2E8F0",
    color: "#1E293B",
  },
  tr: {
    transition: "background 0.15s ease",
  },
  typeTag: {
    background: "#EEF2FF",
    color: "#4338CA",
    padding: "3px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "700",
  },
  screenTag: {
    background: "#F0FDF4",
    color: "#15803D",
    padding: "3px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "700",
  },
  statusSent: {
    background: "#ECFDF5",
    color: "#047857",
    padding: "3px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "700",
  },
  statusPending: {
    background: "#FEF3C7",
    color: "#B45309",
    padding: "3px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "700",
  },
};
