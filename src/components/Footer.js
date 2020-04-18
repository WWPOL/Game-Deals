import React from "react"
import styled from 'styled-components'

const CustomFooter = styled.footer`
  display: flex;
  justify-content: center;
  align-items: center;
  background: rebeccapurple;
  color: white;
  padding: 10px;
`;

const Footer = () => (
  <CustomFooter>
    © {new Date().getFullYear()}, Olly G Inc.
  </CustomFooter>
);

export default Footer;