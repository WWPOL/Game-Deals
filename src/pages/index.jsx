import React, { useState, useEffect, useContext } from "react";

import styled from "styled-components";

import Layout from "../components/Layout";
import SEO from "../components/SEO";
import DealCard from "../components/DealCard";
import Loader from "../components/Loader";
import NotificationButton from "../components/NotificationButton";

import sadIcon from "../images/sad.png";

import { DealWrapper } from "../styles";
import Error, { ErrorContext } from "../components/Error";
import { FirebaseContext } from "../components/FirebaseProvider";
import Providers from "../components/Providers";

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

const IndexPage = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useContext(ErrorContext);

  const firebase = useContext(FirebaseContext);

  useEffect(() => {
    // Get deals
    const cutoff = new Date();

    firebase.firestore
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
  }, [firebase.firestore]);

  if (loading) return <Loader />;

  return (
    <Layout>
      <Error error={[error, setError]} />
      
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
  );
};

const WrappedIndexPage = () => {
  return (
    <Providers>
      <IndexPage />
    </Providers>
  );
};

export default WrappedIndexPage;
