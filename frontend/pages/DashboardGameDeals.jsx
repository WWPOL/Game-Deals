import React, {
  useState,
  useEffect,
  useContext,
} from "react";
import {
  useHistory
} from "react-router-dom";
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

/**
 * Displays a page which manages game deals.
 * @returns {Elements} Game deal dashboard elements.
 */
const DashboardGameDeals = () => {
  const api = useContext(APICtx);
  const showError = useContext(ErrorCtx);
  const history = useHistory();
  
  return (
    <PageHeader
      onBack={() => GoDashHome(history)}
      title="Game Deals"
    />
  );
};

export default DashboardGameDeals;
