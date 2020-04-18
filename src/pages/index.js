import React from "react";
import styled from "styled-components";
import firebase from "gatsby-plugin-firebase";

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

class IndexPage extends React.Component {
  state = {
    deals: [],
    loading: true,
    error: null
  };

  componentDidMount() {
    const now = new Date();
    firebase
      .firestore()
      .collection("deals")
      .where("expires", ">=", now)
      .orderBy("expires", "asc")
      .get()
      .then(querySnapshot =>
        this.setState({
          deals: querySnapshot.docs.map(doc => doc.data()),
          loading: false
        })
      )
      .catch(function(error) {
        console.log("Error getting documents: ", error);
      });
  }

  render() {
    const { deals, loading, error } = this.state;

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
  }
}

export default IndexPage;
