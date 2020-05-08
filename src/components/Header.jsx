import React, { useContext } from "react";

import { Link } from "gatsby";

import styled from "styled-components";

import BootstrapNavbar from "react-bootstrap/Navbar";
import Dropdown from "react-bootstrap/Dropdown";
import Badge from "react-bootstrap/Badge";

import NotificationSubscriber from "./NotificationSubscriber";

import { FirebaseContext } from "./FirebaseProvider";
import { UserContext } from "./UserProvider";
import { ErrorContext } from "./Error";

import icon from "../images/icon.png";
import defaultProfilePic from "../images/default-profile-picture.png";

const Navbar = styled(BootstrapNavbar)`
background: rebeccapurple;
`;

const NavbarCollapse = styled(Navbar.Collapse)`
  display: flex;
  justify-content: end;

  & .collapse {
    justify-content: center;    
  }
`;

const UserMenuDropdown = styled(Dropdown)`
.dropdown-menu {
  width: 14rem;
  left: -1.7rem;
}
`;

const ProfileImg = styled.img`
width: 2rem;
margin-left: 1rem;
margin-right: 0.5rem; 
border-radius: 2rem;
border: 1px solid white;
`;

const FirebaseEmulatedBadge = styled(Badge)`
margin: auto;
background: #ffa712;
padding: 0.75rem;
`;

const TestNotificationsSubscribe = ({loading, subscribed, fcmSupported}) => {
  return (
    <Dropdown.Item style={{
      whiteSpace: "normal",
    }}>
      {fcmSupported === true ? (loading === true ?
                               (subscribed === true ? "Unsubscribing From " :
                                "Subscribing To ") :
                               (subscribed === true ? "Unsubscribe From " :
                                "Subscribe To "))
      : "Notifications not supported, try desktop"
      }
      Test Notifications
    </Dropdown.Item>
  );
};

const Header = () => {
  const [user, setUser] = useContext(UserContext);
  const firebase = useContext(FirebaseContext);
  const setError = useContext(ErrorContext)[1];

  const makeUserAdmin = () => {
    if (user.isAdmin === false) {
      firebase.functions.httpsCallable("devMakeUserAdmin")(user.uid).then((res) => {
        console.log("Successfuly made user an admin", res);
      }).then(() => {
        setUser({
          ...user,
          isAdmin: true,
        });
      }).catch((err) => {
        setError("Failed to make user an admin " + err);
      });
    } else {
      firebase.functions.httpsCallable("devRemoveUserAdmin")(user.uid).then(() => {
      }).then(() => {
        setUser({
          ...user,
          isAdmin: false,
        });
      }).catch((err) => {
        setError("Failed to remove admin status from user " + err);
      });
    }
  };

  const logout = () => {
    firebase.auth.signOut();
  };
  
  return (
    <Navbar expand="sm">
      <Navbar.Brand className="mr-auto">
        <Link to="/">
          <img src={icon} alt="Site Icon" />
          <span>Olly G's Game Deals</span>
        </Link>
      </Navbar.Brand>

      {user &&
       <React.Fragment>
         <Navbar.Toggle aria-controls="toggle-navbar" />
         <NavbarCollapse id="toggle-navbar">
           {firebase.emulated === true &&
            <FirebaseEmulatedBadge>Firebase Emulated</FirebaseEmulatedBadge>}
           {user && <UserMenuDropdown>
             <Dropdown.Toggle>
               <span
                 style={{
                   color: 'white',
                 }}
               >
                 {user.displayName || "Logged in"}
               </span>

               <ProfileImg
                 src={user.photoURL || defaultProfilePic}
                 alt="Profile"
               />
             </Dropdown.Toggle>

             <Dropdown.Menu>
               {user.isAdmin === true &&
                <React.Fragment>
                  <Dropdown.Item key="admin-dashboard" as="a" href="/admin">
                    Admin Dashboard
                  </Dropdown.Item>
                  
                  <Dropdown.Divider key="divider-1" />
                  
                  <NotificationSubscriber key="test-notification" channel="test">
                    <TestNotificationsSubscribe />
                  </NotificationSubscriber>
                  
                  <Dropdown.Divider key="divider-2" />
                </React.Fragment>
               }

               {firebase.emulated === true &&
                <Dropdown.Item onClick={makeUserAdmin} as="button">
                  {user.isAdmin === true ?
                   "Remove My Admin Status" :
                   "Make Me An Admin"}
                </Dropdown.Item>}

               <Dropdown.Item onClick={logout} as="button">
                 Logout
               </Dropdown.Item>
             </Dropdown.Menu>
           </UserMenuDropdown>}
         </NavbarCollapse>
       </React.Fragment>}
    </Navbar>
  );
};

export default Header;
