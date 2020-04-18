/**
 * Layout component that queries for data
 * with Gatsby's useStaticQuery component
 *
 * See: https://www.gatsbyjs.org/docs/use-static-query/
 */

import React from "react"
import PropTypes from "prop-types"
import styled from 'styled-components'
import { useStaticQuery, graphql } from "gatsby"
import Container from 'react-bootstrap/Container';

import Header from "./Header"
import Footer from "./Footer"
import 'bootstrap/dist/css/bootstrap.min.css';
import {GlobalStyle} from '../styles';

const ContentWrapper = styled(Container)`
  flex: 1 0 auto;
  margin-top: 25px;
`;

const Layout = ({ children }) => {
  const data = useStaticQuery(graphql`
    query SiteTitleQuery {
      site {
        siteMetadata {
          title
        }
      }
    }
  `)

  return (
    <>
      <GlobalStyle />
      <Header siteTitle={data.site.siteMetadata.title} />
      <ContentWrapper>{children}</ContentWrapper>
      <Footer />
    </>
  )
}

Layout.propTypes = {
  children: PropTypes.node.isRequired,
}

export default Layout
