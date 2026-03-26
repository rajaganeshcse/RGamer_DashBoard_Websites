import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../Firebase";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {

  const nav = useNavigate();

  const login = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      nav("/admin/dashboard");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Admin Login</h2>
        <p style={styles.subtitle}>Access Admin Dashboard</p>

        <button
          style={styles.button}
          onClick={() => login("admin@gmail.com", "password")}
        >
          Login
        </button>
      </div>
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
    textAlign: "center",
    animation: "fadeIn 0.5s ease"
  },
  title: {
    margin: 0,
    fontSize: "24px",
    fontWeight: 600,
    color: "#333"
  },
  subtitle: {
    margin: "10px 0 30px",
    fontSize: "14px",
    color: "#777"
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
