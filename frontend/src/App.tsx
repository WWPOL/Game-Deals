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
import "~/antd.less";

import { SharedProm } from "~/lib/shared-prom";
import API from "~/api";
import { Header } from "~/components/Header";
import { Home } from "~/pages/Home";
import { Dashboard } from "~/pages/Dashboard";

export const ErrorCtx = React.createContext(() => {});
export const AuthCtx = React.createContext([() => {}, () => {}]); // [ getAuth(action), clearAuth() ]

const AppEl = styled.div`
width: 100%;
height: 100%;
display: flex;
flex-direction: column;
  /* background: #212121; */
`;

const ErrorContainer = styled.div`
margin-top: 0.5rem;
padding: 0.5rem;
display: flex;
z-index: 2;
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
padding-left: 0.5rem;
font-size: 1rem;
font-weight: bold;
`;

/**
 * Wrap the contents of this element with all the context providers in the app.
 * Provides the API client and the error box.
 * @param header - Elements which make up the header, will be wrapped in context providers.
 * @param children - Child elements to place inside the context providers. 
 * @returns {Elements} Header and children wrapped with context providers. If the user needs to login the children will be temporarily replaced with a login screen.
 */
const Ctxs = ({
  header,
  children,
}: {
  readonly header: React.Elements,
  readonly children: React.Elements,
}) => {
  /**
   * An error string to display to the user. Set to null if there is no error.
   */
  const [error, setError] = useState(null);
  
  return (
    <ErrorCtx.Provider value={{ error, setError }}>
      {error !== null && (
        <ErrorContainer>              
          <ErrorTxt>
            Error: {error}
          </ErrorTxt>

          <ErrorButton onClick={() => setError(null)}>
            <CloseCircleOutlined />
          </ErrorButton>
        </ErrorContainer>
      )}

      {header}

      {children}
    </ErrorCtx.Provider>
  );
};

/**
 * Main application.
 * @returns {Elements} Website elements.
 */
export function App() {
  return (
    <AppEl>
      <Router>
        <Ctxs
          header={<Header />}
        >
          <Switch>
            <Route path="/dashboard">
              <Dashboard />
            </Route>

            <Route path="/">
              <Home />
            </Route>
          </Switch>
        </Ctxs>
      </Router>
    </AppEl>
  );
};
