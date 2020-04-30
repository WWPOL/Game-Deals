import React, { useEffect, useContext } from "react";

import { Link } from "gatsby";

import styled from "styled-components";

import Navbar from "react-bootstrap/Navbar";
import Dropdown from "react-bootstrap/Dropdown";

import icon from "../images/icon.png";
import defaultProfilePic from "../images/default-profile-picture.png";

import { UserContext, FirebaseContext } from "../pages/index.jsx";

const UserMenuDropdown = styled(Dropdown)`
.dropdown-menu {
  width: 14rem;
  left: -1.7rem;
}
`;

const UserMenu = () => {
  const [user, setUser] = useContext(UserContext);
  const firebase = useContext(FirebaseContext);

  useEffect(() => {
    firebase.auth.onAuthStateChanged(newUser => {
      setUser(newUser);
    });
  }, [firebase.auth, setUser]);

  const logout = () => {
    firebase.auth.signOut();
  };

  if (!user) {
    return null;
  }
  
  return (
    <UserMenuDropdown>
      <Dropdown.Toggle>
        <span
          style={{
            color: 'white',
          }}
        >
          {user.displayName || "Logged in"}
        </span>

        <img
          src={user.photoURL || defaultProfilePic}
          alt="Profile"
          style={{
            width: '2rem',
            marginLeft: '1rem',
            marginRight: '0.5rem', 
            borderRadius: '2rem',
            border: '1px solid white',
          }}
        />
      </Dropdown.Toggle>

      <Dropdown.Menu>
        <Dropdown.Item onClick={logout} as="button">
          Logout
        </Dropdown.Item>
          </Dropdown.Menu>
    </UserMenuDropdown>
  );
};

const Header = () => {
  return (
    <Navbar>
      <Navbar.Brand className="mr-auto">
        <Link to="/">
          <img src={icon} alt="Site Icon" />
          <span>Olly G's Game Deals</span>
        </Link>
      </Navbar.Brand>

      <UserMenu />
    </Navbar>
  );
};

export default Header;
