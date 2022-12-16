import * as T from "io-ts";
import * as DT from "io-ts-types";

export const DealC = T.type({
  id: T.number,
  author_id: T.number,
  game_id: T.number,
  start_date: DT.DateFromNumber,
  end_date: DT.DateFromNumber,
});
