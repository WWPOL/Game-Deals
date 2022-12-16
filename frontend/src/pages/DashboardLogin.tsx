import React, {
  useContext,
  useState,
} from "react";
import styled from "styled-components";
import {
  Button,
  Form,
  Input,
  Checkbox,
} from "antd";
import * as E from "fp-ts/Either";

import api, {
  UnauthorizedError,
  ERROR_CODE_MUST_RESET_PASSWORD,
  ERROR_CODE_RESET_PASSWORD_OLD_NOT_ALLOWED,
  EndpointError,
  ERROR_CODE_PASSWORD_TO_PWNED,
} from "~api";
import { LoginResp } from "~api/login";
import { useHandleLeft } from "~lib/error";
import { ErrorCtx } from "~App";
import { setStoredAuthToken } from "~api/auth";

const LoginContainer = styled.div`
display: flex;
align-items: center;
flex-direction: column;
`;

enum LoginState {
  EnteringValues,
  Loading,
  Success,
}

export function DashboardLogin() {
  const { setError } = React.useContext(ErrorCtx);
  const handleLeft = useHandleLeft();

  const [mustResetPassword, setMustResetPassword] = useState(false);
  const [lastSubmit, setLastSubmit] = React.useState({ username: "", password: ""});

  const [loginState, setLoginState] = React.useState(LoginState.EnteringValues);
  
  /**
   * Runs when the login UI is successfully filled out by the user.
   * @param {object} values Form values.
   */
  const onLoginFormFinish = async (values) => {
    setLoginState(LoginState.Loading);
    
    const callAPILogin = async () => {
      if (mustResetPassword) {
        return api.login(lastSubmit.username, lastSubmit.password, values.new_password);
      }

      return api.login(values.username, values.password);
    };

    E.match(
      (l) => {
        setLoginState(LoginState.EnteringValues);
        
        if (l instanceof EndpointError) {
          if (l.error_code === ERROR_CODE_MUST_RESET_PASSWORD) {
            // User entered correct password, but must now set a new password before fully logging in
            if (mustResetPassword) {
              // Huh, we just got the user to reset their password, call it an error so we don't get stuck in an infinite loop
              setError("Failed to login and reset password");
              return;
            }
            
            setMustResetPassword(true);
            setLastSubmit({
              username: values.username,
              password: values.password,
            });
            return;
          } else if (l.error_code == ERROR_CODE_RESET_PASSWORD_OLD_NOT_ALLOWED) {
            setError("Cannot reset your password to be the same as your old password");
            return;
          } else if (l.error_code == ERROR_CODE_PASSWORD_TO_PWNED) {
            setError(l.error)
            return;
          }
        }
      },
      (resp: LoginResp) => {
        setStoredAuthToken(resp.auth_token);
        setLoginState(LoginState.Success);
      }
    )(await callAPILogin());
  };

  /**
   * Runs when the login UI is filled out incorrectly by the user.
   * @param {object} err Error information.
   */
  const onLoginFormFinishFailed = (err) => {
    console.trace("onLoginFormFinishFailed", err);
    setError("Please fill out the log in form correctly.");
  };

  if (loginState == LoginState.Loading) {
    return (
      <p>Loading</p>
    )
  }

  if (loginState == LoginState.Success) {
    return (
      <p>Success</p>
    )
  }
  
  return (
    <LoginContainer>
      {!mustResetPassword && (
        <b>Log in</b>
      ) || (
        <b>For security reasons please reset your password before continuing</b>
      )}
      
      <Form
        name={!mustResetPassword ? "Log In" : "Reset Password"}
        onFinish={onLoginFormFinish}
        onFinishFailed={onLoginFormFinishFailed}
      >
        {!mustResetPassword && (
          <>
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
          </>
        ) || (
          <>
            <Form.Item
              label="New Password"
              name="new_password"
              rules={[{
                required: true,
                message: "Please enter a new password",
              }]}
            >
              <Input.Password />
            </Form.Item>

            <Form.Item
              label="Confirm New Password"
              name="confirm_new_password"
              rules={[{
                required: true,
                message: "Confirm new password",
              }]}
            >
              <Input.Password />
            </Form.Item>
          </>
        )}

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
          >
            {!mustResetPassword && (
              "Log In"
            ) || (
              "Reset Password"
            )}
          </Button>
        </Form.Item>
      </Form>
    </LoginContainer>
  )
}
