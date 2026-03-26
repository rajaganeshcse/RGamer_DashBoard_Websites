import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../Firebase";
import "./User.css";

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUsers(list);
        console.log("Fetched users:", list);
        
        setLoading(false);
      },
      (error) => {
        console.error("Firestore error:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  if (loading) return <h3>Loading users...</h3>;

  return (
    <div className="users">
           <h2>👤 Users List ({users.length})</h2>

  {/* Header Row */}
          <div className="user-row header">
            <span>Profile</span>
            <span>Name</span>
            <span>Email</span>
            <span>Coins</span>
            <span>Tickets</span>
            <span>Referral</span>
            <span>Token</span>
            <span>Created At</span>
          </div>

            {users.map(user => (
              <div className="user-row" key={user.id}>
                <img
                  src={user.profile_image || "/default.png"}
                  alt="profile"
                  className="avatar"
                />

                <span>{user.name}</span>
                <span>{user.email}</span>
                <span>💰 {user.coins}</span>
                <span>🎟️ {user.tickets}</span>
                <span>{user.referralCode}</span>
                <span>{user.token}</span>
                <span>{String(user.created_at)}</span>
              </div>
            ))}
    </div>

  );
}

export default Users;
