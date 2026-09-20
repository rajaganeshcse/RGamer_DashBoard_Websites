import { useNavigate } from "react-router-dom";
import CreateTournament from "./CreateTournament";
import TournamentList from "./TournamentList";

export default function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>

      {/* ── HEADER ── */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Admin Panel</h1>
          <p style={styles.subtitle}>Manage tournaments, matches & accounts</p>
        </div>
      </header>

      {/* ── QUICK NAV CARDS ── */}
      <div style={styles.navGrid}>
        <NavCard
          icon="🔔"
          label="Notifications"
          desc="Send FCM & 6 AM daily IST alerts"
          color="#3B82F6"
          onClick={() => navigate("/admin/notifications")}
        />
        <NavCard
          icon="🏆"
          label="Tournaments"
          desc="Create & manage tournaments"
          color="#5b5bff"
          onClick={() => navigate("/admin/createtour")}
        />
        <NavCard
          icon="🎰"
          label="Lucky Draw"
          desc="Manage lucky draw events"
          color="#8B5CF6"
          onClick={() => navigate("/admin/LuckyDrawAdmin")}
        />
        <NavCard
          icon="🏅"
          label="Winner History"
          desc="View past lucky draw winners"
          color="#059669"
          onClick={() => navigate("/admin/winner-history")}
        />
        <NavCard
          icon="🗑️"
          label="Delete Requests"
          desc="Pending & deleted account requests"
          color="#EF4444"
          onClick={() => navigate("/admin/delete-requests")}
        />
      </div>

      {/* ── MAIN SECTIONS ── */}
      <section style={styles.section}>
        <CreateTournament />
      </section>

      <section style={styles.section}>
        <TournamentList />
      </section>

    </div>
  );
}

/* ── NavCard helper ── */
function NavCard({ icon, label, desc, color, onClick }) {
  return (
    <div style={{ ...styles.navCard, borderTop: `4px solid ${color}` }} onClick={onClick}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div style={{ ...styles.navCardLabel, color }}>{label}</div>
      <div style={styles.navCardDesc}>{desc}</div>
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f6fb",
    padding: "30px",
    fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
  },
  header: {
    marginBottom: "24px",
    padding: "20px 25px",
    background: "linear-gradient(135deg, #5b5bff, #4343e6)",
    borderRadius: "12px",
    color: "#fff",
    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
  },
  title: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 600,
  },
  subtitle: {
    marginTop: "8px",
    fontSize: "14px",
    opacity: 0.9,
    marginBottom: 0,
  },
  navGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: 16,
    marginBottom: 28,
  },
  navCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "20px 16px",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(0,0,0,0.07)",
    transition: "transform 0.18s ease, box-shadow 0.18s ease",
  },
  navCardLabel: {
    fontSize: 15,
    fontWeight: 700,
    marginTop: 10,
    marginBottom: 4,
  },
  navCardDesc: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 1.4,
  },
  section: {
    background: "#ffffff",
    padding: "25px",
    borderRadius: "12px",
    marginBottom: "25px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
  },
};
