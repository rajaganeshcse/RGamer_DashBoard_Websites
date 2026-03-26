import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./home/Home";
import Users from "./components/Users";
import Redeem from "./components/Redeem";

// 🔒 ADMIN
import AdminLogin from "./admin/AdminLogin";
import AdminDashboard from "./admin/AdminDashboard";
import CreateTournament from "./admin/CreateTournament";
import LuckyDrawAdmin from "./admin/LuckyDrawAdmin";
import CreateLuckyDraw from "./admin/CreateLuckyDraw";
import LuckyDrawUsers from "./admin/LuckyDrawUsers";
import WinnerHistory from "./admin/WinnerHistory";

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

          {/* ADMIN PANEL */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/createtour" element={<CreateTournament />} />
        <Route path="/admin/LuckyDrawAdmin" element={<LuckyDrawAdmin/>} />
        <Route path="/admin/createluckydraw" element={<CreateLuckyDraw />} />
        <Route path="/admin/lucky-draw/:drawId" element={<LuckyDrawUsers />}/>
        <Route path="/admin/winner-history" element={<WinnerHistory />} />

        </Route>

        


      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
