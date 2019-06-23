# Game Deals
Game deals website.

# Table Of Contents
- [Oveview](#overview)
- [Development](#development)
- [Models](#models)
- [API](#api)
- [Ideas](#ideas)

# Overview
API server stores data in PostgreSQL. Front end uses API.

# Development
## Database
Start a local PostgreSQL server:

```
make db
```

Connect to database with `psql` client:

```
make db-cli
```

# Models
All models have an `id` primary key field.  

Fields are not null by default.

## User
- `username` (String)
  - Unique
- `password_hash` (String)
  - Private, never exposed via API

## Deal
- `game` (String)
- `title` (String)
- `start_time` (Date time)
- `end_time` (Date time, Nullable)
- `published_time` (Date time, Nullable)
  - If null then not published yet
- `price` (Number)
- `link` (String)
- `description` (String, Nullable)

## Subscription
- `registration_token` (String): Firebase Cloud Messaging registration token
  - Unique

# API
HTTP REST JSON API.

All endpoint paths are prefixed with `/api/v0`.

Data is passed in the body as JSON for POST, PUT, and DELETE requests.
Data can be passed in the request URL as well, and exclusively in the URL for 
GET requests.

By default requests require a bearer `Authorization`
header (`Authorization: Bearer <AUTH TOKEN>`).

Dates should be passed to the API in 
[RFC3339](https://tools.ietf.org/html/rfc3339#section-5.8) format.

## User Endpoints
### Login
`POST /users/login`

Request:

- `username` (String)
- `password` (String)

No authentication token required.

Response:

- `token` (String, JWT)

## Deal Endpoints
### Create
`POST /deals`

Request:

- `deal` (Deal)

Response:

- `deal` (Deal)

### List
`GET /deals`

Request: Empty

No authentication token required.

Response:

- `deals` ([]Deal)

### Update
`UPDATE /deals/<id>`

Request:

- `id` (Integer): ID of deal to update
- `deal` (Deal)

Response:

- `deal` (Deal)

### Delete
`DELETE /deals/<id>`

Request:

- `id` (Integer): ID of deal to delete

Response:

- `ok` (Boolean)

### Publish
`POST /deals/<id>/publish`

Request:

- `id` (Integer): ID of deal to publish

Response:

- `deal` (Deal)

## Subscription
### Subscribe
`POST /subscriptions`

Request:

- `subscription` (Subscription)
  
Response:

- `subscription` (Subscription)

### Get
`GET /subscriptions/<registration_token>`

Request:

- `registration_token` (String): Registration token to retrieve

Response:

- `subscription` (Subscription)

### Delete
`DELETE /subscription/<registration_token>`

Request:

- `registration_token` (String): Registration token delete and unsubscribe

Response:

- `ok` (Boolean)
