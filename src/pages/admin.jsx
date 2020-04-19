import React from "react";
import styled from "styled-components";
import firebase from "gatsby-plugin-firebase";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Toast from "react-bootstrap/Toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import Layout from "../components/Layout";
import SEO from "../components/SEO";
import Loader from "../components/Loader";

const AdminContainer = styled.div`
  display: flex;
`;

const FormContainer = styled.div`
  display: flex;
  justify-content: center;
  flex: 1;
`;

const GreetingContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const RecordList = styled.ul`
  background: rebeccapurple;
  color: white;
  padding: 10px;

  & > li {
    cursor: pointer;
  }
`;

const FixedToast = styled(Toast)`
  position: fixed;
  top: 25px;
  right: 25px;
`;

const EMPTY_FORM_STATE = {
  gameName: "",
  gamePrice: "",
  gameIsFree: false,
  gameExpires: new Date(),
  gameLink: "",
  selectedDealId: null,
};

class AdminPage extends React.Component {
  state = {
    user: null,
    loading: true,
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

      db.collection("deals").onSnapshot(querySnapshot => {
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

  logout = () => {
    firebase.auth().signOut();
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
        gameLink,
      } = this.state;

      firebase
        .firestore()
        .collection("deals")
        .add({
          name: gameName,
          price: gameIsFree ? 0 : gamePrice,
          isFree: gameIsFree,
          expires: gameExpires,
          link: gameLink,
        })
        .then(docRef =>
          this.setState({
            submittedDocRef: docRef.id,
            showToast: true,
            validated: false,
            ...EMPTY_FORM_STATE,
          })
        )
        .catch(error => console.error("Error adding document: ", error));
    }
  };

  selectExistingDeal = deal => {
    const { name, price, isFree, expires, link, id } = deal;
    this.setState({
      gameName: name,
      gamePrice: price,
      gameIsFree: isFree,
      gameExpires: expires.toDate(),
      gameLink: link,
      selectedDealId: id,
    });
  };

  render() {
    const {
      user,
      loading,
      error,
      validated,
      gameName,
      gamePrice,
      gameIsFree,
      gameExpires,
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
          <>
            <AdminContainer>
              <RecordList>
                <h3>Existing Records</h3>
                {allDeals.map(deal => (
                  <li
                    key={deal.id}
                    onClick={() => this.selectExistingDeal(deal)}
                  >
                    {deal.name}
                  </li>
                ))}
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
            <GreetingContainer>
              <h1>Welcome, {user.displayName}!</h1>
              <Button onClick={this.logout}>Log out</Button>
            </GreetingContainer>
          </>
        ) : (
          <Button onClick={this.login}>Log in</Button>
        )}
      </Layout>
    );
  }
}
// move logout to header
export default AdminPage;
