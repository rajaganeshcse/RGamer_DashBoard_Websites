import { Outlet } from "react-router-dom";
import Header from "./Header";
import SubHeader from "./SubHeader";

export default function Home() {
  return (
    <div>
      <Header />
      <SubHeader />

      
      <Outlet />
    </div>
  );
}
