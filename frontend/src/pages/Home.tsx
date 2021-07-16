import React, {
  useState,
  useEffect,
  useContext,
} from "react";
import styled from "styled-components";
import humanizeDuration from "humanize-duration";

import { APICtx, ErrorCtx } from "~/App";
import {
  FriendlyError,
} from "~/api";

const HomeEl = styled.div`
display: flex;
flex-grow: 1;
background: #000221;
`;

/**
 * Get the unix timestamp for the date.
 * @param date {Date} To convert.
 * @returns {integer}
 */
function unixTime(date) {
  return Math.floor(date.getTime() / 1000);
}

const Home = () => {
  const api = useContext(APICtx);
  const setError = useContext(ErrorCtx)[1];
  
  const [deals, setDeals] = useState([]);

  useEffect(() => {
    async function fetchDeals() {
      setDeals(await api.listGameDeals());
    }

    fetchDeals();
  }, []);

  const now = unixTime(new Date());
  
  return (
    <HomeEl>
      {deals.map((deal) => {
        const expiresDt = deal.end_date - now;
        let expiresStr = humanizeDuration(expiresDt);

        if (expiresDt < 0) {
          expiresStr = `Expired ${expiresStr} ago`;
        } else {
          expiresStr = `Expires in ${expiresStr}`;
        }

        
        return (
          <div key={deal._id}>
            <p>
              {expiresStr}
            </p>

            <p>
              <a href={deal.link}>
                Go to deal
              </a>
            </p>
          </div>
        );
      })}
    </HomeEl>
  );
};

export { Home };
