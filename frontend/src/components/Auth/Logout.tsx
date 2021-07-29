import React from "react";
import {
  Avatar,
} from "antd";

import { getStoredAuthToken } from "~/components/Auth";

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
