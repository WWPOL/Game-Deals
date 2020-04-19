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
	 <Navbar.Brand
		style={{
		    color: 'white',
		}}>
		<img
		    src={icon}
		    style={{
			   width: '2rem',
		    }}
		/>
		<span
		    style={{
			   'margin-left': '1rem',
		    }}
		>
		    {siteTitle}
		</span>
	 </Navbar.Brand>
  </Navbar>
);

Header.propTypes = {
  siteTitle: PropTypes.string
};

Header.defaultProps = {
  siteTitle: ``
};

export default Header;
