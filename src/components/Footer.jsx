import React from "react";
import styled from "styled-components";

const CustomFooter = styled.footer`
  display: flex;
  justify-content: center;
  align-items: center;
  background: rebeccapurple;
  color: white;
  padding: 10px;

  @media only screen and (max-width: 768px) {
    & {
      -moz-box-shadow: 0 0 10px #000;
      -webkit-box-shadow: 0 0 10px #000;
      box-shadow: 0 0 10px #000;
      z-index: 9;
    }
  }
`;

const Footer = () => (
  <CustomFooter>© {new Date().getFullYear()}, Olly G Inc.</CustomFooter>
);

export default Footer;
