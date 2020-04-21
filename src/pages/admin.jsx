import React from "react";
import axios from "axios";
import firebase from "gatsby-plugin-firebase";
import Spinner from "react-bootstrap/Spinner";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Toast from "react-bootstrap/Toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import Layout from "../components/Layout";
import SEO from "../components/SEO";
import Loader from "../components/Loader";
import {
  AdminContainer,
  FormContainer,
  RecordList,
  GhostButton,
  FixedToast,
} from "../styles";

const EMPTY_FORM_STATE = {
  gameName: "",
  gamePrice: "",
  gameIsFree: false,
  gameExpires: new Date(),
  gameImage: "",
  gameLink: "",
  selectedDealId: null,
};

class AdminPage extends React.Component {
  state = {
    user: null,
    loading: true,
    searching: false,
    error: null,
    validated: false,
    showToast: false,
    submittedDocRef: "",
    allDeals: [],
    ...EMPTY_FORM_STATE,
  };

  componentDidMount() {
    firebase.auth().onAuthStateChanged(user => {
      const db = firebase.firestore();

      db.collection("admins")
        .get()
        .then(() => this.setState({ user, error: null, loading: false }))
        .catch(() =>
          this.setState({
            user: null,
            error: "Holup, you're not Olly G!",
            loading: false,
          })
        );

      db.collection("deals")
        .orderBy("expires", "desc")
        .onSnapshot(querySnapshot => {
          const allDeals = querySnapshot.docs.map(doc => {
            return {
              id: doc.id,
              ...doc.data(),
            };
          });

          this.setState({ allDeals });
        });
    });
  }

