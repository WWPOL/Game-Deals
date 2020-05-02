import React, { useState, useContext, useEffect } from "react";

import { FirebaseContext } from "./FirebaseProvider";

const UserContext = React.createContext([{}, ()  => {}]);

const UserProvider = ({children}) => {
  const [user, setUser] = useState(null);
  const firebase = useContext(FirebaseContext);

  useEffect(() => firebase.auth.onAuthStateChanged(newUser => {
    if (newUser === null) {
      return;
    }
    
    firebase.firestore.doc(`admins/${newUser.uid}`).get().then(() => {
      setUser({
        ...newUser,
        isAdmin: true,
      });
    }).catch((err) => {
      setUser({
        ...newUser,
        isAdmin: false,
      });
    });
  }), [firebase.auth, firebase.firestore, setUser]);
  
  return (
    <UserContext.Provider value={[user, setUser]}>
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;
export { UserContext };
