import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase"; // ✅ CORRECT IMPORT

function Firebase() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let unsubUsers = null;

    // 🔐 Auth listener
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        console.warn("User not logged in");
        setLoggedIn(false);
        setLoading(false);
        return;
      }

      console.log("Logged in as:", user.uid);
      setLoggedIn(true);

      // 🔥 Fetch users only after login
      unsubUsers = onSnapshot(
        collection(db, "users"),
        (snapshot) => {
          const list = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setUsers(list);
          setLoading(false);
        },
        (error) => {
          console.error("Firestore error:", error);
          setLoading(false);
        }
      );
    });

    // ✅ Cleanup listeners
    return () => {
      unsubAuth();
      if (unsubUsers) unsubUsers();
    };
  }, []);

  /* ================= UI STATES ================= */

  if (loading) return <h3>Loading users...</h3>;
  if (!loggedIn) return <h3>Please login to view users</h3>;

  return (
    <div style={{ padding: 20 }}>
      <h2>👤 Users List ({users.length})</h2>

      {users.length === 0 && <p>No users found</p>}

      {users.map((user) => (
        <div key={user.id} style={card}>
          <img
            src={user.profile_image || "/default.png"}
            alt="profile"
            style={avatar}
          />

          <div>
            <h3>{user.name || "No Name"}</h3>
            <p>Email: {user.email || "-"}</p>
            <p>Coins: 💰 {user.coins ?? 0}</p>
            <p>Tickets: 🎟️ {user.tickets ?? 0}</p>
            <p>Wallet Token: 🎮 {user.walletToken ?? "-"}</p>
            <p>Role: {user.role || "user"}</p>
            <p>Referral Code: {user.referralCode || "-"}</p>
            <p>
              Daily Bonus:{" "}
              {user.dailyBonusClaimedDate || "Not claimed"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================= STYLES ================= */

const card = {
  display: "flex",
  gap: 15,
  border: "1px solid #ddd",
  padding: 15,
  borderRadius: 8,
  marginBottom: 12,
  alignItems: "center",
  background: "#fff",
};

const avatar = {
  width: 70,
  height: 70,
  borderRadius: "50%",
  objectFit: "cover",
  border: "1px solid #ccc",
};

export default Firebase;
