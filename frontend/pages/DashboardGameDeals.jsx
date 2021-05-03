import React, {
  useState,
  useEffect,
  useContext,
} from "react";
import {
  useHistory
} from "react-router-dom";
import styled from "styled-components";
import {
  PageHeader,
  Table,
} from "antd";
import "../antd.less";
import strftime from "strftime";

import {
  APICtx,
  ErrorCtx,
} from "../App.jsx";
import {
  GoDashHome,
} from "./Dashboard.jsx";

const GAME_DEAL_COLS = [
  {
    title: "Author",
    dataIndex: "author",
    key: "author_id",
  },
  {
    title: "Game",
    dataIndex: "game",
    key: "game",
  },
  {
    title: "Expires*",
    dataIndex: "end_date",
    key: "end_date",
  }
];

const DshEl = styled.div`
display: flex;
flex-direction: column;
flex-grow: 1;
color: white;
`;

const DealsList = styled.div`
display: flex;
flex-direction: column;
align-items: center;
`;

/**
 * Displays a page which manages game deals.
 * @returns {Elements} Game deal dashboard elements.
 */
const DashboardGameDeals = () => {
  const api = useContext(APICtx);
  const showError = useContext(ErrorCtx)[1];
  const history = useHistory();

  const [deals, setDeals] = useState([]);

  useEffect(() => {
    async function fetchDeals() {
      const deals = await api.listGameDeals(0, true);

      const dateStr = (epoch) => {
        const date = new Date(epoch * 1000);
        
        return strftime("%m/%d/%y %I:%M %p", date);
      };

      const authorEl = async (adminID) => {
        const admin = await api.getAdmin(adminID);

        return admin.username;
      };
      
      setDeals(await Promise.all(deals.map(async (deal) => {
        return {
          ...deal,
          key: deal._id,
          author: await authorEl(deal.author_id),
          game: deal.game.name,
          end_date: dateStr(deal.end_date),
        };
      })));
    }

    fetchDeals();
  }, []);
  
  return (
    <DshEl>
      <PageHeader
        onBack={() => GoDashHome(history)}
        title="Game Deals"
      />

      <DealsList>
        <Table
          dataSource={deals}
          columns={GAME_DEAL_COLS}
        />
        <i>* Times are based on your browser's local time zone.</i>
      </DealsList>
    </DshEl>
  );
};

export default DashboardGameDeals;
