import React from "react";
import "./Header.css";
import { useNavigate } from "react-router-dom";

const SubHeader = () => {
    const navigate = useNavigate();
  return (
    <nav className="sub-header">
      <ul>
        <li onClick={() => navigate("/user")}>User</li>
        <li onClick={()=> navigate("/redeem")}>Redeem Request</li>
        <li>Referral</li>
        <li>Tournament</li>
      </ul>
    </nav>
  );
};

export default SubHeader;
