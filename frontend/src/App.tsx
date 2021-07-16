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
  Form,
  Input,
  Checkbox,
} from "antd";
import {
  CloseCircleOutlined,
} from "@ant-design/icons";
import "~/antd.less";

import { API } from "~/api";
import { Header } from "~/components/Header";
import { Home } from "~/pages/Home";
import { Dashboard } from "~/pages/Dashboard";

const APICtx = React.createContext({});
const ErrorCtx = React.createContext(() => {});
const AuthCtx = React.createContext([() => {}, () => {}]); // [ getAuth(action), clearAuth() ]

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
 * Allows for a promise to be resolved or rejected from anywhere.
 * @property {Promise} prom Internal promise used in resolve(), reject(), and when().
 * @property {function(data)} promResolve Function which will resolve the internal promise.
 * @property {function(data)} promReject Function which will reject the internal promise.
 */
class SharedProm {
  /**
   * Creates a new SharedProm;
   * @returns {SharedProm} New shared promise.
   */
  constructor() {
    this.reset();
  }

  /**
   * Reject the current promise (so that any hanging calls to this.when() exit. Then reset the internal this.prom Promise.
   */
  reset() {
    // End any existing calls to this.when();
    if (this.prom !== undefined) {
      this.promReject(new Error("The shared promise was reset"));
    }

    // Setup new internal Promise
    let self = this;
    this.prom = new Promise((resolve, reject) => {
      self.promResolve = resolve;
      self.promReject = reject;
    });
  }

  /**
   * Waits for shared promise to resolve or reject. Then resets the promise for future use.
   * @returns {Promise} Resolve or reject result.
   */
  async when() {
    const result = await this.prom;

    this.reset();

    return result;
  }

  /**
   * Resolves the shared promise.
   * @param {any} [data] Information to return when shared promise resolves.
   */
  resolve(data) {
    this.promResolve(data);
  }

  /**
   * Rejects the shared promise.
   * @param {any} [data] Information to return when shared promise rejects.
   */
  reject(data) {
    this.promReject(data);
  }
}

/**
 * The local storage key in which the API authorization token will be stored. This value will be set to null if the user is not logged in.
 */
const LOCAL_STORAGE_API_AUTH_TOKEN_KEY = "apiAuthToken";

let getAuthFinishedProm = new SharedProm();

/**
 * Wrap the contents of this element with all the context providers in the app.
 * Provides the API client and the error box.
 * @param {Elements} header Elements which make up the header, will be wrapped in context providers.
 * @param {Elements} children Child elements to place inside the context providers. 
 * @returns {Elements} Header and children wrapped with context providers. If the user needs to login the children will be temporarily replaced with a login screen.
 */
const Ctxs = ({ header, children }) => {
  /**
   * An error string to display to the user. Set to null if there is no error.
   */
  const [error, setError] = useState(null);

  /**
   * Not null if the login menu should be displayed instead of the current page. Should contain a quick user friendly sentence explaining why the user needs to login. Set to null in order to hide the login UI.
   */
  const [loginReason, setLoginReason] = useState(null);

  /**
   * Get API the user's API authorization token. If not logged in then login the user and return the resulting token. If the user is logged in the API authorization token will be saved in local storage under key LOCAL_STORAGE_API_AUTH_TOKEN_KEY.
   * @param {string} action User friendly description of the action which requires authorization.
   * @returns {Promise} Resolves with API authorization token, rejects with error.
   */
  const getAuth = async (action) => {
    // Check if already logged in
    const storedToken = localStorage.getItem(LOCAL_STORAGE_API_AUTH_TOKEN_KEY);

    if (storedToken !== null) {
      return storedToken;
    }

    // Prompt user for login credentials
    setLoginReason(action);

    // Wait for user to complete login flow
    const authToken = await getAuthFinishedProm.when();

    // Save auth token for later
    localStorage.setItem(LOCAL_STORAGE_API_AUTH_TOKEN_KEY, authToken);

    // Hide login prompt
    setLoginReason(null);

    return authToken;
  };

  /**
   * Remove a user's login information from any storage locations. Logs the user out.
   */
  const clearAuth = () => {
    localStorage.removeItem(LOCAL_STORAGE_API_AUTH_TOKEN_KEY);
  };

  const api = new API(setError, getAuth);

  /**
   * Runs when the login UI is successfully filled out by the user.
   * @param {object} values Form values.
   */
  const onLoginFormFinish = async (values) => {
    const authToken = await api.login(values.username, values.password);
    getAuthFinishedProm.resolve(authToken);
  };

  /**
   * Runs when the login UI is filled out incorrectly by the user.
   * @param {object} err Error information.
   */
  const onLoginFormFinishFailed = (err) => {
    console.trace("onLoginFormFinishFailed", err);
    setError("Please fill out the log in form correctly.");
  };
  
  return (
    <ErrorCtx.Provider value={[error, setError]}>
      <AuthCtx.Provider value={[getAuth, clearAuth]}>
        <APICtx.Provider value={api}>
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

          {loginReason === null && (children) || (
            <>
              <b>Log in to {loginReason}</b>
              
              <Form
                name="Log In"
                onFinish={onLoginFormFinish}
                onFinishFailed={onLoginFormFinishFailed}
              >
                <Form.Item
                  label="Username"
                  name="username"
                  rules={[{
                    required: true,
                    message: "Please enter your username",
                  }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item
                  label="Password"
                  name="password"
                  rules={[{
                    required: true,
                    message: "Please enter your password",
                  }]}
                >
                  <Input.Password />
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                  >
                    Log In
                  </Button>
                </Form.Item>
              </Form>
            </>
          )}
        </APICtx.Provider>
      </AuthCtx.Provider>
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

export { App, APICtx, ErrorCtx, AuthCtx };
