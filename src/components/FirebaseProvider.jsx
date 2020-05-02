import React from "react";
import { useStaticQuery, graphql } from "gatsby";

import firebase from "gatsby-plugin-firebase";

const FirebaseContext = React.createContext({});

class FirebaseProvider extends React.Component {
  constructor () {
    super();
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

    this.emulateFirebase = site.siteMetadata.emulateFirebase;
    this.dealsTopic = this.emulateFirebase === true ? "deals" : "deals-dev";
  }

  componentDidMount() {
    this.firestore = firebase.firestore();
    this.functions = firebase.functions();
    this.auth = firebase.auth();
    this.messaging = firebase.messaging();
   
    if (emulateFirebase === true) {
      this.firestore.settings({
        host: "localhost:8080",
        ssl: false,
      });
      
      this.functions.useFunctionsEmulator("http://localhost:5001");
    }
  }

  render() {
    return (
      <FirebaseContext.Provider value={{
        functions: this.functions,
        firestore: this.firestore,
        auth: this.auth,
        messaging: this.messaging,
        dealsTopic: this.dealsTopic,
        emulated: this.emulateFirebase,
      }}>
        {this.props.children}
      </FirebaseContext.Provider>
    );
  }
};

export default FirebaseProvider;
export { FirebaseContext };
