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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
        background: "radial-gradient(ellipse at center, #1E1B4B 0%, #090D16 70%)"
      }}
      className="animate-fade-in"
    >
      <form
        onSubmit={handleLogin}
        className="glass-card"
        style={{
          padding: "44px 38px",
          width: "100%",
          maxWidth: "400px",
          textAlign: "center",
          borderColor: "rgba(99, 102, 241, 0.3)"
        }}
      >
        <div
          style={{
            fontSize: "42px",
            width: "72px",
            height: "72px",
            borderRadius: "20px",
            background: "rgba(99, 102, 241, 0.15)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px auto"
          }}
        >
          🔐
        </div>

        <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "800", color: "#F8FAFC" }}>
          Admin Authentication
        </h2>
        <p style={{ margin: "6px 0 24px 0", fontSize: "14px", color: "#94A3B8" }}>
          Enter credentials to access RGamer Portal
        </p>

        {error && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.15)",
              color: "#F87171",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              padding: "12px",
              borderRadius: "10px",
              marginBottom: "20px",
              fontSize: "13px",
              fontWeight: "600",
              textAlign: "left"
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <div style={{ textAlign: "left", marginBottom: "16px" }}>
          <label style={{ fontSize: "12px", fontWeight: "700", color: "#94A3B8", display: "block", marginBottom: "6px" }}>
            ADMIN EMAIL
          </label>
          <input
            type="email"
            placeholder="admin@rewardsplanet.app"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="form-input"
          />
        </div>

        <div style={{ textAlign: "left", marginBottom: "24px" }}>
          <label style={{ fontSize: "12px", fontWeight: "700", color: "#94A3B8", display: "block", marginBottom: "6px" }}>
            PASSWORD
          </label>
          <input
            type="password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="form-input"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-glow"
          style={{ width: "100%", justifyContent: "center", padding: "12px" }}
        >
          {loading ? "Verifying Credentials..." : "Authenticate & Open Dashboard →"}
        </button>

        <div style={{ marginTop: "24px", fontSize: "12px", color: "#64748B" }}>
          Encrypted Connection • Secure Portal Access
        </div>
      </form>
    </div>
  );
}
