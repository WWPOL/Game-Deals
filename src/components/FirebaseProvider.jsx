import React from "react";
import { useStaticQuery, graphql } from "gatsby";

import firebase from "gatsby-plugin-firebase";

const FirebaseContext = React.createContext({});

const FirebaseProvider = ({children}) => {
  const { site } = useStaticQuery(
    graphql`
      query {
        site {
          siteMetadata {
            emulateFirebase
          }
        }
      }
    `
  );

  const emulateFirebase = site.siteMetadata.emulateFirebase;

  const firestore = firebase.firestore();
  const functions = firebase.functions();
  const auth = firebase.auth();
  const messaging = firebase.messaging();
  const dealsTopic = emulateFirebase === true ? "deals" : "deals-dev";

  if (emulateFirebase === true) {
    firestore.settings({
      host: "localhost:8080",
      ssl: false,
    });
    
    functions.useFunctionsEmulator("http://localhost:5001");
  }

  return (
    <FirebaseContext.Provider value={{
    functions: functions,
      firestore: firestore,
      auth: auth,
      messaging: messaging,
      dealsTopic: dealsTopic,
      emulated: emulateFirebase,
    }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export default FirebaseProvider;
export { FirebaseContext };
