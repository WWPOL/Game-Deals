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

  const [fcmToken, setFCMToken] = useState(null);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const messaging = firebase.messaging();
  const functions = firebase.functions();

  const buttonTxt = subscribed ? "Unsubscribe From Deal Alerts" :
                    "Subscribe To Deal Alerts";
  const leftEl = loading ? loadingEl : megaphoneIconEl;

  // Try to get FCM token
  if (fcmToken === null) {
    messaging.getToken().then((token) => {
      // If token retrieved
      if (token !== null) {
        setFCMToken(token);
      }
    }).catch((err) => {
      setError(["Failed to get game deals subscription details", err]);
    });
  } else {
    // TODO: Get token subscription status
    // Handle FCM token refreshes if we have a token
    messaging.onTokenRefresh(() => {
      // Get new token
      messaging.getToken().then((token) => {
        // TODO: Handle error from subscribe call
        return functions.httpsCallable('subscribe')();
      }).catch((err) => {
        setError(["Failed to get game deals subscription details", err]);
      });
    });
  }

  messaging.onMessage = (payload) => {
    // Run when a notification comes in and the user is on the web page
    console.log("FCM received while user is on the page", payload);
  };

  const onSubscribeClick = () => {
    setLoading(true);
    
    if (subscribed) {
      // Unsubscribe
      // TODO: Unsubscribe user
    } else {
      // Subscribe
      messaging.requestPermission().catch((err) => {
        setError(["Cannot subscribe to deal alerts without " +
                  "notification permissions", err]);
        setLoading(false);
      }).then(() => {
        return messaging.getToken();
      }).then((token) => {
        return functions.httpsCallable('subscribe')();
      }).then(() => {
        setLoading(false);
        setSubscribed(true);
      }).catch((err) => {
        setError([err.userError, err.internalErr]);
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
