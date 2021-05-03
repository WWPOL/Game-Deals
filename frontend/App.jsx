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
import "./antd.less";

import API from "./api";
import Header from "./components/Header.jsx";
import Home from "./pages/Home.jsx";
import Dashboard from "./pages/Dashboard.jsx";

const APICtx = React.createContext({});
const ErrorCtx = React.createContext(() => {});
const GetAuthCtx = React.createContext(() => {});

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
 * Allows for a promise to be resolved or rejected from anywhere.
 */
class SharedProm {
  /**
   * Creates a new SharedProm;
   * @returns {SharedProm} New shared promise.
   */
  constructor() {
    let self = this;
    this.prom = new Promise((resolve, reject) => {
      self.promResolve = resolve;
      self.promReject = reject;
    });
  }

  /**
   * Waits for shared promise to resolve or reject.
   * @returns {Promise} Resolve or reject result.
   */
  async when() {
    return await this.prom;
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
 * @param {Elements} children Child elements to place inside the context providers.
 * @returns {Elements} Children wrapped with context providers.
 */
const Ctxs = ({ children }) => {
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

    localStorage.setItem(LOCAL_STORAGE_API_AUTH_TOKEN_KEY, authToken);

    setLoginReason(null);

    return authToken;
  };

  const api = new API(setError, getAuth);

  const onLoginFormFinish = async (values) => {
    const authToken = await api.login(values.username, values.password);
    getAuthFinishedProm.resolve(authToken);
  };

  const onLoginFormFinishFailed = (err) => {
    console.trace("onLoginFormFinishFailed", err);
    setError("Please fill out the log in form correctly.");
  };

  useEffect(() => {
    console.log("getAuth(): called");
    getAuth("foo fee").then((res) => {
      console.log("getAuth(): done: ", res);
    });
  }, []);
  
  return (
    <ErrorCtx.Provider value={[error, setError]}>
      <GetAuthCtx.Provider value={getAuth}>
        <APICtx.Provider value={api}>
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

          {loginReason === null && (children) || (
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
          )}
        </APICtx.Provider>
      </GetAuthCtx.Provider>
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
