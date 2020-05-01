import React, { useState } from "react";

import FirebaseProvider from "./FirebaseProvider";
import UserProvider from "./UserProvider";
import { ErrorContext } from "./Error";

const Providers = ({children}) => {
  const [error, setError] = useState(null);

  return (
    <ErrorContext.Provider value={[error, setError]}>
      <FirebaseProvider>
        <UserProvider>
          {children}
        </UserProvider>
      </FirebaseProvider>
    </ErrorContext.Provider>
  );
};

export default Providers;
