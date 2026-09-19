import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../Firebase";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      nav("/admin/dashboard");
    } catch (err) {
      setError(err.message || "Failed to login. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleLogin} style={styles.card}>
        <h2 style={styles.title}>Admin Login</h2>
        <p style={styles.subtitle}>Access Admin Dashboard</p>

        {error && <div style={styles.errorBanner}>{error}</div>}

        <input
          type="email"
          placeholder="Admin Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.input}
        />

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? "Authenticating..." : "Login"}
        </button>
      </form>
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #1e1e2f, #2b2b45)",
    fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif"
  },
  card: {
    background: "#fff",
    padding: "40px 35px",
    width: "320px",
    borderRadius: "12px",
    boxShadow: "0 15px 35px rgba(0,0,0,0.25)",
    textAlign: "center"
  },
  title: {
    margin: 0,
    fontSize: "24px",
    fontWeight: 600,
    color: "#333"
  },
  subtitle: {
    margin: "10px 0 20px",
    fontSize: "14px",
    color: "#777"
  },
  errorBanner: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "10px",
    borderRadius: "6px",
    marginBottom: "15px",
    fontSize: "13px"
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    marginBottom: "15px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "14px",
    boxSizing: "border-box"
  },
  button: {
    width: "100%",
    padding: "12px",
    background: "#5b5bff",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.3s ease"
  }
};
