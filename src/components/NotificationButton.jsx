import React, { useState, useContext } from "react";
import firebase from "gatsby-plugin-firebase";

import Spinner from "react-bootstrap/Spinner";

import megaphoneIcon from "../images/megaphone.png";
import { ErrorContext } from "../pages/index";

import "./NotificationButton.scss";

const megaphoneIconEl = <img src={megaphoneIcon} alt="Megaphone icon" />;
const loadingEl = <Spinner animation="grow"></Spinner>;

const NotificationButton = () => {
  const setError = useContext(ErrorContext);
  
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const messaging = firebase.messaging();

  const buttonTxt = subscribed ? "Unsubscribe From Deal Alerts" :
                    "Subscribe To Deal Alerts";
  const leftEl = loading ? loadingEl : megaphoneIconEl;

  messaging.onMessage = (payload) => {
    // Run when a notification comes in and the user is on the web page
    console.log("FCM received while user is on the page", payload);
  };

  const onSubscribeClick = () => {
    setLoading(true);
    
    if (subscribed) {
      // Unsubscribe
    } else {
      // Subscribe
      messaging.requestPermission()
               .catch((err) => {
                 setError(["Cannot subscribe to deal alerts without " +
                           "notification permissions", err]);
                 setLoading(false);
               })
               .then(() => {
                 return messaging.getToken();
               })
               .then((token) => {
                 console.log(token);
               })
               .catch((err) => {
                 setError(["Failed to setup subscription, reload and try again",
                           err]);
                 setLoading(false);
               });
    }
  };
  
  return (
    <div
      className="subscribe-button"
      onClick={onSubscribeClick}
    >
      {leftEl}
      <span>{buttonTxt}</span>
    </div>
  );
};

export default NotificationButton;