  login = () => {
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

  handleSubmit = event => {
    event.preventDefault();
    this.setState({ validated: true });

    const form = event.currentTarget;
    if (form.checkValidity() === false) {
      event.stopPropagation();
    } else {
      const {
        gameName,
        gamePrice,
        gameIsFree,
        gameExpires,
        gameImage,
        gameLink,
        selectedDealId,
      } = this.state;

      const gameData = {
        name: gameName,
        price: gameIsFree ? 0 : gamePrice,
        isFree: gameIsFree,
        expires: gameExpires,
        image: gameImage,
        link: gameLink,
      };

      const resetForm = id =>
        this.setState({
          submittedDocRef: id,
          showToast: true,
          validated: false,
          ...EMPTY_FORM_STATE,
        });

      if (selectedDealId) {
        firebase
          .firestore()
          .collection("deals")
          .doc(selectedDealId)
          .update(gameData)
          .then(() => resetForm(selectedDealId))
          .catch(error => console.error("Error adding document: ", error));
      } else {
        firebase
          .firestore()
          .collection("deals")
          .add(gameData)
          .then(docRef => resetForm(docRef.id))
          .catch(error => console.error("Error adding document: ", error));
      }
    }
  };

  selectExistingDeal = deal => {
    const { name, price, isFree, expires, image, link, id } = deal;
    this.setState({
      gameName: name,
      gamePrice: price,
      gameIsFree: isFree,
      gameExpires: expires.toDate(),
      gameImage: image,
      gameLink: link,
      selectedDealId: id,
    });
  };

  suggestImage = query => {
    if (!query) {
      this.nameInput.focus();
      return;
    } else if (this.state.searching) {
      return;
    } else if (this.state.gameImage) {
      this.imageInput.focus();
      return;
    }

    this.setState({ searching: true });
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
      .then(res =>
        this.setState({ gameImage: res.data.value[0].url, searching: false })
      )
      .catch(error => console.error(error));
  };

  render() {
    const {
      user,
      loading,
      searching,
      error,
      validated,
      gameName,
      gamePrice,
      gameIsFree,
      gameExpires,
      gameImage,
      gameLink,
      showToast,
      submittedDocRef,
      allDeals,
      selectedDealId,
    } = this.state;

    if (loading) return <Loader />;

    const Datepicker = () => (
      <DatePicker
        selected={gameExpires}
        onChange={gameExpires => this.setState({ gameExpires })}
      />
    );

    return (
      <Layout fluid>
        <SEO title="Admin" />
        {error && (
          <div>
            <p>{error.toString()}</p>
          </div>
        )}

        {user ? (
          <React.Fragment>
            <AdminContainer>
              <RecordList>
                <h3>Existing Records</h3>
                <ul>
                  {allDeals.map(deal => (
                    <li key={deal.id}>
                      <GhostButton
                        onClick={() => this.selectExistingDeal(deal)}
                      >
                        {deal.name}
                      </GhostButton>
                    </li>
                  ))}
                </ul>
              </RecordList>

              <FormContainer>
                <Form
                  noValidate
                  validated={validated}
                  onSubmit={this.handleSubmit}
                >
                  <h3>
                    {selectedDealId
                      ? "Edit Existing Game Deal"
                      : "Add New Game Deal"}
                  </h3>
                  <Form.Group controlId="formGame">
                    <Form.Label>Game</Form.Label>
                    <Form.Control
                      required
                      ref={input => (this.nameInput = input)}
                      type="text"
                      placeholder="Duke Nukem Forever"
                      onChange={e =>
                        this.setState({ gameName: e.target.value })
                      }
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
                        onChange={e =>
                          this.setState({ gamePrice: e.target.value })
                        }
                        value={gamePrice}
                      />
                    )}
                    <Form.Check
                      type="checkbox"
                      label={gameIsFree ? "FREE!" : "Free?"}
                      onChange={e =>
                        this.setState({ gameIsFree: e.target.checked })
                      }
                      checked={gameIsFree}
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
                        onClick={() => this.suggestImage(gameName)}
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
                        ref={input => (this.imageInput = input)}
                        type="text"
                        placeholder="https://media.gamestop.com/i/gamestop/10084187/Duke-Nukem-Forever"
                        onChange={e =>
                          this.setState({ gameImage: e.target.value })
                        }
                        value={gameImage}
                        disabled={searching}
                      />
                      {gameImage && (
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip>
                              <div
                                style={{
                                  backgroundImage: `url("${gameImage}")`,
                                  width: "300px",
                                  height: "200px",
                                  backgroundSize: "cover",
                                  backgroundRepeat: "no-repeat",
                                  backgroundPosition: "center",
                                }}
                              />
                            </Tooltip>
                          }
                        >
                          <InputGroup.Append>
                            <InputGroup.Text>
                              <span role="img" aria-label="view image">
                                🖼️
                              </span>
                            </InputGroup.Text>
                          </InputGroup.Append>
                        </OverlayTrigger>
                      )}
                    </InputGroup>
                  </Form.Group>

                  <Form.Group controlId="formLink">
                    <Form.Label>Link</Form.Label>
                    <Form.Control
                      required
                      type="text"
                      placeholder="https://store.steampowered.com/app/57900/Duke_Nukem_Forever/"
                      onChange={e =>
                        this.setState({ gameLink: e.target.value })
                      }
                      value={gameLink}
                    />
                  </Form.Group>

                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Button variant="primary" type="submit">
                      {selectedDealId ? "Save" : "Submit"}
                    </Button>
                    {selectedDealId && (
                      <Button
                        variant="secondary"
                        onClick={() => this.setState(EMPTY_FORM_STATE)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </Form>
              </FormContainer>

              <FixedToast
                show={showToast}
                onClose={() => this.setState({ showToast: false })}
                autohide
              >
                <Toast.Header>
                  <strong className="mr-auto">Deal Submitted!</strong>
                </Toast.Header>
                <Toast.Body>Record saved as {submittedDocRef}</Toast.Body>
              </FixedToast>
            </AdminContainer>
          </React.Fragment>
        ) : (
          <Button onClick={this.login}>Log in</Button>
        )}
      </Layout>
    );
  }
}
// move logout to header
export default AdminPage;
