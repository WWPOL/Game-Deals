import React, { useState, useContext, useEffect } from "react";

import { FirebaseContext } from "./FirebaseProvider";

const UserContext = React.createContext([{}, () => {}]);

const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const firebase = useContext(FirebaseContext);

  useEffect(
    () =>
      firebase.auth.onAuthStateChanged(newUser => {
        if (newUser === null) {
          setUser(null);
          return;
        }

        firebase.firestore
          .doc(`admins/${newUser.uid}`)
          .get()
          .then(docRef => {
            setUser({
              ...newUser,
              isAdmin: docRef.exists,
            });
          })
          .catch(err => {
            console.error("Failed to get user", err);
            setUser({
              ...newUser,
              isAdmin: false,
            });
          });
      }),
    [firebase.auth, firebase.firestore, setUser]
  );

  return (
    <UserContext.Provider value={[user, setUser]}>
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;
export { UserContext };
