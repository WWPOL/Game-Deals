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

import { DealWrapper } from "../styles";

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
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    firebase
      .firestore()
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
  });

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
