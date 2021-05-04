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
  Typography,
} from "antd";
const { Title } = Typography;

import {
  APICtx,
  ErrorCtx,
} from "../App.jsx";
import {
  GoDashGameDeals,
} from "./Dashboard.jsx";
import InputMoney from "../components/InputMoney.jsx";

const DshEl = styled.div`
display: flex;
flex-direction: column;
flex-grow: 1;
align-items: flex-start;
`;

const DshContent = styled.div`
width: 100%;
padding-left: 1rem;
padding-right: 1rem;
display: flex;
flex-direction: column;
align-items: center;
`;

const FormContainer = styled.div`
width: 100%;
max-width: 40rem;
display: flex;
flex-direction: column;
align-items: flex-start;
`;

const NewDealForm = styled(Form)`
width: 100%;
display: flex;
flex-direction: column;
flex-grow: 1;
`;

const FormOverview = styled.div`
width: 100%;
display: flex;
flex-direction: column;
align-items: flex-start;
flex-grow: 1;
`;

const FormTitle = styled(Title)`
display: flex;
`;

const FormDescription = styled.div`
display: flex;
font-style: italic;
flex-grow: 1;
`;

const FormSection = styled.div`
display: flex;
flex-direction: column;
flex-grow: 1;
`;

const SectionTitle = styled(Title)`
display: flex;
flex-grow: 1;
margin-bottom: 0 !important;
`;

const SectionContent = styled.div`
display: flex;
flex-direction: column;
flex-grow: 1;

.ant-row {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  /* margin-bottom: 3.5rem; */

  .ant-form-item-label {
    display: flex;
  }

  .ant-form-item-control {
    display: flex;
    margin-bottom: 1rem
  }
}
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
    showError("Please fill out the new game deal form correctly.")
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
        <FormContainer>
          <FormOverview>
            <FormTitle level={2}>
              New Game Deal
            </FormTitle>

            <FormDescription>
              Create a new game deal by entering information below.
            </FormDescription>
          </FormOverview>
          
          <NewDealForm
            name="new-game-deal"
            onFinish={onFinish}
            onFinishFailed={onFinishFailed}
          >
            <FormSection>
              <SectionTitle level={3}>
                Game
              </SectionTitle>

              <SectionContent>
                <Form.Item
                  label="Game Name"
                  name="game_name"
                  hint="Game name"
                  rules={[{
                    required: true,
                    message: "Game name required",
                  }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item
                  label="Game Image Link"
                  name="game_image_url"
                  rules={[{
                    required: true,
                    message: "Game image link required",
                  }]}
                >
                  <Input />
                </Form.Item>
              </SectionContent>
            </FormSection>

            <FormSection>
              <SectionTitle level={3}>
                Deal
              </SectionTitle>

              <SectionContent>
                <Form.Item
                  label="Post-Deal Price"
                  name="price"
                  rules={[{
                    required: true,
                    message: "Price is required",
                  }]}
                >
                  <InputMoney />
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
              </SectionContent>
            </FormSection>

            <FormSection>
              <SectionContent>
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                  >
                    Create Game Deal
                  </Button>
                </Form.Item>
              </SectionContent>
            </FormSection>
          </NewDealForm>
        </FormContainer>
      </DshContent>
    </DshEl>
  );
};

export default DashboardNewGameDeal;
