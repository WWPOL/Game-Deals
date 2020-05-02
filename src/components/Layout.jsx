import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import Container from "react-bootstrap/Container";

import Header from "./Header";
import Footer from "./Footer";
import "bootstrap/dist/css/bootstrap.min.css";
import { GlobalStyle } from "../styles";

const ContentWrapper = styled(Container)`
  min-height: 100%;
  flex: 1 0 auto;
  margin-top: 25px;
`;

const Layout = ({ children, fluid }) => (
  <React.Fragment>
    <GlobalStyle />
    <Header />
    <ContentWrapper fluid={fluid}>{children}</ContentWrapper>
    <Footer />
  </React.Fragment>
);

Layout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Layout;
