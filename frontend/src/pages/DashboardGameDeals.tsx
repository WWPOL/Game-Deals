import React, {
  useState,
  useEffect,
  useContext,
} from "react";
import {
  useHistory,
  Link,
} from "react-router-dom";
import styled from "styled-components";
import {
  PageHeader,
  Table,
  Tooltip,
  Button,
  Breadcrumb
} from "antd";
import {
  PlusOutlined,
} from "@ant-design/icons";
import "../antd.less";
import strftime from "strftime";

import {
  APICtx,
  ErrorCtx,
} from "~/App";
import {
  GoDashHome,
  GoDashNewGameDeal,
} from "~/pages/Dashboard";

const DshEl = styled.div`
display: flex;
flex-direction: column;
flex-grow: 1;
color: white;
`;

const ActionsRow = styled.div`
display: flex;
margin-bottom: 1rem;
`;

const NewDealButton = styled(Button)`
display: flex;
align-items: center;
flex-grow: 0;
`;

const DealsList = styled.div`
padding-left: 2rem;
padding-right: 2rem;
display: flex;
flex-direction: column;
`;

const DealsTable = styled(Table)`
flex-grow: 1;
`;

const ExpiresTooltip = styled(Tooltip)`
cursor: pointer;
`;

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
    title: (
      <>
        Expires
        <ExpiresTooltip
          title={
            <>
              Times are based on your browser's local time zone. Format: <code>MM/DD/YY HH:MM</code>.
            </>
          }
        >
          <sup>&dagger;</sup>
        </ExpiresTooltip>
      </>
    ),
    dataIndex: "expires",
    key: "end_date",
  },
];

/**
 * Displays a page which manages game deals.
 * @returns {Elements} Game deal dashboard elements.
 */
export function DashboardGameDeals() {
  const api = useContext(APICtx);
  const { showError } = useContext(ErrorCtx);
  const history = useHistory();

  const [deals, setDeals] = useState([]);

  useEffect(() => {
    async function fetchDeals() {
      const deals = await api.listGameDeals(0, true);

      const dateStr = (epoch) => {
        const date = new Date(epoch * 1000);
        
        return strftime("%m/%d/%y %I:%M %p", date);
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
          game: deal.game.name,
          expires: dateStr(deal.end_date),
          deal: dealLinkEl(deal),
        };
      })));
    }

    fetchDeals();
  }, []);

  /**
   * Defines the behavior of the game deals table row selection. See antd.Table.
   */
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
        title={
          <Breadcrumb>
            <Breadcrumb.Item>Game Deals</Breadcrumb.Item>
          </Breadcrumb>
        }
      />

      <DealsList>
        <ActionsRow>
          <NewDealButton
            size="large"
            icon={<PlusOutlined />}
            onClick={() => GoDashNewGameDeal(history)}
          >
            New Game Deal
          </NewDealButton>
        </ActionsRow>
        <DealsTable
          rowSelection={rowSelection}
          dataSource={deals}
          columns={GAME_DEAL_COLS}
        />
      </DealsList>
    </DshEl>
  );
};
