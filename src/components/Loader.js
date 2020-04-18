import React from "react"
import styled from 'styled-components'
import Spinner from 'react-bootstrap/Spinner';

const SpinnerContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Loader = () => (
  <SpinnerContainer>
    <Spinner animation="border" role="status" variant="primary">
      <span className="sr-only">Loading...</span>
    </Spinner>
  </SpinnerContainer>
);

export default Loader;