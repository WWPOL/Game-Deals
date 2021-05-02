import React, {
  useEffect,
  useState,
} from "react";
import styled from "styled-components";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";
import 'antd/dist/antd.css';

import API from "./api";
import Header from "./components/Header.jsx";
import Home from "./pages/Home.jsx";
import Dashboard from "./pages/Dashboard.jsx";

const APICtx = React.createContext({});
const ErrorCtx = React.createContext(() => {});

const AppEl = styled.div`
width: 100%;
height: 100%;
display: flex;
flex-direction: column;
  /* background: #212121; */
`;

/**
 * Wrap the contents of this element with all the context providers in the app.
 * Provides the API client and the error box.
 * @param {Elements} children Child elements to place inside the context providers.
 * @returns {Elements} Children wrapped with context providers.
 */
const Ctxs = ({ children }) => {
  const [error, setError] = useState(null);
  
  return (
    <ErrorCtx.Provider value={setError}>
      <APICtx.Provider value={new API(setError)}>
        {error !== null && (
          <div>
            <b><u>Error: {error}</u></b>
          </div>
        )}
        
        {children}
      </APICtx.Provider>
    </ErrorCtx.Provider>
  );
};

/**
 * Main application.
 * @returns {Elements} Website elements.
 */
const App = () => {
  return (
    <AppEl>
      <Ctxs>
        <Router>
          <Header />
          
          <Switch>
            <Route path="/dashboard">
              <Dashboard />
            </Route>

            <Route path="/">
              <Home />
            </Route>
          </Switch>
        </Router>
      </Ctxs>
    </AppEl>
  );
};

export default App;
export { APICtx, ErrorCtx };
