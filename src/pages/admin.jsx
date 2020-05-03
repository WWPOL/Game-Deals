import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import firebase from "gatsby-plugin-firebase";
import styled from "styled-components";

import Spinner from "react-bootstrap/Spinner";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import InputGroup from "react-bootstrap/InputGroup";
import Toast from "react-bootstrap/Toast";
import ListGroup from "react-bootstrap/ListGroup";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import Layout from "../components/Layout";
import SEO from "../components/SEO";
import Loader from "../components/Loader";
import DealCard from "../components/DealCard";
import CheckInput from "../components/CheckInput";
import {
  AdminContainer,
  FormContainer,
  RecordList,
  GhostButton,
  FixedToast,
} from "../styles";
import Error, { ErrorContext } from "../components/Error";
import { FirebaseContext } from "../components/FirebaseProvider";
import { UserContext } from "../components/UserProvider";
import Providers from "../components/Providers";

const AdminSectionTitle = styled.div`
  font-size: 1.3rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: 1rem;
`;

const ExistingGamesListGroup = styled(ListGroup)`
margin-right: 1rem;
`;

const DealPreviewContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-left: 1rem;
  margin-bottom: 1rem;
  align-items: center;

  flex-grow: 1;
`;

const EMPTY_FORM_STATE = {
  name: "",
  price: "",
  isFree: false,
  expires: new Date(),
  image: "",
  link: "",
  selectedDealId: null,
};

const AdminPage = () => {
  const user = useContext(UserContext)[0];
  const [error, setError] = useContext(ErrorContext);
  const firebaseClients = useContext(FirebaseContext);
  
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [validated, setValidated] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState(false);
  const [allDeals, setAllDeals] = useState([]);
  const [gameFormData, setGameFormData] = useState(EMPTY_FORM_STATE);
  const [resendDealNotification, setResendDealNotification] = useState(false);

  var nameInput;
  var imageInput;

  useEffect(() => {
    if (user && user.isAdmin === true) {
      setLoading(true);

      firebaseClients.firestore
      .collection("deals")
      .orderBy("expires", "desc")
      .onSnapshot(querySnapshot => {
        setLoading(false);

        setAllDeals(querySnapshot.docs.map(doc => {
            return {
              id: doc.id,
              ...doc.data(),
            };
          }));
        })
      }
  }, [firebaseClients.firestore, user, setLoading, setError]);

  const login = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebaseClients.auth
      .signInWithPopup(provider)
      .catch(error => {
        const errorCode = error.code;
        const errorMessage = error.message;
        setError("Login error: " + errorCode + ", " + errorMessage);
      });
  };

  const resetForm = msg => {
    setToastMsg(msg);
    setShowToast(true);
    setValidated(false);
    setGameFormData(EMPTY_FORM_STATE);
  };

  const handleSubmit = event => {
    event.preventDefault();
    setValidated(true);

    const form = event.currentTarget;
    if (form.checkValidity() === false) {
      event.stopPropagation();
    } else {
      setGameFormData(gameFormData);

      if (gameFormData.selectedDealId) {
        firebaseClients.firestore
          .collection("deals")
          .doc(gameFormData.selectedDealId)
          .update(gameFormData)
          .then(() => resetForm(`Deal updated: ${gameFormData.name}`))
          .catch(error => setError("Error adding document: " + error));
      } else {
        firebaseClients.firestore
          .collection("deals")
          .add({
            ...gameFormData,
            notificationSent: false,
          })
          .catch(error => setError("Error adding document: " + error))
          .then(docRef => {
            return firebaseClients.functions.httpsCallable("notify")({
              dealId: docRef.id,
              confirmResend: resendDealNotification,
            });
          })
          .catch((err) => setError("Failed to notify users: " + err))
          .then(() => {
            resetForm(`${gameFormData.name} saved and users notified`);
          });
      }
    }
  };

  const selectExistingDeal = deal => {
    setGameFormData({
      name: deal.name,
      price: deal.price,
      isFree: deal.isFree,
      expires: deal.expires.toDate(),
      image: deal.image,
      link: deal.link,
      notificationSent: deal.notificationSent,
      selectedDealId: deal.id,
    });
  };

  const manualSendNotification = deal => {
  };

  const deleteRecord = () => {
    if (!gameFormData.selectedDealId) return;

    firebaseClients.firestore
      .collection("deals")
      .doc(gameFormData.selectedDealId)
      .delete()
      .then(() =>
        resetForm(`Record deleted: ${gameFormData.selectedDealId} (${gameFormData.name})`)
      )
      .catch(error => setError("Error deleting document: " + error));
  };

  const suggestImage = query => {
    if (!query) {
      nameInput.focus();
      return;
    } else if (searching) {
      return;
    } else if (gameFormData.image) {
      imageInput.focus();
      return;
    }

    setSearching(true);
    axios({
      method: "GET",
      url:
        "https://contextualwebsearch-websearch-v1.p.rapidapi.com/api/Search/ImageSearchAPI",
      headers: {
        "content-type": "application/octet-stream",
        "x-rapidapi-host": "contextualwebsearch-websearch-v1.p.rapidapi.com",
        "x-rapidapi-key": process.env.GATSBY_RAPID_API_KEY,
      },
      params: {
        autoCorrect: "false",
        pageNumber: "1",
        pageSize: "1",
        q: query,
        safeSearch: "true",
      },
    })
      .then(res => {
        setGameFormData({
          ...gameFormData,
          image: res.data.value[0].url,
        });
        setSearching(false);
      })
      .catch(error => setError(error));
  };

  if (loading) return <Loader />;

  const Datepicker = () => (
    <DatePicker
      selected={gameFormData.expires}
      onChange={expires => setGameFormData({
        ...gameFormData,
        expires: expires
      })}
    />
  );

  return (        
    <Layout fluid>
      <Error error={[error, setError]} />
      <SEO title="Admin" />
      {(user && user.isAdmin === true) ? (
        <React.Fragment>
          <AdminContainer>
            <RecordList>
              <AdminSectionTitle>Existing Game Deals</AdminSectionTitle>
              <ExistingGamesListGroup>
                {allDeals.length > 0 ? allDeals.map(deal => (
                  <ListGroup.Item
                    key={deal.id}
                    active={gameFormData.selectedDealId === deal.id}
                    onClick={() => selectExistingDeal(deal)}
                    action
                    >
                    {deal.name}
                  </ListGroup.Item>
                )) :
                                   <ListGroup.Item disabled>
                                     No existing game deals.
                                   </ListGroup.Item>
                }
              </ExistingGamesListGroup>
            </RecordList>

            <FormContainer>
              <Form
                noValidate
                validated={validated}
                onSubmit={handleSubmit}
              >
                <AdminSectionTitle>
                  {gameFormData.selectedDealId
                  ? "Edit Existing Game Deal"
                  : "Add New Game Deal"}
                </AdminSectionTitle>
                <Form.Group controlId="formGame">
                  <Form.Label>Game</Form.Label>
                  <Form.Control
                    required
                    ref={input => (nameInput = input)}
                    type="text"
                    placeholder="Duke Nukem Forever"
                    onChange={e => setGameFormData({
                      ...gameFormData,
                      name: e.target.value
                    })}
                    value={gameFormData.name}
                  />
                </Form.Group>

                <Form.Group controlId="formPrice">
                  <Form.Label>Price</Form.Label>
                  {!gameFormData.isFree && (
                    <Form.Control
                      required
                      type="number"
                      placeholder="4.99"
                      onChange={e => setGameFormData({
                        ...gameFormData,
                        price: e.target.value
                      })}
                      value={gameFormData.price}
                    />
                  )}
                  <CheckInput
                    label={gameFormData.isFree ? "FREE!" : "Free?"}
                    value={gameFormData.isFree}
                    onClick={() => setGameFormData({
                      ...gameFormData,
                      isFree: !gameFormData.isFree,
                    })}/>
                </Form.Group>

                <Form.Group controlId="formLink">
                  <Form.Label>Expires</Form.Label>
                  <br />
                  <Form.Control required as={Datepicker} />
                </Form.Group>

                <Form.Group controlId="formImage">
                  <Form.Label>Image</Form.Label>
                  <InputGroup>
                    <InputGroup.Prepend
                      className="clickable"
                      onClick={() => suggestImage(gameFormData.name)}
                    >
                      <InputGroup.Text>
                        {searching ? (
                          <Spinner
                            animation="grow"
                            role="status"
                            variant="primary"
                            size="sm"
                          >
                            <span className="sr-only">Loading...</span>
                          </Spinner>
                        ) : (
                          <span role="img" aria-label="suggest image">
                            🔍
                          </span>
                        )}
                      </InputGroup.Text>
                    </InputGroup.Prepend>
                    <Form.Control
                      required
                      ref={input => (imageInput = input)}
                      type="text"
                      placeholder="https://media.gamestop.com/i/gamestop/10084187/Duke-Nukem-Forever"
                      onChange={e => setGameFormData({
                        ...gameFormData,
                        image: e.target.value,
                      })}
                      value={gameFormData.image}
                      disabled={searching}
                    />
                  </InputGroup>
                </Form.Group>

                <Form.Group controlId="formLink">
                  <Form.Label>Link</Form.Label>
                  <Form.Control
                    required
                    type="text"
                    placeholder="https://store.steampowered.com/app/57900/Duke_Nukem_Forever/"
                    onChange={e => setGameFormData({
                      ...gameFormData,
                      link: e.target.value,
                    })}
                    value={gameFormData.link}
                  />
                </Form.Group>

                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <Button variant="primary" type="submit">
                    {gameFormData.selectedDealId ? "Save" : "Submit"}
                  </Button>
                  {gameFormData.selectedDealId && (
                    <React.Fragment>
                      <Button onClick={() => manualSendNotification(gameFormData)}>
                        Send Notification
                      </Button>
                      <Button variant="danger" onClick={deleteRecord}>
                        Delete
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setGameFormData(EMPTY_FORM_STATE)}
                      >
                        Cancel
                      </Button>
                    </React.Fragment>
                  )}
                </div>
              </Form>
            </FormContainer>

            <DealPreviewContainer>
              <AdminSectionTitle>Game Deal Preview</AdminSectionTitle>
              <DealCard
                name={gameFormData.name}
                price={gameFormData.price}
                isFree={gameFormData.isFree}
                expires={gameFormData.expires}
                image={gameFormData.image}
                link={gameFormData.link}
              />
            </DealPreviewContainer>

            <FixedToast
              show={showToast}
              onClose={() => setShowToast(false)}
              autohide
            >
              <Toast.Header>
                <strong className="mr-auto">Deal Submitted!</strong>
              </Toast.Header>
              <Toast.Body>{toastMsg}</Toast.Body>
            </FixedToast>
          </AdminContainer>
        </React.Fragment>
      ) : (
        <Button onClick={login}>Log in</Button>
      )}
    </Layout>
  );
}

const WrappedAdminPage = () => {
  return (
    <Providers>
      <AdminPage />
    </Providers>
  );
};


export default WrappedAdminPage;
