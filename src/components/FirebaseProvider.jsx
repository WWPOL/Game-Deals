import React from "react";
import { useStaticQuery, graphql } from "gatsby";

import firebase from "gatsby-plugin-firebase";
import { isNode } from "@firebase/util";

const FirebaseContext = React.createContext({});

const FirebaseProvider = ({ children }) => {
  const { site } = useStaticQuery(
    graphql`
      query {
        site {
          siteMetadata {
            emulateFirebase
            fakeNoFCM
          }
        }
      }
    `
  );

  if (isNode() === true) {
    return children;
  }

  const emulateFirebase = site.siteMetadata.emulateFirebase;
  const fakeNoFCM = site.siteMetadata.fakeNoFCM;
  const onLocalHost =
    window.location.host.indexOf("localhost") !== -1 ||
    window.location.host.indexOf("127.0.0.1") !== -1;

  const firestore = firebase.firestore();
  const functions = firebase.functions();
  const auth = firebase.auth();
  var messaging = null;

  if (fakeNoFCM !== true) {
    try {
      messaging = firebase.messaging();
    } catch (e) {
      console.log("Failed to load FCM, assuming iOS and not supported", e);
    }
  }

  // Don't do any analytics or error reporting on localhost
  if (onLocalHost === false) {
    const analytics = firebase.analytics();

    window.onerror = (msg, source, lineno, colno, error) => {
      const event = { msg, source, lineno, colno, error: error.toString() };

      console.error("Analytics, caught error", event);

      analytics.logEvent("error", event);
    };
  } else {
    console.log("Analytics disabled on localhost");
  }

  if (emulateFirebase) {
    firestore.settings({
      host: "localhost:8080",
      ssl: false,
    });

    functions.useFunctionsEmulator("http://localhost:5001");
  }

  return (
    <FirebaseContext.Provider
      value={{
        emulated: emulateFirebase,
        firestore: firestore,
        functions: functions,
        auth: auth,
        messaging: messaging,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

export default FirebaseProvider;
export { FirebaseContext };
