import React, { useState, useContext } from "react";

import { Link } from "gatsby";

import styled from "styled-components";

import BootstrapNavbar from "react-bootstrap/Navbar";
import Dropdown from "react-bootstrap/Dropdown";
import Badge from "react-bootstrap/Badge";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

import NotificationSubscriber from "./NotificationSubscriber";

import { FirebaseContext } from "./FirebaseProvider";
import { UserContext } from "./UserProvider";
import { ErrorContext } from "./Error";

import icon from "../images/icon.png";
import birthdayIcon from "../images/icon-birthday.png";
import litBirthdayCake from "../images/lit-birthday-cake.jpg";
import blowingOutCandles from "../images/blowing-out-candles.jpg";
import believeInYourself from "../images/believe-in-yourself.jpg";

import defaultProfilePic from "../images/default-profile-picture.png";

const LogoImg = styled.img`
  width: 2rem;
`;

const Navbar = styled(BootstrapNavbar)`
  background: rebeccapurple;
  justify-content: space-between;
`;

const NavbarCollapse = styled(Navbar.Collapse)`
  display: flex;
  justify-content: flex-end;
  flex-grow: 0;

  & .collapse {
    justify-content: center;
  }
`;

const UserMenuDropdown = styled(Dropdown)`
  .dropdown-menu {
    width: 14rem;
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

const BirthdayBadge = styled(Badge)`
  margin: auto;
  background: #ee0189;
  font-size: 1.5rem;
  color: white;
  animation: fun 2s infinite;

  @keyframes fun {
    0% {
      color: #04ef9b;
      transform: rotateX(0);
    }

    50% {
      color: #663399;
    }

    100% {
      color: #dede03;
      transform: rotateX(360deg);
    }
  }
`;

const TestNotificationsSubscribe = ({ loading, subscribed, fcmSupported }) => {
  return (
    <Dropdown.Item
      style={{
        whiteSpace: "normal",
      }}
    >
      {fcmSupported === true
        ? loading === true
          ? subscribed === true
            ? "Unsubscribing From "
            : "Subscribing To "
          : subscribed === true
          ? "Unsubscribe From "
          : "Subscribe To "
        : "Notifications not supported, try desktop"}
      Test Notifications
    </Dropdown.Item>
  );
};

const Header = () => {
  const [user, setUser] = useContext(UserContext);
  const firebase = useContext(FirebaseContext);
  const setError = useContext(ErrorContext)[1];

  // getMonth() returns [0, 11], getDate() returns [1, 31]
  const now = new Date();
  const ollyBirthday = now.getDate() === 14 && now.getMonth() === 4;
  const logoImg = ollyBirthday === true ? birthdayIcon : icon;
  const [showBirthdayCake, setShowBirthdayCake] = useState(false);
  const [candlesLit, setCandlesLit] = useState(true);
  const [wishMade, setWishMade] = useState(false);

  const makeUserAdmin = () => {
    if (user.isAdmin === false) {
      firebase.functions
        .httpsCallable("devMakeUserAdmin")(user.uid)
        .then(res => {
          console.log("Successfuly made user an admin", res);
        })
        .then(() => {
          setUser({
            ...user,
            isAdmin: true,
          });
        })
        .catch(err => {
          setError("Failed to make user an admin " + err);
        });
    } else {
      firebase.functions
        .httpsCallable("devRemoveUserAdmin")(user.uid)
        .then(() => {})
        .then(() => {
          setUser({
            ...user,
            isAdmin: false,
          });
        })
        .catch(err => {
          setError("Failed to remove admin status from user " + err);
        });
    }
  };

  const logout = () => {
    firebase.auth.signOut();
  };

  return (
    <Navbar expand="sm">
      <Navbar.Brand>
        <Link to="/">
          <LogoImg src={logoImg} alt="Site Icon" />
          <span>Olly G's Game Deals</span>
        </Link>
      </Navbar.Brand>

      {ollyBirthday === true && (
        <div>
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
          <span
            style={{
              fontSize: "2rem",
              cursor: "pointer",
            }}
            onClick={() => {
              setShowBirthdayCake(true);
              setCandlesLit(true);
              setWishMade(false);
            }}
            role="img"
            aria-label="cake"
          >
            🎂
          </span>
          <BirthdayBadge>HAPPY BIRTHDAY OLLY G</BirthdayBadge>

          <Modal
            show={showBirthdayCake}
            onHide={() => setShowBirthdayCake(false)}
          >
            <Modal.Header closeButton>
              <Modal.Title>HAPPY BIRTHDAY OLLY</Modal.Title>
            </Modal.Header>

            <Modal.Body>
              <img
                src={
                  candlesLit === true
                    ? litBirthdayCake
                    : wishMade === true
                    ? believeInYourself
                    : blowingOutCandles
                }
                style={{
                  maxWidth: "30rem",
                  margin: "auto",
                }}
                alt="Changes for Modal"
              />
            </Modal.Body>

            <Modal.Footer>
              {candlesLit === true ? (
                <Button onClick={() => setCandlesLit(false)}>
                  <span role="img" aria-label="party face">
                    🥳
                  </span>{" "}
                  Blow Out The Candles{" "}
                  <span role="img" aria-label="wind">
                    💨
                  </span>
                </Button>
              ) : (
                wishMade === false && (
                  <Button onClick={() => setWishMade(true)}>
                    <span role="img" aria-label="genie">
                      🧞
                    </span>{" "}
                    Make A Wish{" "}
                    <span role="img" aria-label="sparkle">
                      ✨
                    </span>
                  </Button>
                )
              )}

              <Button onClick={() => setShowBirthdayCake(false)}>
                Throw The Cake On The Ground
              </Button>
            </Modal.Footer>
          </Modal>
        </div>
      )}

      {user && (
        <React.Fragment>
          <Navbar.Toggle aria-controls="toggle-navbar" />
          <NavbarCollapse id="toggle-navbar">
            {firebase.emulated === true && (
              <FirebaseEmulatedBadge>Firebase Emulated</FirebaseEmulatedBadge>
            )}
            {user && (
              <UserMenuDropdown>
                <Dropdown.Toggle>
                  <span
                    style={{
                      color: "white",
                    }}
                  >
                    {user.displayName || "Logged in"}
                  </span>

                  <ProfileImg
                    src={user.photoURL || defaultProfilePic}
                    alt="Profile"
                  />
                </Dropdown.Toggle>

                <Dropdown.Menu alignRight>
                  {user.isAdmin === true && (
                    <React.Fragment>
                      <Dropdown.Item key="admin-dashboard" as="a" href="/admin">
                        Admin Dashboard
                      </Dropdown.Item>

                      <Dropdown.Divider key="divider-1" />

                      <NotificationSubscriber
                        key="test-notification"
                        channel="test"
                      >
                        <TestNotificationsSubscribe />
                      </NotificationSubscriber>

                      <Dropdown.Divider key="divider-2" />
                    </React.Fragment>
                  )}

                  {firebase.emulated === true && (
                    <Dropdown.Item onClick={makeUserAdmin} as="button">
                      {user.isAdmin === true
                        ? "Remove My Admin Status"
                        : "Make Me An Admin"}
                    </Dropdown.Item>
                  )}

                  <Dropdown.Item onClick={logout} as="button">
                    Logout
                  </Dropdown.Item>
                </Dropdown.Menu>
              </UserMenuDropdown>
            )}
          </NavbarCollapse>
        </React.Fragment>
      )}
    </Navbar>
  );
};

export default Header;
