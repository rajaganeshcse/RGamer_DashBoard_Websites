import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "./home/Home";
import Users from "./components/Users";
import Redeem from "./components/Redeem";

// 🔒 ADMIN
import AdminDashboard from "./admin/AdminDashboard";
import CreateTournament from "./admin/CreateTournament";
import LuckyDrawAdmin from "./admin/LuckyDrawAdmin";
import CreateLuckyDraw from "./admin/CreateLuckyDraw";
import LuckyDrawUsers from "./admin/LuckyDrawUsers";
import WinnerHistory from "./admin/WinnerHistory";
import DeleteRequests from "./admin/DeleteRequests";
import NotificationsAdmin from "./admin/NotificationsAdmin";
import ShareEarnManager from "./components/ShareEarnManager";
import ProtectedRoute from "./admin/ProtectedRoute";

// 🔥 AUTO LUCKY DRAW WATCHER
import { useAutoLuckyDrawWatcher } from "./admin/useAutoLuckyDrawWatcher";

const AppRoutes = () => {

  // ✅ ENABLE AUTO COMPLETION (runs once)
  useAutoLuckyDrawWatcher();

  return (
    <BrowserRouter>
      <Routes>

        {/* USER PANEL */}
        <Route path="/" element={<Home />}>
          <Route index element={<Users />} />
          <Route path="user" element={<Users />} />
          <Route path="redeem" element={<Redeem />} />

          {/* ADMIN DASHBOARD REDIRECT */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

          {/* 🔒 PROTECTED ADMIN DASHBOARD ROUTES */}
          <Route element={<ProtectedRoute />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/notifications" element={<NotificationsAdmin />} />
            <Route path="/admin/createtour" element={<CreateTournament />} />
            <Route path="/admin/LuckyDrawAdmin" element={<LuckyDrawAdmin />} />
            <Route path="/admin/createluckydraw" element={<CreateLuckyDraw />} />
            <Route path="/admin/lucky-draw/:drawId" element={<LuckyDrawUsers />} />
            <Route path="/admin/winner-history" element={<WinnerHistory />} />
            <Route path="/admin/delete-requests" element={<DeleteRequests />} />
            <Route path="/admin/share-earn" element={<ShareEarnManager />} />
          </Route>

        </Route>

      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
