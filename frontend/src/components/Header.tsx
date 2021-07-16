import React from "react";
import {
  Link,
} from "react-router-dom";
import styled from "styled-components";

/**
 * Height of header element.
 */
const HEIGHT = "3.3rem";

const HdEl = styled.div`
height: ${HEIGHT};
line-height: ${HEIGHT};
width: 100%;
display: flex;
background: #75ffa8;
`;

const Brand = styled(Link)`
font-size: 1.5rem;
display: flex;
margin-left: 1rem;
color: #f24bd6;
  /* text-shadow: 2px 2px #f24bd6; */
font-style: italic;
font-weight: bold;

&:hover {
  color: #f24bd6;
}
`;

/**
 * Navigation element at the top of the page.
 * @returns {Element} Header element.
 */
const Header = () => {
  return (
    <HdEl>
      <Brand to="/">
        Olly Game Deals
      </Brand>
    </HdEl>
  );
};

export { Header, HEIGHT };
