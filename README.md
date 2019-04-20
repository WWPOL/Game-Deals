# Game Deals
Game deals website.

# Table Of Contents
- [Oveview](#overview)
- [Development](#development)
- [Models](#models)
- [Ideas](#ideas)

# Overview
API server stores data in PostgreSQL. Front end uses API.

# Development
## Database
Start a local PostgreSQL server:

```
make db
```

## First Time Setup
Install asset builder dependencies:

```
cd assets
npm install
```

Create database:

```
mix phx.create
```

# Models
All models have an `id` primary key field.  

Fields are not null by default.

## User
- `username` (String)
- `password_hash` (String)

## Game
- `name` (String)

## Deal
- `game_id` (Foreign key)
- `start` (Date time)
- `end` (Date time, Nullable)
- `price` (Number)
- `link` (String)
- `description` (String, Nullable)

# Ideas
- Google docs spreadsheet that Olly adds to, uses a sheets script (javascript) to grab deals he posts and makes a post request to a backend, which then displays the deal on a time line and sends notifications to subscribers
- spreadsheet will have following columns: deal name/title, link to deal, deal expiry, deal hash, and post. only required fields are deal name and post (post takes in YES, will trigger script) hash is generated automatically based on other fields. link and expiry are just for extra features/niceness
- sheet script will run every time a cell is updated, and will take the bottom most (newest) row and check if the post column says yes. if so, it takes the fields for the deal and sends to server
- server first checks hash of new deal to make sure no duplicates /double post. if ok, it will post deal to nicely formatted time line and send notifications
- time line will show deals in order, currently active deals (if expiry Is given, inactive deals will be greyed out). if link is included, will have link
- page will also have a subscribe button, where users can opt in for emails and/or web push notifications 
