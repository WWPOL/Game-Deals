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
    title: "Game",
    dataIndex: "game",
    key: "game",
  },
  {
    title: "Price",
    dataIndex: "price",
    key: "price",
  },
  {
    title: "Deal",
    dataIndex: "deal",
    key: "link",
  },
  {
    title: "Expires*",
    dataIndex: "expires",
    key: "end_date",
  },
  {
    title: "Author",
    dataIndex: "author",
    key: "author_id",
  },
];

const DshEl = styled.div`
display: flex;
flex-direction: column;
flex-grow: 1;
color: white;
`;

const DealsList = styled.div`
padding-left: 2rem;
padding-right: 2rem;
display: flex;
flex-direction: column;
flex-grow: 1;
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

      const dealLinkEl = (deal) => {
        const domainParts = deal.link.split(".");
        let shortDomain = deal.link;
        if (domainParts.length >= 2) {
          shortDomain = domainParts.slice(0, 2).join(".");
        }
        
        return (
          <a href={deal.link}>
            {shortDomain}
          </a>
        );
      };
      
      setDeals(await Promise.all(deals.map(async (deal) => {
        return {
          ...deal,
          key: deal._id,
          author: await authorEl(deal.author_id),
          game: deal.game.name,
          expires: dateStr(deal.end_date),
          deal: dealLinkEl(deal),
        };
      })));
    }

    fetchDeals();
  }, []);

  const rowSelection = {
    onChange: (keys, rows) => {
      console.log(`rowSelection.onChange: keys=${keys}, rows=${JSON.stringify(rows)}`);
    },
    getCheckboxProps: (deal) => ({
      disabled: false,
      name: deal.id,
    }),
  };
  
  return (
    <DshEl>
      <PageHeader
        onBack={() => GoDashHome(history)}
        title="Game Deals"
      />

      <DealsList>
        <Table
          rowSelection={rowSelection}
          dataSource={deals}
          columns={GAME_DEAL_COLS}
        />
        <i>* Times are based on your browser's local time zone.</i>
      </DealsList>
    </DshEl>
  );
};

export default DashboardGameDeals;
