import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./../Firebase";
import { DRAW_STATUS, COLLECTIONS } from "../utils/constants";

/* ================= STYLES ================= */

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f6fb",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingTop: "40px"
  },

  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#ffffff",
    borderRadius: "14px",
    padding: "24px",
    boxShadow: "0 8px 22px rgba(0,0,0,0.08)"
  },

  title: {
    fontSize: "22px",
    fontWeight: "bold",
    marginBottom: "18px",
    textAlign: "center"
  },

  field: {
    marginBottom: "14px"
  },

  label: {
    display: "block",
    fontSize: "14px",
    fontWeight: "bold",
    marginBottom: "6px"
  },

  input: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "14px"
  },

  btn: (loading) => ({
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    background: loading ? "#b39ddb" : "#6A1BFF",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "bold",
    cursor: loading ? "not-allowed" : "pointer",
    marginTop: "10px"
  }),

  hint: {
    fontSize: "12px",
    color: "#777",
    marginTop: "4px"
  }
};

/* ================= COMPONENT ================= */

const CreateLuckyDraw = () => {

  const [rewardCoins, setRewardCoins] = useState("");
  const [totalSlots, setTotalSlots] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!rewardCoins || !totalSlots) {
      alert("Please fill all fields");
      return;
    }

    if (+rewardCoins <= 0 || +totalSlots <= 0) {
      alert("Values must be greater than zero");
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, COLLECTIONS.LUCKY_DRAWS), {
        rewardCoins: Number(rewardCoins),
        totalSlots: Number(totalSlots),
        filledSlots: 0,
        status: DRAW_STATUS.OPEN,
        createdAt: serverTimestamp()
      });

      alert("🎉 Lucky Draw Created Successfully");

      setRewardCoins("");
      setTotalSlots("");

    } catch (err) {
      console.error(err);
      alert("Failed to create lucky draw");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.title}>🎯 Create Lucky Draw</div>

        <form onSubmit={handleCreate}>

          <div style={styles.field}>
            <label style={styles.label}>Reward Coins</label>
            <input
              type="number"
              value={rewardCoins}
              onChange={e => setRewardCoins(e.target.value)}
              placeholder="e.g. 100"
              style={styles.input}
            />
            <div style={styles.hint}>
              Coins credited to the winner
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Total Slots</label>
            <input
              type="number"
              value={totalSlots}
              onChange={e => setTotalSlots(e.target.value)}
              placeholder="e.g. 50"
              style={styles.input}
            />
            <div style={styles.hint}>
              Number of users who can join
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={styles.btn(loading)}
          >
            {loading ? "Creating..." : "Create Lucky Draw"}
          </button>

        </form>
      </div>
    </div>
  );
};

export default CreateLuckyDraw;
