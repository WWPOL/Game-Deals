import React, { useState, useEffect, useContext, useCallback } from "react";
import axios from "axios";
import firebase from "gatsby-plugin-firebase";
import styled from "styled-components";

import Alert from "react-bootstrap/Alert";
import Spinner from "react-bootstrap/Spinner";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import InputGroup from "react-bootstrap/InputGroup";
import Toast from "react-bootstrap/Toast";
import Modal from "react-bootstrap/Modal";
import ListGroup from "react-bootstrap/ListGroup";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import GoogleButton from "react-google-button";

import Layout from "../components/Layout";
import SEO from "../components/SEO";
import Loader from "../components/Loader";
import DealCard from "../components/DealCard";
import CheckInput from "../components/CheckInput";
import HelpTooltip from "../components/HelpTooltip";
import { smallBreakpoint, FixedToast } from "../styles";
import Error, { ErrorContext } from "../components/Error";
import { FirebaseContext } from "../components/FirebaseProvider";
import { UserContext } from "../components/UserProvider";
import Providers from "../components/Providers";

import oliverIcon from "../images/icon.png";
import checkedIcon from "../images/checked.png";
import uncheckedIcon from "../images/unchecked.png";

const dealsInfoBreakpoint = "1020px";

const NotLoggedInContainer = styled.div`
  display: flex;
  align-items: center;
  flex-direction: column;

  & > img {
    width: 8rem;
    margin-top: 1rem;
  }

  & > *[role="button"] {
    margin-top: 2rem;
  }

  & > *[role="button"] > div {
    margin: 0;
  }

  & > *[role="button"] > div > svg {
    border: 2px solid rgb(66, 133, 244);
  }
`;

const AdminSectionTitle = styled.div`
  font-size: 1.3rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: 1rem;
`;

export const AdminContainer = styled.div`
  display: flex;
  flex-direction: row;
  position: relative;

  @media only screen and (max-width: ${dealsInfoBreakpoint}) {
    & {
      flex-direction: column-reverse;
    }
  }
`;

export const ExistingDealsList = styled.div`
  max-width: 30rem;
  margin-right: 1rem;
  margin-bottom: 1rem;
  align-self: center;

  @media only screen and (max-width: ${smallBreakpoint}) {
    & {
      margin-top: 2rem;
      margin-left: 1rem;
    }
  }
`;

const SingleDealInfoContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-grow: 1;
  padding: 1rem;
  padding-top: 0;

  @media only screen and (max-width: ${smallBreakpoint}) {
    flex-direction: column-reverse;
  }
`;

const FormContainer = styled.div`
  display: flex;
  justify-content: center;
  flex-grow: 2;
  margin-bottom: 1rem;
  margin-right: 1rem;

  @media only screen and (max-width: ${smallBreakpoint}) {
    & {
      flex-direction: column-reverse;
      align-items: center;
      margin-right: 0;
    }
  }
`;

const DealForm = styled(Form)`
  width: 100%;
  max-width: 30rem;
`;

const PriceInput = styled(Form.Control)`
  margin-bottom: 1rem;
`;

const GameFormButtonsContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const GameFormStorageButtons = styled.div`
  display: flex;
  justify-content: space-between;
`;

const SaveButton = styled(Button)`
  max-width: 7rem;
`;

const GameFormNotificationButtonContainer = styled.div`
  display: flex;
  margin-top: 1rem;

  & > span {
    align-self: center;
    margin-left: 1rem;
    margin-right: 1rem;
  }

  & > select {
    max-width: 5rem;
  }
`;

const NotificationHelpTooltip = styled(HelpTooltip)`
  align-self: center;
  margin-left: 0.5rem;
`;

const DealPreviewContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
  align-items: center;

  flex-grow: 1;
`;

