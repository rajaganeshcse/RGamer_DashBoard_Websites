import React, { useEffect, useState } from "react";
import "./Header.css";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../Firebase";

const SubHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [pendingRedeems, setPendingRedeems] = useState(0);
  const [pendingDeletions, setPendingDeletions] = useState(0);
  const [pendingConversions, setPendingConversions] = useState(0);

  useEffect(() => {
    // 1. Pending Redeem requests
    const unsubRedeems = onSnapshot(
      collection(db, "redeem_requests"),
      (snap) => {
        const count = snap.docs.filter(
          (d) => (d.data().status || "").toLowerCase() === "pending"
        ).length;
        setPendingRedeems(count);
      },
      (err) => console.error("Redeem counter error:", err)
    );

    // 2. Pending Account Deletion requests
    const unsubDeletions = onSnapshot(
      collection(db, "account_delete_requests"),
      (snap) => {
        const count = snap.docs.filter(
          (d) => (d.data().status || "").toLowerCase() === "pending"
        ).length;
        setPendingDeletions(count);
      },
      (err) => console.error("Deletion counter error:", err)
    );

    // 3. Pending Share & Earn conversions
    const unsubConversions = onSnapshot(
      collection(db, "conversions"),
      (snap) => {
        const count = snap.docs.filter(
          (d) => (d.data().status || "").toUpperCase() === "PENDING"
        ).length;
        setPendingConversions(count);
      },
      (err) => console.error("Conversions counter error:", err)
    );

    return () => {
      unsubRedeems();
      unsubDeletions();
      unsubConversions();
    };
  }, []);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sub-header">
      <ul>
        <li
          className={isActive("/admin/dashboard") ? "active" : ""}
          onClick={() => navigate("/admin/dashboard")}
        >
          <span>⚡</span> Overview
        </li>
        <li
          className={isActive("/user") || isActive("/") ? "active" : ""}
          onClick={() => navigate("/user")}
        >
          <span>👤</span> Users
        </li>
        <li
          className={isActive("/admin/notifications") ? "active" : ""}
          onClick={() => navigate("/admin/notifications")}
        >
          <span>🔔</span> Notifications & IST
        </li>
        <li
          className={isActive("/redeem") ? "active" : ""}
          onClick={() => navigate("/redeem")}
        >
          <span>💳</span> Redeem Payouts
          {pendingRedeems > 0 && (
            <span className="tab-badge badge-amber">{pendingRedeems}</span>
          )}
        </li>
        <li
          className={isActive("/admin/share-earn") ? "active" : ""}
          onClick={() => navigate("/admin/share-earn")}
        >
          <span>🚀</span> Share & Earn
          {pendingConversions > 0 && (
            <span className="tab-badge badge-cyan">{pendingConversions}</span>
          )}
        </li>
        <li
          className={isActive("/admin/LuckyDrawAdmin") ? "active" : ""}
          onClick={() => navigate("/admin/LuckyDrawAdmin")}
        >
          <span>🎯</span> Lucky Draw Admin
        </li>
        <li
          className={isActive("/admin/createluckydraw") ? "active" : ""}
          onClick={() => navigate("/admin/createluckydraw")}
        >
          <span>⚙️</span> Create Draw
        </li>
        <li
          className={isActive("/admin/winner-history") ? "active" : ""}
          onClick={() => navigate("/admin/winner-history")}
        >
          <span>🏆</span> Winners
        </li>
        <li
          className={isActive("/admin/delete-requests") ? "active" : ""}
          onClick={() => navigate("/admin/delete-requests")}
        >
          <span>🗑️</span> Deletions
          {pendingDeletions > 0 && (
            <span className="tab-badge badge-rose">{pendingDeletions}</span>
          )}
        </li>
      </ul>
    </nav>
  );
};

export default SubHeader;
