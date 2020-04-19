import React from "react";
import styled from "styled-components";

import megaphoneIcon from "../images/megaphone.png";

const CustomFooter = styled.footer`
  display: flex;
  justify-content: center;
  align-items: center;
  background: rebeccapurple;
  color: white;
  padding: 10px;
`;

const Footer = () => (
  <div
    style={{
      'background': 'rebeccapurple',
      'color': 'white',
      'padding': '1rem',
      'text-align': 'center',
    }}
  >
    <div>
      © {new Date().getFullYear()}, Olly G Inc.
    </div>

    <div>
      Megaphone (
      <img
        src={megaphoneIcon}
        alt="Megaphone Icon"
        style={{
          width: '1.5rem',
        }}
      />
      ) icon from
      <a href="https://icons8.com"> Icons8</a>
    </div>
  </div>
);

export default Footer;
