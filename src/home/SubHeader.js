import React, { useEffect, useState } from "react";
import "./Header.css";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../Firebase";

const SubHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [pendingRedeems, setPendingRedeems] = useState(0);
  const [pendingDeletions, setPendingDeletions] = useState(0);
  const [pendingConversions, setPendingConversions] = useState(0);

  useEffect(() => {
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

  const navItems = [
    { path: "/admin/dashboard", label: "Overview", icon: "📊", exact: true },
    { path: "/user", label: "Users", icon: "👥", match: ["/user", "/"] },
    { path: "/admin/notifications", label: "Notifications", icon: "🔔" },
    {
      path: "/redeem",
      label: "Payouts",
      icon: "💳",
      badge: pendingRedeems > 0 ? pendingRedeems : null,
      badgeClass: "badge-amber",
    },
    {
      path: "/admin/share-earn",
      label: "Share & Earn",
      icon: "🔗",
      badge: pendingConversions > 0 ? pendingConversions : null,
      badgeClass: "badge-cyan",
    },
    { path: "/admin/LuckyDrawAdmin", label: "Lucky Draw", icon: "🎯" },
    { path: "/admin/createluckydraw", label: "Create Draw", icon: "✨" },
    { path: "/admin/winner-history", label: "Winners", icon: "🏆" },
    {
      path: "/admin/delete-requests",
      label: "Deletions",
      icon: "🗑️",
      badge: pendingDeletions > 0 ? pendingDeletions : null,
      badgeClass: "badge-rose",
    },
  ];

  const checkActive = (item) => {
    if (item.match) return item.match.includes(location.pathname);
    return location.pathname === item.path ||
      (item.path !== "/admin/dashboard" && location.pathname.startsWith(item.path));
  };

  return (
    <nav className="sub-header">
      <ul>
        {navItems.map((item) => (
          <li
            key={item.path}
            className={checkActive(item) ? "active" : ""}
            onClick={() => navigate(item.path)}
          >
            <span>{item.icon}</span>
            {item.label}
            {item.badge != null && (
              <span className={`tab-badge ${item.badgeClass}`}>{item.badge}</span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default SubHeader;
