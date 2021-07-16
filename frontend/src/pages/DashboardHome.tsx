import React from "react";
import {
  Link,
} from "react-router-dom";
import styled from "styled-components";
import {
  Card,
} from "antd";
import {
  ShopOutlined,
  UserOutlined,
} from "@ant-design/icons";

import { GoDashHome } from "~/pages/Dashboard";

const DshEl = styled.div`
padding: 1rem;
display: flex;
align-items: center;
flex-direction: column;
flex-grow: 1;
`;

const SectionCard = styled(Card)`
width: 25rem;
margin-top: 1rem;
`;

const SectionLink = styled(Link)`
display: flex;
align-items: center;
`;

const LinkTxt = styled.div`
margin-left: 0.5rem;
`;

/**
 * Displays a page which provides an overview of the dashboard functionality.
 * @returns {Elements} Dashboard home elements.
 */
const DashboardHome = () => {
  return (
    <DshEl>
      <SectionCard
        title={
          <SectionLink to="/dashboard/game-deals/">
            <ShopOutlined />
            <LinkTxt>Game Deals</LinkTxt>
          </SectionLink>
        }
      >
        <p>
          View, manage, and create game deals which users will see.
        </p>
      </SectionCard>

      <SectionCard
        title={
          <SectionLink to="/dashboard/admins/">
            <UserOutlined />
            <LinkTxt>Admins</LinkTxt>
          </SectionLink>
        }
      >
        <p>
          Manage administrator access to this dashboard.
        </p>
      </SectionCard>
    </DshEl>
  );
};

export { DashboardHome };
