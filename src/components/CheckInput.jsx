import React from "react";

import styled from "styled-components";

import checkedIcon from "../images/checked.png";
import uncheckedIcon from "../images/unchecked.png";

const CheckContainer = styled.div`
display: flex;
cursor: pointer;
`;

const CheckImg = styled.img`
width: 1.5rem;
height: 1.5rem;
margin-right: 1rem;
flex-grow: 0;
flex-shrink: 0;
align-self: center;
`;

const CheckInput = (props) => {
    let value = props.value;
    let onClick = props.onClick;
    let label = props.label;

    const imgSrc = value === true ? checkedIcon : uncheckedIcon;

    return (
	   <CheckContainer className={props.className} onClick={onClick}>
		  <CheckImg src={imgSrc} />
		  <span>{label}</span>
	   </CheckContainer>
    );
};

export default CheckInput;
