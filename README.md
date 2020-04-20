# Olly G's Game Deals

Video game deal aggregation site.

# Table Of Contents

- [Overview](#overview)
- [Development](#development)
- [Deployment](#deployment)

# Overview

A Gatsby/React app with a Firebase backend so Olly G can give us the all juicy
game deals.

Stuff we're using:

- [Gatsby](https://www.gatsbyjs.org/)
- [Gatsby Firebase Plugin](https://www.gatsbyjs.org/packages/gatsby-plugin-firebase/)
- [React Bootstrap](https://react-bootstrap.github.io/)

# Development

Make sure you have the latest versions of
[NodeJS](https://nodejs.org/en/download/)
and [Yarn](https://classic.yarnpkg.com/en/docs/install/).

## Website

Install dependencies:

```
yarn install
```

Start the auto-reloading development server:

```
yarn develop
```

Then navigate to [localhost:8000](http://localhost:8000).

## Functions

Functions are located in [`./functions/index.js`](./functions/index.js).

# Deployment
## Instructions

Preview a production build:

```
yarn build && yarn serve
```

Then navigate to [localhost:8000](http://localhost:8000).  

When ready to deploy (make sure to test the production build locally 
first!) push to master and GitHub actions will take care of the rest.

## Manual Instructions

If you would like to deploy manually follow these instructions.

**Website**:

Run:

```
yarn deploy-website
```

**Functions**:

Run:

```
yarn deploy-functions
```

## Deployment Implementation Details
### Website

GitHub actions is used to automatically deploy the master branch to 
GitHub Pages.

This uses GitHub Deploy Keys to authenticate the job runner. See the 
[JamesIves/github-pages-deploy-action](https://github.com/JamesIves/github-pages-deploy-action/tree/dev#using-an-ssh-deploy-key-)
documentation for details about how this key is used.

To set it up generate an SSH key with no password: 

```
ssh-keygen -t ed25519 -f ./deploy_key
```

Then copy the contents of the `deploy-key.pub` file and add it as a deploy key 
with write access for this repository.

Then copy the contents of the `deploy-key` file and add a secret named 
`DEPLOY_KEY` to this repository.

Finally delete both the `deploy-key` and `deploy-key.pub` files.

### Firebase Functions

The [Firebase GitHub Action](https://github.com/marketplace/actions/github-action-for-firebase)
is used to deploy functions. 

Get a Firebase contiguous integration authentication token:

```
yarn firebase login:ci
```

Set this value as the `FIREBASE_TOKEN` secret to the repository.
