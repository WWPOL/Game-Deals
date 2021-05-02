import React from "react";
import {
  Switch,
  Route,
  NavLink,
  Link,
  useRouteMatch,
} from "react-router-dom";
import styled from "styled-components";
import { ShopOutlined, UserOutlined } from "@ant-design/icons";

const DshEl = styled.div`
display: flex;
flex-grow: 1;
`;

const SideMenu = styled.div`
width: 15rem;
display: flex;
flex-direction: column;
background: #00043b;/* #212121; */
`;

const MenuTitle = styled(Link)`
padding-top: 0.5rem;
padding-bottom: 0.5rem;
padding-left: 1rem;
border-bottom: 1px solid #484848;
font-size: 1.5rem;
text-align: left;
`;

const MenuItems = styled.div`
margin-top: 0.5rem;
display: flex;
flex-direction: column;

.nav-link-active, .nav-link-active:hover {
  background: #02074f;
  color: #1890ff;
}
`;

const MenuItem = styled(NavLink)`
height: 2.6rem;
line-height: 2.6rem;
padding-left: 1rem;
display: flex;
align-items: center;
flex-direction: row;
font-size: 1.1rem;
transition: background 0.5s color 0.5s;
cursor: pointer;
color: white;

&:hover {
  background: #1d215e;/* #02074f; */
  color: white;
  /* color: #1890ff; */
}
`;

const MenuItemText = styled.div`
margin-left: 0.7rem;
`;

/**
 * Management dashboard.
 * @returns {Elements} Dashboard elements.
 */
const Dashboard = () => {
  const routeMatch = useRouteMatch();
  return (
    <DshEl>
      <SideMenu>
        <MenuTitle  to={`${routeMatch.path}/`}>
          Dashboard
        </MenuTitle>

        <MenuItems>
          <MenuItem
            to={`${routeMatch.path}/game-deals`}
            activeClassName="nav-link-active"
          >
            <ShopOutlined />
            <MenuItemText>
              Game Deals
            </MenuItemText>
          </MenuItem>

          <MenuItem
            to={`${routeMatch.path}/admins`}
            activeClassName="nav-link-active"
          >
            <UserOutlined />
            <MenuItemText>
              Admins
            </MenuItemText>
          </MenuItem>
        </MenuItems>
      </SideMenu>

      <Switch>
        <Route path={`${routeMatch.path}/game-deals`}>
          Game Deals
        </Route>

        <Route path={`${routeMatch.path}/admins`}>
          Admins
        </Route>

        <Route path={`${routeMatch.path}/`}>
          Dashboard Home
        </Route>
      </Switch>
    </DshEl>
  );
};

export default Dashboard;
