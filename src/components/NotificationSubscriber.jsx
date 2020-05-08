import React, { useState, useContext, useEffect, useCallback } from "react";
import styled from "styled-components"

import { ErrorContext } from "../components/Error";
import { FirebaseContext } from "../components/FirebaseProvider";

const BlankButton = styled.button`
border: none;
background: none;
text-align: inherit;
margin: 0;
padding: 0;
`;

const NotificationSubscriber = ({children, channel}) => {
  channel = channel || "main";
  const localStorageKey = `subscribed-${channel}`;
  
  // State
  const setError = useContext(ErrorContext)[1];

  const [fcmToken, setFCMToken] = useState(null);
  const [subscribed, stateSetSubscribed] = useState(false);
  const setSubscribed = useCallback((v) => {
    localStorage.setItem(localStorageKey, v);
    stateSetSubscribed(v);
  }, [localStorageKey]);
  const [loading, setLoading] = useState(false);

  // Firebase
  const firebase = useContext(FirebaseContext);
  const messaging = firebase.messaging;
  const functions = firebase.functions;

  useEffect(() => {
    if (messaging === null) {
      return null;
    }
    
    // Try to get FCM token
    if (fcmToken === null && Notification.permission === "granted") {
      messaging.getToken().then((token) => {
        // If token retrieved
        if (token !== null) {
          setFCMToken(token);

          // Determine (and maybe update) subscription status
          var localSubscribed = localStorage.getItem(localStorageKey) === "true";

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
        console.error("Failed to FCM token", err);
      });
    } else {
      // Determine (and maybe update) subscription status
      var localSubscribed = localStorage.getItem(localStorageKey) === "true";

      if (localSubscribed !== subscribed) {
        setSubscribed(localSubscribed);
      }
      
      // Handle FCM token refreshes if we have a token
      messaging.onTokenRefresh(() => {
        // Get new token
        messaging.getToken().then((token) => {
          setFCMToken(token);
          // TODO: Do we have to re subscribe or unsubscribe here?
        }).catch((err) => {
          setError("Failed to get game deals subscription details")
          console.error("Failed to get token after refresh", err);
        });
      });
    }

    messaging.onMessage = (payload) => {
      // Run when a notification comes in and the user is on the web page
      console.log("FCM received while user is on the page", payload);
    };
  }, [fcmToken, functions, messaging, setError, subscribed, setSubscribed,
      localStorageKey]);

  const onSubscribeClick = () => {
    if (messaging === null) {
      return;
    }
    
    setLoading(true);
    
    if (subscribed === true) {
      // Unsubscribe
      functions.httpsCallable("unsubscribe")({
        channel: channel
      }).then(() => {
        setSubscribed(false);
        setLoading(false);
      }).catch((err) => {
        setError(err);
        setLoading(false);
        
        console.log("Failed to call unsubscribe Firebase function", err);
      });
    } else {
      // Subscribe
      // 1. Request permissions to send browser notifications
      // 2. Get the user's FCM token
      // 3. Call the subscribe Firebase Function
      messaging.requestPermission().catch((err) => {
        return Promise.reject({
          userError: "Cannot subscribe to deal alerts without " +
                     "notification permissions",
          internalError: err,
        });
      }).then(() => {
        return functions.httpsCallable("subscribe")({
          channel: channel,
        }).catch((err) => {
          return Promise.reject({
            userError: "Failed to subscribe: " + err,
            internalError: err,
          });
        });
      }).then(() => {
        setLoading(false);
        setSubscribed(true);
      }).catch((err) => {
        setError(err.userError);
        console.error("Failed to subscribe", err);
        
        setLoading(false);
      });
    }
  };

  return (
    <BlankButton
      onClick={onSubscribeClick}
      disabled={loading}
    >
    {React.cloneElement(children, {
      subscribed: subscribed,
      loading: loading,
      fcmSupported: messaging !== null,
    })}
    </BlankButton>
  );
};

export default NotificationSubscriber;
