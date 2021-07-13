# Olly G's Game Deals
Video game deal aggregation site.

# Table Of Contents

- [Overview](#overview)
- [Development](#development)
- [Deployment](#deployment)

# Overview
Friendly website which provides those interested in gaming with notifications about the latest video games deals.

**Commitments**:

- We will never post affiliate links to the site
- We will never place ads on the site
- We will never accept money to feature a game on the site

**FAQ**  

- **Why?**: For many years one of our friend's named Oliver (aka Olly G) has been sending us deals on
  games which he finds on the internet. We thought it was about time he have a nice official place to 
  put these deals. So that everyone in the world can benefit from his kindness. 
- **So how are you making money?**: We are not, this is and always will be purely a hobby site. 
  Everyone involved has comfortable jobs which provide our living wages. We do not feel the need to 
  make money off of this side project.
- **I have a game deal I'd like to share, how can I?**: Create an issue with the [`game deal` tag](https://github.com/WWPOL/Game-Deals/labels/game%20deal). 
  Please provide the game name, discounted price, image for the game, when the deal will expire, and
  a link to the location users can find the deal. Remember we do not accept affiliate links. A 
  maintainer will review your deal as soon as possible.
- **I have an idea of how to improve the site, can I contribute?**: Sure! We would love your help. See the [Contributing](./CONTRIBUTING.md) documentation on how to get started.

[This project was made possible by our contributors](./CONTRIBUTORS.md). Want to help out? See [`CONTRIBUTING.md`](./CONTRIBUTING.md).

# Development
The site is a NodeJs server and React frontend.

Make sure you have the latest versions of [NodeJS](https://nodejs.org/en/download/) and [Yarn](https://classic.yarnpkg.com/en/docs/install/).

## Server
- In the repository root  
  Start MongoDB:
  ```
  docker-compose up -d
  ```
  
  The default configuration variables should work.

- In the `./server` directory  
  Install dependencies:
  ```
  yarn install
  ```
  
  Start the server:
  ```
  yarn start
  ```

## Frontend
For most frontend development the built Parcel bundler results will be served by the server, ensure it is running ([Server](#server)).

- In the `./frontend` directory  
  Install dependencies:
  ```
  yarn install
  ```
  
  Next run the Parcel bundler on the frontend files:
  ```
  yarn watch
  ```

Then navigate to [localhost:8000](http://localhost:8000) (ignore the message from the command line saying to visit `127.0.0.1:1234`, this only serves the frontend files but without the server, this can work but none of the frontend will display any data without the API server).

# Deployment
## Configuration
The server's configuration is provided via the environment variables:

- `GAME_DEALS_HTTP_PORT` (Integer, Default: `8000`): Port on which to run HTTP API
- `GAME_DEALS_MONGO_URI` (String, Default: `mongodb://127.0.0.1/`): URI used to connect to MongoDB
- `GAME_DEALS_MONGO_DB_NAME` (String, Default: `dev-game-deals`): Name of the MongoDB database in which to store data.
- `GAME_DEALS_AUTH_TOKEN_SECRET` (String, Default: `thisisaverybadsecret`): Secret key used to sign authentication tokens.

## Initial Admin User
When the server first starts a user with username `admin` and password `admin` is created. This user must reset its password on first login. Use this `admin` account to create new admin accounts for yourself and others.

## Instructions
TBD
