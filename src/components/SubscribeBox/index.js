import React, { Component } from 'react';

import { 
  Button
} from 'react-bootstrap'; 

class SubscribeBox extends Component {
  render() {
    return (
      <div className="subscribe-box">
        <p className="lead">
          Get new game deals sent right to your device! Subscribe for updates here!
        </p>
        <Button>Subscribe</Button>
      </div>
    );
  }
}

export default SubscribeBox;
