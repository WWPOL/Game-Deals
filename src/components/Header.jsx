import { Link } from "gatsby";
import PropTypes from "prop-types";
import React from "react";
import Navbar from "react-bootstrap/Navbar";

import icon from "../images/icon.png";

const Header = ({ siteTitle }) => (
  <Navbar
    style={{
      background: `rebeccapurple`,
    }}
  >
    <Link to="/">
      <Navbar.Brand
        style={{
          color: "white",
        }}
      >
        <img
          src={icon}
          alt="Oliver's face"
          style={{
            width: "2rem",
          }}
        />
        <span
          style={{
            marginLeft: "1rem",
          }}
        >
          {siteTitle}
        </span>
      </Navbar.Brand>
    </Link>
  </Navbar>
);

Header.propTypes = {
  siteTitle: PropTypes.string,
};

Header.defaultProps = {
  siteTitle: ``,
};

export default Header;
