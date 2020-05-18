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

A Gatsby/React app with a Firebase backend.

Stuff we're using:

- [Gatsby](https://www.gatsbyjs.org/)
- [Gatsby Firebase Plugin](https://www.gatsbyjs.org/packages/gatsby-plugin-firebase/)
- [React Bootstrap](https://react-bootstrap.github.io/)

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
yarn website
```

Then navigate to [localhost:8000](http://localhost:8000).

To make the website use a locally emulated version of Firebase create a
Firebase service account and download the credentials JSON file, rename it
to `firebase-service-account.json`.

```
yarn emulate-firebase
```

Finally run:

```
EMULATE_FIREBASE=true yarn website
```

## Functions

Functions are located in [`./functions/index.js`](./functions/index.js).

If you would like to run any of the `package.json` scripts in this directory the
`--ignore-engines` option must be passed due to the fact that the `package.json`
file defines the `engines` key for the sake of Firebase.

## Firestore

Firestore indexes are defined in `firestore.indexes.json`.

Firestore rules are defined in `firestores.rules`.

# Deployment

## Instructions

Preview a production build:

```
yarn preview-prod-website
```

Then navigate to [localhost:9000](http://localhost:9000).

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

**Firestore**:

Run:

```
yarn deploy-firestore
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

### Firebase

The [Firebase GitHub Action](https://github.com/marketplace/actions/github-action-for-firebase)
is used to deploy functions and firestore.

Get a Firebase continuous integration authentication token:

```
yarn firebase login:ci
```

Set this value as the `FIREBASE_TOKEN` secret to the repository.
