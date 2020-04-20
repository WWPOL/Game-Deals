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
## Standard Instructions

Make sure you have the latest versions of
[NodeJS](https://nodejs.org/en/download/)
and [Yarn](https://classic.yarnpkg.com/en/docs/install/).

Install dependencies:

```
yarn install
```

Start the auto-reloading development server:

```
yarn develop
```

Then navigate to [localhost:8000](http://localhost:8000).

## Local TLS Development Proxy

When developing Firebase Cloud Messaging the page must be served over a 
secure connection.

To do this run a local Nginx development proxy which uses a custom certificate 
authority just for this purpose. Doing so requires a container management 
program like [Docker](https://www.docker.com/) or [Podman](https://podman.io/).

First make your browser trust this custom certificate authority: Add the 
`dev-proxy/minica.pem` file as a trusted certificate authority in your browser.

Then start the normal auto-reloading development server with the instruction 
above. Next start the development proxy:

```
export CONTAINER_CLI=docker
# Or
export CONTAINER_CLI=podman

./dev-proxy/dev-proxy
```

Finally navigate to [https://localhost:8001](https://localhost:8001).

This custom SSL certificate was generated 
with [minica](https://github.com/jsha/minica).

# Deployment
## Instructions

Preview a production build:

```
yarn build && yarn serve
```

Then navigate to [localhost:9000](http://localhost:9000).  

When ready to deploy (make sure to test the production build locally 
first!) push to master and GitHub actions will take care of the rest.

## Implementation Details

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
