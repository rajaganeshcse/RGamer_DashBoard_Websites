import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./home/Home";
import Users from "./components/Users";
import Redeem from "./components/Redeem";

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />}>
          <Route index element={<Users />} />
          <Route path="user" element={<Users />} />
          <Route path="redeem" element={<Redeem />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
