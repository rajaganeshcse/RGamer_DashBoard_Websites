import CreateTournament from "./CreateTournament";
import TournamentList from "./TournamentList";

export default function AdminDashboard() {
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Admin Panel</h1>
        <p style={styles.subtitle}>Manage tournaments & matches</p>
      </header>

      <section style={styles.section}>
        <CreateTournament />
      </section>

      <section style={styles.section}>
        <TournamentList />
      </section>
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f6fb",
    padding: "30px",
    fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif"
  },
  header: {
    marginBottom: "30px",
    padding: "20px 25px",
    background: "linear-gradient(135deg, #5b5bff, #4343e6)",
    borderRadius: "12px",
    color: "#fff",
    boxShadow: "0 10px 25px rgba(0,0,0,0.15)"
  },
  title: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 600
  },
  subtitle: {
    marginTop: "8px",
    fontSize: "14px",
    opacity: 0.9
  },
  section: {
    background: "#ffffff",
    padding: "25px",
    borderRadius: "12px",
    marginBottom: "25px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.08)"
  }
};
