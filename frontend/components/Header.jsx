import React from "react";
import styled from "styled-components";

const HdEl = styled.div`
height: 3.3rem;
line-height: 3.3rem;
width: 100%;
display: flex;
background: #75ffa8;
`;

const Brand = styled.div`
font-size: 1.5rem;
display: flex;
margin-left: 1rem;
color: #f24bd6;
  /* text-shadow: 2px 2px #f24bd6; */
`;

/**
 * Navigation element at the top of the page.
 * @returns {Element} Header element.
 */
const Header = () => {
  return (
    <HdEl>
      <Brand>
        Olly Game Deals
      </Brand>
    </HdEl>
  );
};

export default Header;
