import React from "react";
import firebase from "gatsby-plugin-firebase";

import Layout from "../components/Layout";
import SEO from "../components/SEO";
import DealCard from "../components/DealCard";
import Loader from "../components/Loader";
import { DealWrapper } from "../styles";

class IndexPage extends React.Component {
  state = {
    deals: [],
    loading: true,
    error: null,
  };

  componentDidMount() {
    const cutoff = new Date();
    firebase
      .firestore()
      .collection("deals")
      .where("expires", ">=", cutoff)
      .orderBy("expires", "asc")
      .onSnapshot(querySnapshot =>
        this.setState({
          deals: querySnapshot.docs
            .map(doc => doc.data())
            .map(deal => {
              return {
                ...deal,
                expires: deal.expires.toDate(),
              };
            }),
          loading: false,
        })
      );
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
