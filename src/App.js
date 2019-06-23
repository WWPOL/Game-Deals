import React from 'react';
import './App.css';
import './bootstrap.min.css';

import {
  Header,
  SubscribeBox,
  DealsList,
  Rain
} from './components';

import { 
  Container
} from 'react-bootstrap'; 

function App() {
  return (
    <div className="App">
      <Header/>
      <Container>
        <SubscribeBox/>
        <DealsList/>
      </Container>
      <Rain/>
    </div>
  );
}

export default App;
