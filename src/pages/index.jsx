import React, { useState, useEffect } from "react";
import styled from "styled-components";
import firebase from "gatsby-plugin-firebase";

import Toast from "react-bootstrap/Toast";

import Layout from "../components/Layout";
import SEO from "../components/SEO";
import DealCard from "../components/DealCard";
import Loader from "../components/Loader";
import NotificationButton from "../components/NotificationButton";

import errorIcon from "../images/error.png";
import "./index.scss";

const DealWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;

  & > .card {
    margin: 15px 0;
  }
`;

const ErrorContext = React.createContext(() => {});

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

  useEffect(() => {
    // Get deals
    const now = new Date();
    firebase
      .firestore()
      .collection("deals")
      .where("expires", ">=", now)
      .orderBy("expires", "asc")
      .get()
      .then((querySnapshot) => {
        let deals = querySnapshot.docs.map(doc => doc.data());
        setDeals(deals);
        setLoading(false);
      })
      .catch((error) => {
        setError(["Error getting deals", error]);
      });
  }, []);

  if (loading) return <Loader />;

  return (
    <ErrorContext.Provider value={setError}>
      <Error error={[error, setError]} />
      
      <Layout>
        <SEO title="Home" />

        <DealWrapper>
          {deals && deals.map((deal, i) => <DealCard key={i} {...deal} />)}
        </DealWrapper>

        <NotificationButton />
      </Layout>
    </ErrorContext.Provider>
  );
};

export default IndexPage;
export { ErrorContext };
