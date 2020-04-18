import React from "react";
import styled from "styled-components";
import firebase from "gatsby-plugin-firebase";
import { useCollectionData } from "react-firebase-hooks/firestore";

import Layout from "../components/Layout";
import SEO from "../components/SEO";
import DealCard from "../components/DealCard";
import Loader from "../components/Loader";

const DealWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;

  & > .card {
    margin: 15px 0;
  }
`;

const IndexPage = () => {
  //const now = new Date();
  let [deals, loading, error] = [null, true, null];
  if (typeof window !== "undefined") {
    [deals, loading, error] = useCollectionData(
      firebase
        .firestore()
        .collection("deals")
        .orderBy("expires", "desc")
    ); //.where("expires", "<=", now) this causes an error with the hook :(
  }

  if (loading) return <Loader />;

  return (
    <Layout>
      <SEO title="Home" />
      {error && (
        <React.Fragment>
          <h1>Uh oh!</h1>
          <p>{error.toString()}</p>
        </React.Fragment>
      )}
      <DealWrapper>
        {deals && deals.map((deal, i) => <DealCard key={i} {...deal} />)}
      </DealWrapper>
    </Layout>
  );
};

export default IndexPage;
