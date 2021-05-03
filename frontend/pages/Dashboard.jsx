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

import DashboardGameDeals from "./DashboardGameDeals.jsx";
import DashboardNewGameDeal from "./DashboardNewGameDeal.jsx";
import DashboardAdmins from "./DashboardAdmins.jsx";

import COLORS from "../colors";

const DshEl = styled.div`
display: flex;
flex-grow: 1;
background: ${COLORS.blue.fill.dark};
`;

const SideMenu = styled.div`
width: 15rem;
display: flex;
flex-direction: column;
background: ${COLORS.blue.fill.primary};

a:hover {
  color: ${COLORS.blue.text.light};
}
`;

const MenuTitle = styled(Link)`
padding-top: 1rem;
padding-bottom: 0.5rem;
padding-left: 1rem;


font-size: 1.5rem;
text-align: left;
font-weight: bold;
`;

const MenuHr = styled.div`
width: 4rem;
margin-left: 1rem;
margin-bottom: 0.5rem;
border-top: 0.2rem solid #020da1; /* 000982; */
`;

const MenuItems = styled.div`
display: flex;
flex-direction: column;
margin-left: 1rem;

.nav-link-active, .nav-link-active:hover {
  margin-left: 0;
  background: #02074f;
  color: #1890ff;
  border-left: solid 0.25rem #f24bd6;
}
`;

const MenuItem = styled(NavLink)`
height: 2.6rem;
line-height: 2.6rem;
margin-left: 0.25rem;
padding-top: 0.1rem;
padding-left: 1rem;
display: flex;
align-items: center;
flex-direction: row;
font-size: 1.1rem;
border-radius: 0.1rem;
transition: background 0.5s color 0.5s;
cursor: pointer;
/* color: white; */

&:hover {
  background: #1d215e;/* #02074f; */
  /* color: white; */
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

        <MenuHr />

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
        <Route path={`${routeMatch.path}/game-deals/new`}>
          <DashboardNewGameDeal />
        </Route>
                
        <Route path={`${routeMatch.path}/game-deals`}>
          <DashboardGameDeals />
        </Route>

        <Route path={`${routeMatch.path}/admins`}>
          <DashboardAdmins />
        </Route>

        <Route path={`${routeMatch.path}/`}>
          Dashboard Home
        </Route>
      </Switch>
    </DshEl>
  );
};

/**
 * Navigate back to the dashboard home.
 * @param {ReactRouterDom.History} history To modify.
 */
export function GoDashHome(history) {
  history.push("/dashboard");
};

/**
 * Navigate back to the Game Deals dashboard page.
 * @param {ReactRouterDom.History} history To modify.
 */
export function GoDashGameDeals(history) {
  history.push("/dashboard/game-deals/");
}

/**
 * Navigate back to the New Game Deal dashboard page.
 * @param {ReactRouterDom.History} history To modify.
 */
export function GoDashNewGameDeal(history) {
  history.push("/dashboard/game-deals/new");
}

export default Dashboard;
