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

import { SharedProm } from "~/lib/shared-prom";
import {
  UnauthorizedError,
  ERROR_CODE_MUST_RESET_PASSWORD,
} from "~/api";
import {
  ErrorCtx,
  APICtx,
} from "~/App";

const LoginContainer = styled.div`
display: flex;
align-items: center;
flex-direction: column;
`;

export function Login({
  getAuthFinishedProm,
}: {
  readonly getAuthFinishedProm: SharedProm
}) {
  const { setError } = useContext(ErrorCtx);
  const api = useContext(APICtx);

  const [mustResetPassword, setMustResetPassword] = useState(false);
  
  /**
   * Runs when the login UI is successfully filled out by the user.
   * @param {object} values Form values.
   */
  const onLoginFormFinish = async (values) => {
    let authToken = undefined;
    
    try {
      let newPassword?: bool = undefined;

      if (mustResetPassword) {
        if (values.new_password !== values.confirm_new_password) {
          setError("The new password and the new password confirmation did not match")
          return;
        }

        newPassword = values.new_password;
      }
      
      authToken = await api.login(values.username, values.password, newPassword);
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        if (e.error_code === ERROR_CODE_MUST_RESET_PASSWORD) {
          // User entered correct password, but must now set a new password before fully logging in
          if (mustResetPassword) {
            // Huh, we just got the user to reset their password, call it an error so we don't get stuck in an infinite loop
            setError("Failed to login and reset password");
            return;
          }
          
          setMustResetPassword(true);
          return;
        } else {
          // Wrong password
          setError("Failed to login.");
          return;
        }
      }
    }

    // TODO: Make it so reset password works, make confirm new password entered twice correctly
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
