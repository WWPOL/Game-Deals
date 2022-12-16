import React from "react";
import {
  Avatar,
} from "antd";

import { getStoredAuthToken } from "~/api/auth";

export function Logout() {
  const authToken = getStoredAuthToken();
  if (authToken !== null) {
    return <></>;
  }
  
  return (
    <span>
      <Avatar>
        Name
      </Avatar>
      Logout
    </span>
  )
}
