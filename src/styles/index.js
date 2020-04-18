import { createGlobalStyle } from 'styled-components'

export const GlobalStyle = createGlobalStyle`
  #gatsby-focus-wrapper {
    display: flex;
    flex-direction: column;
  }

  html, body, #___gatsby, #gatsby-focus-wrapper {
    height: 100%; 
  }
`;