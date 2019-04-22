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

## Game
- `name` (String)
  - Unique

## Deal
- `game_id` (Foreign key)
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

## Game Endpoints
### List
`GET /games`

Request: Empty

No authentication token required.

Response:

- `games` ([]Game)

### Create
`POST /games`

Request:

- `game` (Game)

Response:

- `game` (Game)

### Delete
`DELETE /games/<id>`

Request:

- `id` (Integer): ID of game to delete

Response:

- `ok` (Boolean)

### Update
`UPDATE /games/<id>`

Request:

- `id` (Integer): ID of game to update
- `game` (Game)

Response:

- `game` (Game)

## Deal Endpoints
### List
`GET /deals`

Request: Empty

No authentication token required.

Response:

- `deals` ([]Deal)

### Create
`POST /deals`

Request:

- `deal` (Deal)

Response:

- `deal` (Deal)

### Update
`UPDATE /deals/<id>`

Request:

- `id` (Integer): ID of deal to update
- `deal` (Deal)

Response:

- `deal` (Deal)

### Publish
`POST /deals/<id>/publish`

Request:

- `id` (Integer): ID of deal to publish

Response:

- `deal` (Deal)

### Delete
`DELETE /deals/<id>`

Request:

- `id` (Integer): ID of deal to delete

Response:

- `ok` (Boolean)

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

# Ideas
- Google docs spreadsheet that Olly adds to, uses a sheets script (javascript) to grab deals he posts and makes a post request to a backend, which then displays the deal on a time line and sends notifications to subscribers
- spreadsheet will have following columns: deal name/title, link to deal, deal expiry, deal hash, and post. only required fields are deal name and post (post takes in YES, will trigger script) hash is generated automatically based on other fields. link and expiry are just for extra features/niceness
- sheet script will run every time a cell is updated, and will take the bottom most (newest) row and check if the post column says yes. if so, it takes the fields for the deal and sends to server
- server first checks hash of new deal to make sure no duplicates /double post. if ok, it will post deal to nicely formatted time line and send notifications
- time line will show deals in order, currently active deals (if expiry Is given, inactive deals will be greyed out). if link is included, will have link
- page will also have a subscribe button, where users can opt in for emails and/or web push notifications 
