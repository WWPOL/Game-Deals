import React, { useState, useContext, useEffect } from "react";
import styled from "styled-components";
import Color from "color";

import Spinner from "react-bootstrap/Spinner";

import megaphoneIcon from "../images/megaphone.png";
import { ErrorContext } from "./Error";
import { FirebaseContext } from "./FirebaseProvider";
import NotificationSubscriber from "./NotificationSubscriber";

const megaphoneIconEl = <img src={megaphoneIcon} alt="Megaphone icon" />;
const loadingEl = <Spinner animation="grow"></Spinner>;

const SubscribeButton = styled.div`
  border: none;
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.5rem;
  padding-right: 1rem;
  background: pink;
  border-radius: 2rem;
  cursor: pointer;

  &:hover {
    box-shadow: 0.1rem 0.1rem ${Color("pink").darken(0.1)};
    bottom: 1.1rem;
    right: 1.1rem;
  }

  img {
    width: 2rem;
  }
`;

const NotificationButton = ({subscribed, loading}) => {
  // Set button content conditionally
  var buttonTxt = "";
  const leftEl = loading === true ? loadingEl : megaphoneIconEl;

  if (loading) {
    buttonTxt = subscribed === true ? "Unsubscribing" : "Subscribing";
  } else {
    buttonTxt = subscribed === true ? "Unsubscribe From Deal Alerts" :
                "Subscribe To Deal Alerts";
  }
  return (
    <SubscribeButton>
      {leftEl}
      <span>{buttonTxt}</span>
    </SubscribeButton>
  );
};

export default () => (
  <NotificationSubscriber>
    <NotificationButton />
  </NotificationSubscriber>
);
