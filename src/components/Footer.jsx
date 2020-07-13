import React from "react";

import megaphoneIcon from "../images/megaphone.png";
import errorIcon from "../images/error.png";
import defaultProfilePicture from "../images/default-profile-picture.png";
import checkedIcon from "../images/checked.png";
import uncheckedIcon from "../images/unchecked.png";
import questionMarkIcon from "../images/question-mark.png";

const icons = [
  [megaphoneIcon, "Megaphone icon"],
  [errorIcon, "Warning triangle"],
  [defaultProfilePicture, "Cat + pig combined"],
  [checkedIcon, "Checked check box"],
  [uncheckedIcon, "Unchecked check box"],
  [questionMarkIcon, "Question mark"],
];

const Footer = () => {
  return (
    <div
      style={{
        background: "rebeccapurple",
        color: "white",
        padding: "1rem",
        textAlign: "center",
      }}
    >
      <div>© {new Date().getFullYear()}, Olly G Inc.</div>

      <div>
        Icons (
        {icons.map(icon => (
          <img
            key={icon[1]}
            src={icon[0]}
            alt={icon[1]}
            style={{
              width: "1.5rem",
            }}
          />
        ))}
        ) from &nbsp;
        <a
          href="https://icons8.com"
          style={{
            color: "white",
          }}
        >
          Icons8
        </a>
      </div>
    </div>
  );
};

export default Footer;
