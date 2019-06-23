import React, { Component } from 'react';
import InfiniteScroll from 'react-infinite-scroller';

import Deal from './Deal'
import './Deals.css'

class DealsList extends Component {
  constructor(props) {
    super(props);

    this.loadDeals = this.loadDeals.bind(this);

    this.state = {
      deals: [1,2,3],
      hasMoreDeals: true,
      nextId: null
    };
  }

  loadDeals() {
    this.setState({hasMoreDeals: false});
  }
   
  render() {
    const loader = <div key={"loader"} className="loader">Loading ...</div>;

    const { deals, hasMoreDeals} = this.state;

    return (
      <InfiniteScroll
        className="deals-container"
        pageStart={0}
        loadMore={this.loadDeals}
        hasMore={hasMoreDeals}
        loader={loader}
      >
        {deals.map((deal, i) => {
          return (
            <Deal
            key={i}
            />
          );
        })}
      </InfiniteScroll>
    );
  }
}

export default DealsList;