const MaxHeightListGroup = styled(ListGroup)`
  max-height: 500px;
  overflow-y: auto;
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
  const [
    selectedNotificationChannel,
    setSelectedNotificationChannel,
  ] = useState("main");
  const [showResendNotifModal, setShowResendNotifModal] = useState(false);
  const [confirmResendNotif, setConfirmResendNotif] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);

  var nameInput;
  var imageInput;

  const updateAllDeals = useCallback(() => {
    setLoading(true);

    return firebaseClients.firestore
      .collection("deals")
      .orderBy("expires", "desc")
      .onSnapshot(querySnapshot => {
        setLoading(false);

        const deals = querySnapshot.docs.map(doc => {
          return {
            id: doc.id,
            ...doc.data(),
          };
        });

        setAllDeals(deals);

        // Update gameFormData with new data if an existing
        // deal is currently selected
        if (gameFormData.selectedDealId !== null) {
          for (var i in deals) {
            const deal = deals[i];

            if (deal.id === gameFormData.selectedDealId) {
              selectExistingDeal(deal);
            }
          }
        }
      });
  }, [
    firebaseClients.firestore,
    setLoading,
    setAllDeals,
    gameFormData.selectedDealId,
  ]);

  useEffect(() => {
    if (user && user.isAdmin === true) {
      updateAllDeals();
    }
  }, [user, updateAllDeals]);

  const login = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebaseClients.auth.signInWithPopup(provider).catch(error => {
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
            notificationSent: {},
          })
          .catch(error => setError("Error adding document: " + error))
          .then(docRef => {
            return firebaseClients.functions.httpsCallable("notify")({
              dealId: docRef.id,
            });
          })
          .catch(err => setError("Failed to notify users: " + err))
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

  const manualSendNotification = () => {
    // Check if a notification has already been sent for this deal
    const channel = selectedNotificationChannel;
    const notificationSent = gameFormData.notificationSent;

    if (channel in notificationSent && notificationSent[channel] === true) {
      if (confirmResendNotif === true) {
        setConfirmResendNotif(false);
      } else {
        setShowResendNotifModal(true);
        return;
      }
    }

    setSendingNotification(true);
    firebaseClients.functions
      .httpsCallable("notify")({
        dealId: gameFormData.selectedDealId,
        channel: channel,
        confirmResend: confirmResendNotif,
      })
      .then(() => updateAllDeals())
      .then(() => {
        setToastMsg(
          `Sent notification for ${gameFormData.name} on ` +
            `the ${channel} channel`
        );
        setShowToast(true);
        setSendingNotification(false);
      })
      .catch(err => {
        console.error("Failed to send notification for deal", err);
        setError(
          `Failed to send notification for ${gameFormData.name} on ` +
            `the ${channel} channel: ${err}`
        );
        setSendingNotification(false);
      });
  };

  const deleteRecord = () => {
    if (!gameFormData.selectedDealId) return;

    firebaseClients.firestore
      .collection("deals")
      .doc(gameFormData.selectedDealId)
      .delete()
      .then(() =>
        resetForm(
          `Record deleted: ${gameFormData.selectedDealId} (${gameFormData.name})`
        )
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
      onChange={expires =>
        setGameFormData({
          ...gameFormData,
          expires: expires,
        })
      }
    />
  );

  return (
    <Layout fluid>
      <Error error={[error, setError]} />
      <SEO title="Admin" />
      {user && user.isAdmin === true ? (
        <React.Fragment>
          <AdminContainer>
            <ExistingDealsList>
              <AdminSectionTitle>Existing Game Deals</AdminSectionTitle>
              <MaxHeightListGroup>
                {allDeals.length > 0 ? (
                  allDeals.map(deal => (
                    <ListGroup.Item
                      key={deal.id}
                      active={gameFormData.selectedDealId === deal.id}
                      onClick={() => selectExistingDeal(deal)}
                      action
                    >
                      {deal.name}
                    </ListGroup.Item>
                  ))
                ) : (
                  <ListGroup.Item disabled>
                    No existing game deals.
                  </ListGroup.Item>
                )}
              </MaxHeightListGroup>
            </ExistingDealsList>

            <SingleDealInfoContainer>
              <FormContainer>
                <DealForm
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
                      onChange={e =>
                        setGameFormData({
                          ...gameFormData,
                          name: e.target.value,
                        })
                      }
                      value={gameFormData.name}
                    />
                  </Form.Group>

                  <Form.Group controlId="formPrice">
                    <Form.Label>Price</Form.Label>
                    {!gameFormData.isFree && (
                      <PriceInput
                        required
                        type="number"
                        placeholder="4.99"
                        onChange={e =>
                          setGameFormData({
                            ...gameFormData,
                            price: e.target.value,
                          })
                        }
                        value={gameFormData.price}
                      />
                    )}
                    <CheckInput
                      label={gameFormData.isFree ? "FREE!" : "Free?"}
                      value={gameFormData.isFree}
                      onClick={() =>
                        setGameFormData({
                          ...gameFormData,
                          isFree: !gameFormData.isFree,
                        })
                      }
                    />
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
                        onChange={e =>
                          setGameFormData({
                            ...gameFormData,
                            image: e.target.value,
                          })
                        }
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
                      onChange={e =>
                        setGameFormData({
                          ...gameFormData,
                          link: e.target.value,
                        })
                      }
                      value={gameFormData.link}
                    />
                  </Form.Group>

                  <GameFormButtonsContainer>
                    {gameFormData.selectedDealId ? (
                      <React.Fragment>
                        <GameFormStorageButtons>
                          <SaveButton variant="primary" type="submit">
                            {gameFormData.selectedDealId ? "Save" : "Submit"}
                          </SaveButton>
                          <Button variant="danger" onClick={deleteRecord}>
                            Delete
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => setGameFormData(EMPTY_FORM_STATE)}
                          >
                            Cancel
                          </Button>
                        </GameFormStorageButtons>

                        <div
                          style={{
                            marginTop: "2rem",
                          }}
                        >
                          <h5>Notifications</h5>

                          {Object.keys(gameFormData.notificationSent).map(k => {
                            const channel = k[0].toUpperCase() + k.substring(1);
                            const sent = gameFormData.notificationSent[k];
                            const img =
                              sent === true ? checkedIcon : uncheckedIcon;
                            const imgAlt =
                              sent === true ? "Check mark" : "Empty check box";
                            const txt = sent === true ? "Sent" : "Not sent";
                            return (
                              <div
                                key={channel}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                <img
                                  style={{
                                    width: "1.5rem",
                                  }}
                                  src={img}
                                  alt={imgAlt}
                                />
                                {channel} Notification {txt}
                              </div>
                            );
                          })}
                        </div>

                        <GameFormNotificationButtonContainer>
                          <Button
                            disabled={
                              sendingNotification === true ? true : null
                            }
                            onClick={manualSendNotification}
                            style={{
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            {sendingNotification === true ? (
                              <React.Fragment>
                                <Spinner size="sm" animation="border" />
                                &nbsp;&nbsp;Sending Notification
                              </React.Fragment>
                            ) : (
                              <span>
                                {gameFormData.notificationSent[
                                  selectedNotificationChannel
                                ] === true
                                  ? "Resend"
                                  : "Send"}{" "}
                                Notification
                              </span>
                            )}
                          </Button>

                          <span>To Channel</span>

                          <Form.Control
                            value={selectedNotificationChannel}
                            onChange={e =>
                              setSelectedNotificationChannel(e.target.value)
                            }
                            as="select"
                          >
                            <option value="main">Main</option>
                            <option value="test">Test</option>
                          </Form.Control>

                          <NotificationHelpTooltip
                            message={
                              'The "Main" channel sends the ' +
                              "notification to all regular users. " +
                              'While "Test" sends only to admins who ' +
                              "have opted into test notifications"
                            }
                          />
                        </GameFormNotificationButtonContainer>
                      </React.Fragment>
                    ) : (
                      <SaveButton variant="primary" type="submit">
                        Submit
                      </SaveButton>
                    )}
                  </GameFormButtonsContainer>
                </DealForm>
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
            </SingleDealInfoContainer>

            <Modal
              show={showResendNotifModal}
              onHide={() => setShowResendNotifModal(false)}
            >
              <Modal.Header closeButton>
                <Modal.Title>A Notification Has Already Been Sent</Modal.Title>
              </Modal.Header>

              <Modal.Body>
                <p>
                  A notification has already been sent for &nbsp;
                  {gameFormData.name} to the {selectedNotificationChannel}
                  &nbsp; notification channel.
                  <br />
                  <br />
                  Are you sure you want to send another one? This might annoy
                  some users which could cause them to unsubscribe from
                  notifications.
                </p>

                <CheckInput
                  label="I understand this is a bad idea"
                  value={confirmResendNotif}
                  onClick={() => setConfirmResendNotif(!confirmResendNotif)}
                />
              </Modal.Body>

              <Modal.Footer>
                <Button
                  variant="danger"
                  onClick={() => setShowResendNotifModal(false)}
                >
                  Cancel
                </Button>

                <Button
                  onClick={() => {
                    setShowResendNotifModal(false);
                    manualSendNotification();
                  }}
                  disabled={confirmResendNotif === false ? true : null}
                >
                  Resend Notification
                </Button>
              </Modal.Footer>
            </Modal>

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
        <NotLoggedInContainer>
          <Alert variant="danger">
            You must be logged in to view this page
          </Alert>
          <img src={oliverIcon} alt="Oliver's face" />
          <GoogleButton onClick={login} />
        </NotLoggedInContainer>
      )}
    </Layout>
  );
};

const WrappedAdminPage = () => {
  return (
    <Providers>
      <AdminPage />
    </Providers>
  );
};

export default WrappedAdminPage;
