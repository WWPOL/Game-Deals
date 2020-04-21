const firebaseCreds = {
  apiKey: `AIzaSyDq5wAcRBdbfqkArvq7WIIzC8yf8FjiSHQ`,
  authDomain: `game-deals-bb2bc.firebaseapp.com`,
  databaseURL: `https://game-deals-bb2bc.firebaseio.com`,
  projectId: `game-deals-bb2bc`,
  storageBucket: `game-deals-bb2bc.appspot.com`,
  messagingSenderId: `479706586867`,
  appId: `1:479706586867:web:a94fb444712cfbde27a186`,
  measurementId: `G-9ZM2TP0T1D`,
};

module.exports = {
  siteMetadata: {
    title: `Olly G's Game Deals`,
    description: `Find all the best game deals here, brought to you by the one and only Olly G.`,
    author: `Rudhra Raveendran and Noah Huppert`,
  },
  plugins: [
    `gatsby-plugin-react-helmet`,
    `gatsby-plugin-sass`,
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `images`,
        path: `${__dirname}/src/images`,
      },
    },
    `gatsby-transformer-sharp`,
    `gatsby-plugin-sharp`,
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `Olly G's Game Deals`,
        short_name: `Game Deals`,
        start_url: `/`,
        background_color: `#663399`,
        theme_color: `#663399`,
        display: `minimal-ui`,
        icon: `src/images/icon.png`, // This path is relative to the root of the site.
      },
    },
    {
      resolve: `gatsby-plugin-firebase`,
      options: {
        credentials: firebaseCreds,
      },
    },
    `gatsby-plugin-offline`, // Should be after gatsby-plugin-manifest
    {
      resolve: `gatsby-plugin-firebase-messaging`,
      options: {
        config: firebaseCreds,
        disableDevelopment: false, //disables development service worker
        removeFirebaseServiceWorker: false, //tells plugin to help unregistering/removing
      },
    },
  ],
};
