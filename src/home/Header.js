import React from "react";
import "./Header.css";

const Header = () => {
  return (
    <header className="header">
      <div className="logo">Ganesh Website</div>

      <div className="search-box">
        <input type="text" placeholder="Search..." />
        <button>Search</button>
      </div>

      <button className="login-btn">Login</button>
    </header>
  );
};

export default Header;
