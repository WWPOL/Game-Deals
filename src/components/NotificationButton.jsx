import React, { useState, useContext, useEffect } from "react";
import styled from "styled-components";
import Color from "color";

import Spinner from "react-bootstrap/Spinner";

import megaphoneIcon from "../images/megaphone.png";
import { ErrorContext } from "../components/Error";
import { FirebaseContext } from "../components/FirebaseProvider";

const megaphoneIconEl = <img src={megaphoneIcon} alt="Megaphone icon" />;
const loadingEl = <Spinner animation="grow"></Spinner>;

const SubscribeButton = styled.button`
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

const NotificationButton = () => {
  // State
  const setError = useContext(ErrorContext)[1];

  const [fcmToken, setFCMToken] = useState(null);
  const [subscribed, stateSetSubscribed] = useState(false);
  const setSubscribed = (v) => {
    localStorage.setItem("subscribed", v);
    stateSetSubscribed(v);
  };
  const [loading, setLoading] = useState(false);

  // Firebase
  const firebase = useContext(FirebaseContext);
  const messaging = firebase.messaging;
  const functions = firebase.functions;

  // Set button content conditionally
  var buttonTxt = "";
  const leftEl = loading === true ? loadingEl : megaphoneIconEl;

  if (loading) {
    buttonTxt = subscribed === true ? "Unsubscribing" : "Subscribing";
  } else {
    buttonTxt = subscribed === true ? "Unsubscribe From Deal Alerts" :
                "Subscribe To Deal Alerts";
  }

  useEffect(() => {
    // Try to get FCM token
    if (fcmToken === null && Notification.permission === "granted") {
      messaging.getToken().then((token) => {
        // If token retrieved
        if (token !== null) {
          setFCMToken(token);

          // Determine (and maybe update) subscription status
          var localSubscribed = localStorage.getItem("subscribed") === "true";

          if (localSubscribed !== subscribed) {
            setSubscribed(localSubscribed);
          }
        } else {
          // If no token retrieved make to set subscription status to false
          setFCMToken(null);
          setSubscribed(false);
        }
      }).catch((err) => {
        setError("Failed to get subscription details");
        console.error(err);
      });
    } else {
      // Determine (and maybe update) subscription status
      var localSubscribed = localStorage.getItem("subscribed") === "true";

      if (localSubscribed !== subscribed) {
        setSubscribed(localSubscribed);
      }
      
      // Handle FCM token refreshes if we have a token
      messaging.onTokenRefresh(() => {
        // Get new token
        messaging.getToken().catch((err) => {
          setError("Failed to get game deals subscription details")
          console.error(err);
        }).then((token) => {
          return functions.httpsCallable("subscribe")();
        }).catch((err) => {
          setError("Failed to renew subscription to deals")
          console.error(err);
        });
      });
    }

    messaging.onMessage = (payload) => {
      // Run when a notification comes in and the user is on the web page
      console.log("FCM received while user is on the page", payload);
    };
  }, [fcmToken, functions, messaging, setError, subscribed]);

  const onSubscribeClick = () => {
    setLoading(true);
    
    if (subscribed === true) {
      console.log("onSubscribeClick(): calling unsub, subscribed=", subscribed);
      // Unsubscribe
      functions.httpsCallable("unsubscribe")().then(() => {
        setSubscribed(false);
        setLoading(false);
      }).catch((err) => {
        setError(err);
        setLoading(false);
      });
    } else {
      // Subscribe
      // 1. Request permissions to send browser notifications
      // 2. Get the user's FCM token
      // 3. Call the subscribe Firebase Function
      messaging.requestPermission().catch((err) => {
        setError("Cannot subscribe to deal alerts without " +
                 "notification permissions");
        console.error(err);
        setLoading(false);
      }).then(() => {
        return functions.httpsCallable("subscribe")();
      }).catch((err) => {
        setError(err);
        setLoading(false);
      }).then(() => {
        setLoading(false);
        setSubscribed(true);
      });
    }
  };

  return (
    <SubscribeButton onClick={onSubscribeClick}>
      {leftEl}
      <span>{buttonTxt}</span>
    </SubscribeButton>
  );
};

export default NotificationButton;
