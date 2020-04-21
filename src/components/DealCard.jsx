import React from "react";
import Card from "react-bootstrap/Card";

const DealCard = ({ name, price, isFree, expires, image, link }) => {
  const now = new Date();

  return (
    <Card style={{ width: "18rem" }} className={expires < now && "expired"}>
      <Card.Header>
        {expires < now ? (
          <strong>
            <em>Expired {expires.toDateString()}</em>
          </strong>
        ) : (
          <React.Fragment>Until {expires.toDateString()}</React.Fragment>
        )}
      </Card.Header>
      <a href={link} rel="noopener noreferrer" target="_blank">
        <div
          className="card-img-top"
          style={{
            backgroundImage: `url("${image}")`,
          }}
        />
      </a>
      <Card.Body>
        <Card.Title>{name}</Card.Title>
        <Card.Subtitle className="mb-2 text-muted">
          {isFree ? "FREE!" : `$${price}`}
        </Card.Subtitle>
        <a href={link} rel="noopener noreferrer" target="_blank">
          Get it!
        </a>
      </Card.Body>
    </Card>
  );
};

export default DealCard;
