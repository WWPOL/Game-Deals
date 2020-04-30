import React, { useState, useEffect } from "react";

import firebase from "gatsby-plugin-firebase";
import { useStaticQuery, graphql } from "gatsby";
import styled from "styled-components";

import Toast from "react-bootstrap/Toast";

import Layout from "../components/Layout";
import SEO from "../components/SEO";
import DealCard from "../components/DealCard";
import Loader from "../components/Loader";
import NotificationButton from "../components/NotificationButton";

import errorIcon from "../images/error.png";
import sadIcon from "../images/sad.png";

import "./index.scss";

import { DealWrapper } from "../styles";

const ErrorContext = React.createContext(() => {});
const UserContext = React.createContext([{}, ()  => {}]);
const FirebaseContext = React.createContext({});

const NoDeals = styled.div`
  margin-top: 2rem;
`;

const NoDealsHeader = styled.div`
  display: flex;
  align-items: center;
`;

const NoDealsImg = styled.img`
  width: 4rem;
  height: 4rem;
  flex-grow: 0;
  flex-shrink: 0;
`;

const NoDealsH3 = styled.h3`
  display: inline-block;
  margin-left: 1rem;
`;

const NoDealsP = styled.p`
  padding: 1rem;
  padding-left: 0;
  margin-left: 5rem;
`;

const Error = (props) => {
  const [error, setError] = props.error;

  if (error !== null) {
	  console.error("App error. User message:", error[0],
                  "Internal message:", error[1]);

	  // Convert error into string, ensure first letter is uppercase, ends in period
	  var strError = String(error[0]);
	  strError = strError.charAt(0).toUpperCase() + strError.slice(1);
    if (strError[strError.length - 1] !== ".") {
      strError += ".";
    }
	  
	  const doClose = () => {
		  setError(null);
	  };

	  return (
		  <Toast id="error-toast"
			  onClose={doClose}>
			  <Toast.Header>
				  <img src={errorIcon}
				    id="error-icon"
				    className="rounded mr-2"
				    alt="Error icon" />
				  
				  <strong className="mr-auto">
				    Error
				  </strong>
			  </Toast.Header>
			  <Toast.Body>
				  {strError}
			  </Toast.Body>
		  </Toast>
	  );
  }
  
  return null;
};

const IndexPage = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  const { site } = useStaticQuery(
    graphql`
      query {
        site {
          siteMetadata {
            emulateFirebase
          }
        }
      }
    `
  );

  const emulateFirebase = site.siteMetadata.emulateFirebase;

  const firestore = firebase.firestore();
  const functions = firebase.functions();
  const auth = firebase.auth();
  const messaging = firebase.messaging();

  if (emulateFirebase === true) {
    firestore.settings({
      host: "localhost:8080",
      ssl: false,
    });
    
    functions.useFunctionsEmulator("http://localhost:5001");
  }

  useEffect(() => {
    // Get deals
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    firestore
      .collection("deals")
      .where("expires", ">=", cutoff)
      .orderBy("expires", "asc")
      .onSnapshot(querySnapshot => {
        setLoading(false);
        
        setDeals(querySnapshot.docs.map(doc => doc.data()).map(deal => {
          return {
            ...deal,
            expires: deal.expires.toDate(),
          };
        }));
      });
  }, [firestore]);

  if (loading) return <Loader />;

  return (
    <ErrorContext.Provider value={setError}>
      <UserContext.Provider value={[user, setUser]}>
        <FirebaseContext.Provider value={{
          functions: functions,
          firestore: firestore,
          auth: auth,
          messaging: messaging,
        }}>
          <Error error={[error, setError]} />
          
          <Layout>
            <SEO title="Home" />

            <DealWrapper>
              {deals.length > 0 ?
                              deals.map((deal, i) =>
                                <DealCard key={i} {...deal} />)
              :
                              <NoDeals>
                                <NoDealsHeader>
                                  <NoDealsImg
                                    src={sadIcon}
                                    alt="Sad face" />
                                  <NoDealsH3>
                                    Sorry, There Are No Deals Right Now
                                  </NoDealsH3>
                                </NoDealsHeader>
                                <NoDealsP>
                                  Subscribe to deal alerts to receive a 
                                  notification when there is a new deal.
                                </NoDealsP>
                              </NoDeals>
              }
            </DealWrapper>

            <NotificationButton />
          </Layout>
        </FirebaseContext.Provider>
      </UserContext.Provider>
    </ErrorContext.Provider>
  );
};

export default IndexPage;
export { ErrorContext, UserContext, FirebaseContext };
