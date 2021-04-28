import React from "react";
import styled from "styled-components";

const Item = styled.div`
width: 100%;
`;

const Expires = styled.div`
`;

const Details = styled.div`
`;

const Name = styled.div`
`;

const Price = styled.div`
`;

const DealCard = ({ name, price, isFree, expires, image, link }) => {
  const now = new Date();

  return (
    <Item className={expires < now && "expired"}>
      <Expires>
        {expires < now ? (
          <strong>
            <em>Expired {expires.toDateString()}</em>
          </strong>
        ) : (
          <React.Fragment>Until {expires.toDateString()}</React.Fragment>
        )}
      </Expires>
      <a
        href={link}
        rel="noopener noreferrer"
        target="_blank">
        <img
          rel="Game image"
          src={image}
        />
      </a>
      <Details>
        <Name>{name}</Name>
        <Price className="mb-2 text-muted">
          {isFree ? "FREE!" : `$${price}`}
        </Price>
        <a href={link} rel="noopener noreferrer" target="_blank">
          Get it!
        </a>
      </Details>
    </Item>
  );
};

export default DealCard;
