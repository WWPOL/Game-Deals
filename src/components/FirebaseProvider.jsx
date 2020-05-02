import React from "react";
import { useStaticQuery, graphql } from "gatsby";

import firebase from "gatsby-plugin-firebase";
import { isNode } from "@firebase/util";

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

  if (isNode() === true) {
    return children;
  }

  const emulateFirebase = site.siteMetadata.emulateFirebase;
  
  const firestore = firebase.firestore();
  const functions = firebase.functions();
  const auth = firebase.auth();
  const messaging = firebase.messaging();

  if (emulateFirebase) {
    firestore.settings({
      host: "localhost:8080",
      ssl: false,
    });
    
    functions.useFunctionsEmulator("http://localhost:5001");
  }
  
  return (
    <FirebaseContext.Provider value={{
      emulated: emulateFirebase,
      firestore: firestore,
      functions: functions,
      auth: auth,
      messaging: messaging,
    }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export default FirebaseProvider;
export { FirebaseContext };
