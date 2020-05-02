import React from "react";

import checkedIcon from "../images/checked.png";
import uncheckedIcon from "../images/unchecked.png";

const CheckBox = (props) => {
  let value = props.value;
  let onClick = props.onClick;

  const img = value === true ? checkedIcon : uncheckedIcon;

  return <img
           src={img}
           onClick={onClick}
           style={{
             width: '1.5rem',
             marginBottom: '0.2rem',
             marginRight: '0.5rem',
             marginLeft: '-0.2rem',
           }}
  />;
};
