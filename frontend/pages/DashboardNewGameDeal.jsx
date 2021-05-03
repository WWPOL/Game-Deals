import React, {
  useState,
  useContext,
} from "react";
import {
  useHistory,
  Link,
} from "react-router-dom";
import styled from "styled-components";
import {
  PageHeader,
  Breadcrumb,
  Form,
  Input,
  InputNumber,
  Button,
} from "antd";

import {
  APICtx,
  ErrorCtx,
} from "../App.jsx";
import {
  GoDashGameDeals,
} from "./Dashboard.jsx";

const DshEl = styled.div`
display: flex;
flex-direction: column;
flex-grow: 1;
`;

const DshContent = styled.div`
display: flex;
align-items: center;
flex-direction: column;
`;

const DashboardNewGameDeal = () => {
  const api = useContext(APICtx);
  const showError = useContext(ErrorCtx)[1];
  const history = useHistory();

  /**
   * True if the API request to create the specified game deal is loading.
   */
  const [createLoading, setCreateLoading] = useState(false);

  /**
   * Run when the new game deal form is completed successfully. Makes the API request to create the game deal.
   * @param {object} values Entered values for game deal.
   */
  const onFinish = async (values) => {
    setCreateLoading(true);
    
    const newDeal = await api.createGameDeal({
      game: {
        name: values.game_name,
        image_url: values.game_image_url,
      },
      link: values.link,
      price: values.price,
    });

    history.push(`/dashboard/game_deals/${newDeal._id}`);

    setCreateLoading(false);
  };

  /**
   * Run when the new game deal form is filled out incorrectly.
   * @param {object} err Details about failure.
   */
  const onFinishFailed = (err) => {
    console.trace("onFinishFailed", err);
    showError("Please fill out the new Game Deal form correctly.")
  };
  
  return (
    <DshEl>
      <PageHeader
        onBack={() => GoDashGameDeals(history)}
        title={
          <Breadcrumb>
            <Breadcrumb.Item>
              <Link to="/dashboard/game-deals/">
                Game Deals
              </Link>
            </Breadcrumb.Item>
            <Breadcrumb.Item>New Game Deal</Breadcrumb.Item>
          </Breadcrumb>
        }
      />

      <DshContent>
        <Form
          name="New Game Deal"
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          layout="vertical"
        >
          <Form.Item
            label="Game"
            name="game_name"
            rules={[{
              required: true,
              message: "Game name required",
            }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Cover Image"
            name="game_image_url"
            rules={[{
              required: true,
              message: "Game cover image URL required",
            }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Deal Link"
            name="link"
            rules={[{
              required: true,
              message: "Deal link required",
            }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Price"
            name="price"
            rules={[{
              required: true,
              message: "Price is required",
            }]}
          >
            <InputNumber />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
            >
              Create Game Deal
            </Button>
          </Form.Item>
        </Form>
      </DshContent>
    </DshEl>
  );
};

export default DashboardNewGameDeal;
