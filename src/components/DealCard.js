import React from 'react';
import Card from 'react-bootstrap/Card';

const DealCard = ({name, price, isFree, expires, link}) => {

  const date = expires.toDate();
  const now = new Date();

  return (
    <Card style={{ width: '18rem' }}>
      {date >= now && <Card.Header>Until {date.toDateString()}</Card.Header>}
      <Card.Body>
        <Card.Title>{name}</Card.Title>
        <Card.Subtitle className="mb-2 text-muted">{isFree ? 'FREE!' : `$${price}`}</Card.Subtitle>
        {date < now ? (
          <strong><em>Expired {date.toDateString()}</em></strong>
        ) : (
          <a href={link}>Get it!</a>
        )}
      </Card.Body>
    </Card>
  );
}

export default DealCard;