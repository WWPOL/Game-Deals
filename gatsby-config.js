require('dotenv').config();

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
      {
        resolve: "gatsby-plugin-firebase",
        options: {
          credentials: {
            apiKey: "<YOUR_FIREBASE_API_KEY>",
            authDomain: "<YOUR_FIREBASE_AUTH_DOMAIN>",
            databaseURL: "<YOUR_FIREBASE_DATABASE_URL>",
            projectId: "<YOUR_FIREBASE_PROJECT_ID>",
            storageBucket: "<YOUR_FIREBASE_STORAGE_BUCKET>",
            messagingSenderId: "<YOUR_FIREBASE_MESSAGING_SENDER_ID>",
            appId: "<YOUR_FIREBASE_APP_ID>"
          }
        }
      },
    },
  ],
}
