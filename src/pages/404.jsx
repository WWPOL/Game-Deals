import React from "react";

import Providers from "../components/Providers";
import Layout from "../components/Layout";
import SEO from "../components/SEO";

const NotFoundPage = () => (
  <Providers>
    <Layout>
      <SEO title="404: Not found" />
      <h1>NOT FOUND</h1>
      <p>You just hit a route that doesn&#39;t exist... the sadness.</p>
    </Layout>
  </Providers>
);

export default NotFoundPage;
