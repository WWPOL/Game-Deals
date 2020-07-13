import React, { useRef } from "react";
import styled from "styled-components";

import Tooltip from "react-bootstrap/Tooltip";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";

import questionMarkIcon from "../images/question-mark.png";

const size = "2rem";

const HelpButton = styled.button`
  border: none;
  background: none;

  & > img {
    width: ${size};
    height: ${size};
    border-radius: ${size};
    border: 1px solid black;
  }
`;

const HelpOverlayTooltip = styled(Tooltip)`
  & > .tooltip-inner {
    padding: 0.5rem;
  }
`;

const HelpOverlay = props => {
  const message = props.message;

  var childProps = { ...props };
  delete childProps.message;

  return (
    <HelpOverlayTooltip
      {...childProps}
      placement="bottom"
      arrowProps={{
        style: { display: "none" },
      }}
    >
      {message}
    </HelpOverlayTooltip>
  );
};

const HelpTooltip = props => {
  const message = props.message;
  const tooltipRef = useRef(null);

  var childProps = { ...props };
  delete childProps.message;

  return (
    <div {...childProps} ref={tooltipRef}>
      <OverlayTrigger
        container={tooltipRef.current}
        overlay={() => <HelpOverlay message={message} />}
      >
        <HelpButton type="button">
          <img src={questionMarkIcon} alt="Question mark" />
        </HelpButton>
      </OverlayTrigger>
    </div>
  );
};

export default HelpTooltip;
