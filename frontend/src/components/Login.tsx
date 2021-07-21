import React, { useContext } from "react";
import styled from "styled-components";
import {
  Button,
  Form,
  Input,
  Checkbox,
} from "antd";

import { ErrorCtx } from "~/App";

const LoginContainer = styled.div`
display: flex;
align-items: center;
flex-direction: column;
`;

export function Login({
  loginReason
}: {
  readonly loginReason: string
}) {
  const { setError } = useContext(ErrorCtx);
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
    <LoginContainer>
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
    </LoginContainer>
  )
}
