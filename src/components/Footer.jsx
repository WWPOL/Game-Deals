import React from "react";

import megaphoneIcon from "../images/megaphone.png";
import errorIcon from "../images/error.png";

const Footer = () => (
  <div
    style={{
      'background': 'rebeccapurple',
      'color': 'white',
      'padding': '1rem',
      'textAlign': 'center',
    }}
  >
    <div>
      © {new Date().getFullYear()}, Olly G Inc.
    </div>

    <div>
      Icons
      (
      <img
        src={megaphoneIcon}
        alt="Megaphone icon"
        style={{
          width: '1.5rem',
        }}
      />,
      <img
        src={errorIcon}
        alt="Error icon"
        style={{
          width: '1.5rem',
        }}
      />
      )
      from &nbsp;
      <a
        href="https://icons8.com"
        style={{
          color: 'white',
        }}
      >
        Icons8
      </a>
    </div>
  </div>
);

export default Footer;
