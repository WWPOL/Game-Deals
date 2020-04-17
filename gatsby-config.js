module.exports = {
  siteMetadata: {
    title: `Gatsby Default Starter`,
    description: `Kick off your next, great Gatsby project with this default starter. This barebones starter ships with the main Gatsby configuration files you might need.`,
    author: `@gatsbyjs`,
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
        name: `gatsby-starter-default`,
        short_name: `starter`,
        start_url: `/`,
        background_color: `#663399`,
        theme_color: `#663399`,
        display: `minimal-ui`,
        icon: `src/images/gatsby-icon.png`, // This path is relative to the root of the site.
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
        }
      }
    }
  ],
}