import React, { useState } from "react";
import styled from "styled-components";
import firebase from "gatsby-plugin-firebase";
import { useAuthState } from "react-firebase-hooks/auth";

import Layout from "../components/Layout";
import SEO from "../components/SEO";
import Loader from "../components/Loader";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Toast from "react-bootstrap/Toast";

import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";

const GreetingContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const FixedToast = styled(Toast)`
  position: fixed;
  top: 25px;
  right: 25px;
`;

const AdminPage = () => {
  let [user, initialising, error] = [null, true, null];
  if (typeof window !== "undefined") {
    [user, initialising, error] = useAuthState(firebase.auth());
  }

  const [validated, setValidated] = useState(false);
  const [gameName, setGameName] = useState("");
  const [gamePrice, setGamePrice] = useState("");
  const [gameIsFree, setGameIsFree] = useState(false);
  const [gameExpires, setGameExpires] = useState(new Date());
  const [gameLink, setGameLink] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [submittedDocRef, setSubmittedDocRef] = useState("");

  const handleSubmit = event => {
    event.preventDefault();
    setValidated(true);

    const form = event.currentTarget;
    if (form.checkValidity() === false) {
      event.stopPropagation();
    } else {
      const db = firebase.firestore();
      db.collection("deals")
        .add({
          name: gameName,
          price: gameIsFree ? 0 : gamePrice,
          isFree: gameIsFree,
          expires: gameExpires,
          link: gameLink
        })
        .then(docRef => {
          setSubmittedDocRef(docRef.id);
          setShowToast(true);
          setGameName("");
          setGamePrice("");
          setGameIsFree(false);
          setGameExpires(new Date());
          setGameLink("");
          setValidated(false);
        })
        .catch(error => console.error("Error adding document: ", error));
    }
  };

  const login = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase
      .auth()
      .signInWithPopup(provider)
      .catch(error => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error("Login error", errorCode, errorMessage);
      });
  };

  const logout = () => {
    firebase.auth().signOut();
  };

  if (initialising) return <Loader />;

  const Datepicker = () => (
    <DatePicker selected={gameExpires} onChange={setGameExpires} />
  );

  return (
    <Layout>
      <SEO title="Admin" />
      {error && (
        <div>
          <p>Error: {error.toString()}</p>
        </div>
      )}

      {user ? (
        <React.Fragment>
          <GreetingContainer>
            <h1>Welcome, {user.displayName}!</h1>
            <Button onClick={logout}>Log out</Button>
          </GreetingContainer>

          <Form noValidate validated={validated} onSubmit={handleSubmit}>
            <h3>Add New Game Deal</h3>
            <Form.Group controlId="formGame">
              <Form.Label>Game</Form.Label>
              <Form.Control
                required
                type="text"
                placeholder="Duke Nukem Forever"
                onChange={e => setGameName(e.target.value)}
                value={gameName}
              />
            </Form.Group>

            <Form.Group controlId="formPrice">
              <Form.Label>Price</Form.Label>
              {!gameIsFree && (
                <Form.Control
                  required
                  type="number"
                  placeholder="4.99"
                  onChange={e => setGamePrice(e.target.value)}
                  value={gamePrice}
                />
              )}
              <Form.Check
                type="checkbox"
                label={gameIsFree ? "FREE!" : "Free?"}
                onChange={e => setGameIsFree(e.target.checked)}
                checked={gameIsFree}
              />
            </Form.Group>

            <Form.Group controlId="formLink">
              <Form.Label>Expires</Form.Label>
              <br />
              <Form.Control required as={Datepicker} />
            </Form.Group>

            <Form.Group controlId="formLink">
              <Form.Label>Link</Form.Label>
              <Form.Control
                required
                type="text"
                placeholder="https://store.steampowered.com/app/57900/Duke_Nukem_Forever/"
                onChange={e => setGameLink(e.target.value)}
                value={gameLink}
              />
            </Form.Group>

            <Button variant="primary" type="submit">
              Submit
            </Button>
          </Form>

          <FixedToast
            show={showToast}
            onClose={() => setShowToast(false)}
            autohide
          >
            <Toast.Header>
              <strong className="mr-auto">Deal Submitted!</strong>
            </Toast.Header>
            <Toast.Body>Record saved as {submittedDocRef}</Toast.Body>
          </FixedToast>
        </React.Fragment>
      ) : (
        <Button onClick={login}>Log in</Button>
      )}
    </Layout>
  );
};

export default AdminPage;
