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
    dataIndex: "author_id",
    key: "author_id",
  },
  {
    title: "Starts On",
    dataIndex: "state_date",
    key: "state_date",
  },
  {
    title: "Ends On",
    dataIndex: "end_date",
    key: "end_date",
  }
];

const DshEl = styled.div`
display: flex;
flex-direction: column;
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
      const d = await api.listGameDeals();
      setDeals(d.map((d) => {
        return {
          ...d,
          key: d._id,
        };
      }));
    }

    fetchDeals();
  }, []);
  
  return (
    <DshEl>
      <PageHeader
        onBack={() => GoDashHome(history)}
        title="Game Deals"
      />

      <Table
        dataSource={deals}
        columns={GAME_DEAL_COLS}
      />
    </DshEl>
  );
};

export default DashboardGameDeals;
