import React from "react";
import {
  useHistory
} from "react-router-dom";
import {
  PageHeader,
  Breadcrumb,
} from "antd";

import { GoDashHome } from "~/pages/Dashboard";

/**
 * Displays a page which manages admin users.
 * @returns {Elements} Admin dashboard elements.
 */
const DashboardAdmins = () => {
  const history = useHistory();
  
  return (
    <PageHeader
      onBack={() => GoDashHome(history)}
      title={
        <Breadcrumb>
          <Breadcrumb.Item>Admins</Breadcrumb.Item>
        </Breadcrumb>
      }
    />
  );
};

export { DashboardAdmins };
