import React, { useState, useEffect } from "react";
import { Link } from "gatsby";
import firebase from "gatsby-plugin-firebase";
import Navbar from "react-bootstrap/Navbar";

import { GhostButton } from "../styles";
import icon from "../images/icon.png";

const Header = () => {
  const [user, setUser] = useState(null);
  useEffect(() => {
    firebase.auth().onAuthStateChanged(user => setUser(user));
  }, []);

  const logout = () => {
    firebase.auth().signOut();
  };

  return (
    <Navbar>
      <Navbar.Brand className="mr-auto">
        <Link to="/">
          <img src={icon} alt="Site Icon" />
          <span>Olly G's Game Deals</span>
        </Link>
      </Navbar.Brand>
      {user && <GhostButton onClick={logout}>Logout</GhostButton>}
    </Navbar>
  );
};

export default Header;
