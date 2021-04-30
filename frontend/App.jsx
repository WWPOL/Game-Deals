import React, {
  useEffect,
  useState,
} from "react";

import API, {
  FriendlyError,
} from "./api";

const App = () => {
  const api = new API();

  const [error, setError] = useState(null);
  const [deals, setDeals] = useState([]);

  const fetchDeals = async () => {
    try {
      setDeals(await api.listGameDeals());
    } catch (e) {
      console.trace(`Failed to list game deals for home page: ${e}`);
      
      if (e instanceof FriendlyError) {
        setError(e);
      } else {
        setError("sorry, something unexpected went wrong");
      }
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);
  
  return (
    <div>
      {error !== null && (
        <div>
          <b><u>Error: {error}</u></b>
        </div>
      )}

      {deals.map((deal) => {
        return (
          <div>
            <pre><code>{JSON.stringify(deal)}</code></pre>
          </div>
        );
      })}
    </div>
  );
};

export default App;
