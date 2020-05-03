import styled, { createGlobalStyle } from "styled-components";
import Button from "react-bootstrap/Button";
import Toast from "react-bootstrap/Toast";

const themeColor = "rebeccapurple";
export const smallBreakpoint = "768px";

export const DealWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;

  & > .card {
    margin: 15px 0;
  }
`;

export const GhostButton = styled(Button)`
  &.btn.btn-primary,
  &.btn.btn-primary:active {
    background: transparent;
    border: 1px solid white;
  }

  &.btn.btn-primary:hover {
    background: white;
    border: 1px solid white;
    color: ${themeColor};
  }
`;

export const FixedToast = styled(Toast)`
  position: absolute;
  right: 25px;
  top: 0;
`;

export const GlobalStyle = createGlobalStyle`
  #gatsby-focus-wrapper {
    display: flex;
    flex-direction: column;
  }

  html, body, #___gatsby, #gatsby-focus-wrapper {
    height: 100%; 
  }

  .container-fluid {
    padding: 0;
  }

  .card.expired:after {
    content: "";
    display: block;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0,0,0,0.15);
    pointer-events: none;
  }

  nav.navbar.navbar-expand.navbar-light {
    background: ${themeColor}
  }

  .navbar-brand a {
    color: white;
  }

  .navbar-brand a > img {
    width: 2rem;
  }

  .navbar-brand span {
    margin-left: 1rem;
  }

  div.card-img-top {
    height: 300px;
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
  }

  .input-group-prepend.clickable {
    cursor: pointer;
  }

  .tooltip-inner {
    overflow: hidden;
    padding: 0;
  }
`;
