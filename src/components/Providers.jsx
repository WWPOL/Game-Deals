import React, { useState } from "react";

import FirebaseProvider from "./FirebaseProvider";
import UserProvider from "./UserProvider";
import { ErrorContext } from "./Error";

const Providers = ({ children }) => {
  const [error, setError] = useState(null);

  return (
    <FirebaseProvider>
      <ErrorContext.Provider value={[error, setError]}>
        <UserProvider>{children}</UserProvider>
      </ErrorContext.Provider>
    </FirebaseProvider>
  );
};

export default Providers;
