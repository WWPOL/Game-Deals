import React, {useState} from "react"
import firebase from "gatsby-plugin-firebase"

import Layout from "../components/layout"
import SEO from "../components/seo"
import Button from 'react-bootstrap/Button';

const provider = new firebase.auth.GoogleAuthProvider();

const LoginPage = () => {
  const [username, setUsername] = useState(null);

  const login = () => {
    firebase.auth().signInWithPopup(provider).then(function(result) {
      // This gives you a Google Access Token. You can use it to access the Google API.
      const token = result.credential.accessToken;
      // The signed-in user info.
      const user = result.user;
      setUsername(user.displayName);
    }).catch(error => {
      const errorCode = error.code;
      const errorMessage = error.message;
      console.error("Login error", errorCode, errorMessage);
    });
  }

  return (
    <Layout>
      <SEO title="Login" />
      <h1>Login</h1>
      {username && <h3>Hi there, {username}!</h3>}
      {!username && <Button onClick={login}>
        Press me to login!
      </Button>}
    </Layout>
  );
}

export default LoginPage