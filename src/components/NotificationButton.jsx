import React, { useState, useContext, useEffect } from "react";
import firebase from "gatsby-plugin-firebase";

import Spinner from "react-bootstrap/Spinner";

import megaphoneIcon from "../images/megaphone.png";
import { ErrorContext } from "../pages/index";

import "./NotificationButton.scss";

const megaphoneIconEl = <img src={megaphoneIcon} alt="Megaphone icon" />;
const loadingEl = <Spinner animation="grow"></Spinner>;

const NotificationButton = () => {
  // State
  const setError = useContext(ErrorContext);

  const [fcmToken, setFCMToken] = useState(null);
  const [subscribed, stateSetSubscribed] = useState(false);
  const setSubscribed = (v) => {
    localStorage.setItem("subscribed", v);
    stateSetSubscribed(v);
  };
  const [loading, setLoading] = useState(false);

  // Firebase
  const messaging = firebase.messaging();
  const functions = firebase.functions();

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
    if (fcmToken === null) {
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
        setError(["Failed to get game deals subscription details", err]);
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
          setError(["Failed to get game deals subscription details", err]);
        }).then((token) => {
          return functions.httpsCallable("subscribe")();
        }).catch((err) => {
          setError(["Failed to renew subscription to deals", err]);
        });
      });
    }

    messaging.onMessage = (payload) => {
      // Run when a notification comes in and the user is on the web page
      console.log("FCM received while user is on the page", payload);
    };
  }, []);

  const onSubscribeClick = () => {
    setLoading(true);
    
    if (subscribed === true) {
      // Unsubscribe
      functions.httpsCallable("unsubscribe")().then(() => {
        setSubscribed(false);
        setLoading(false);
      }).catch((err) => {
        setError([err.userError, err.internalError]);
        setLoading(false);
      });
    } else {
      // Subscribe
      // 1. Request permissions to send browser notifications
      // 2. Get the user's FCM token
      // 3. Call the subscribe Firebase Function
      messaging.requestPermission().catch((err) => {
        setError(["Cannot subscribe to deal alerts without " +
                  "notification permissions", err]);
        setLoading(false);
      }).then(() => {
        return functions.httpsCallable("subscribe")();
      }).catch((err) => {
        setError([err.userError, err.internalErr]);
        setLoading(false);
      }).then(() => {
        setLoading(false);
        setSubscribed(true);
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
