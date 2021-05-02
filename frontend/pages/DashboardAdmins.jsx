import React from "react";
import {
  useHistory
} from "react-router-dom";
import { PageHeader } from "antd";

import {
  GoDashHome,
} from "./Dashboard.jsx";

/**
 * Displays a page which manages admin users.
 * @returns {Elements} Admin dashboard elements.
 */
const DashboardAdmins = () => {
  const history = useHistory();
  
  return (
    <PageHeader
      onBack={() => GoDashHome(history)}
      title="Admins"
    />
  );
};

export default DashboardAdmins;
