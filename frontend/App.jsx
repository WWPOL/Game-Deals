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
import {
  Button,
} from "antd";
import {
  CloseCircleOutlined,
} from "@ant-design/icons";
import "./antd.less";

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

const Error = styled.div`
margin-top: 0.5rem;
padding: 0.5rem;
display: flex;
flex-direction: row;
align-items: center;
background: #d32f2f;
color: white;
position: fixed;
align-self: center;
border-radius: 0.2rem;
`;

const ErrorButton = styled(Button)`
background: none;
border: none;
color: white;

&:hover, &:active {
  background: none;
  color: white;
  border: none;
}
`;

const ErrorTxt = styled.div`
font-size: 1rem;
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
    <ErrorCtx.Provider value={[error, setError]}>
      <APICtx.Provider value={new API(setError)}>
        {error !== null && (
          <Error>
            <ErrorButton onClick={() => setError(null)}>
              <CloseCircleOutlined />
            </ErrorButton>
            
            <ErrorTxt>
              Error: {error}
            </ErrorTxt>
          </Error>
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
