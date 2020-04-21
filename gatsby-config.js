module.exports = {
  siteMetadata: {
    title: `Olly G's Game Deals`,
    description: `Find all the best game deals here, brought to you by the one and only Olly G.`,
    author: `Rudhra Raveendran and Noah Huppert`,
  },
  plugins: [
    `gatsby-plugin-offline`,
    `gatsby-plugin-react-helmet`,
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
        credentials: {
          apiKey: `AIzaSyDq5wAcRBdbfqkArvq7WIIzC8yf8FjiSHQ`,
          authDomain: `game-deals-bb2bc.firebaseapp.com`,
          databaseURL: `https://game-deals-bb2bc.firebaseio.com`,
          projectId: `game-deals-bb2bc`,
          storageBucket: `game-deals-bb2bc.appspot.com`,
          messagingSenderId: `479706586867`,
          appId: `1:479706586867:web:a94fb444712cfbde27a186`,
          measurementId: `G-9ZM2TP0T1D`,
        },
      },
    },
  ],
};
