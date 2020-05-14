import React from "react";
import styled from "styled-components";

import Toast from "react-bootstrap/Toast";

import errorIcon from "../images/error.png";

const ErrorContext = React.createContext([null, () => {}]);

const ErrorToast = styled(Toast)`
  position: fixed;
  z-index: 2;
  min-width: 350px;
  min-height: 87px;
  transform: translateX(75%);
  background: white;
  margin-top: 1.5rem;
`;

const ErrorImg = styled.img`
  width: 2rem;
`;

const Error = props => {
  const [error, setError] = props.error;

  if (error !== null) {
    console.error("App error:", error);

    // Convert error into string, ensure first letter is uppercase, ends in period
    var strError = String(error);
    strError = strError.charAt(0).toUpperCase() + strError.slice(1);
    if (strError[strError.length - 1] !== ".") {
      strError += ".";
    }

    const doClose = () => {
      setError(null);
    };

    return (
      <ErrorToast onClose={doClose}>
        <Toast.Header>
          <ErrorImg src={errorIcon} className="rounded mr-2" alt="Error icon" />

          <strong className="mr-auto">Error</strong>
        </Toast.Header>
        <Toast.Body>{strError}</Toast.Body>
      </ErrorToast>
    );
  }

  return null;
};

export default Error;
export { ErrorContext };
